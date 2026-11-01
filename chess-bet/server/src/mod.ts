// Модерация: жалобы на посты и профили, сводный список жалоб (посты, комментарии, личные сообщения, профили) и действия модератора.
// Модераторы: адреса кошельков в переменной MOD_ADMIN (через запятую) в /etc/chessbet.env. Остальным админ-маршруты недоступны.
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS mod_reports(
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, target TEXT NOT NULL, reporter TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, UNIQUE(kind, target, reporter));
CREATE TABLE IF NOT EXISTS mod_resolved(kind TEXT NOT NULL, rid INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(kind, rid));
CREATE TABLE IF NOT EXISTS mod_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, admin TEXT NOT NULL, action TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, at INTEGER NOT NULL);
`);

const DAY = 86400000;
const ADMINS = new Set((process.env.MOD_ADMIN || "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^0x[0-9a-f]{40}$/.test(s)));
export const isAdmin = (addr: string) => !!addr && ADMINS.has(addr.toLowerCase());

const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 4096) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

type Kind = "post" | "user" | "comment" | "dm";
const KINDS: Kind[] = ["post", "user", "comment", "dm"];
const ADDR_RE = /^0x[0-9a-f]{40}$/;

const userByName = (n: string) => db.prepare("SELECT addr,name,avatar,banned,created FROM users WHERE name=?").get(n) as { addr: string; name: string; avatar: string; banned: number; created: number } | undefined;
const nameOf = (addr: string) => (db.prepare("SELECT name FROM users WHERE addr=?").get(addr) as { name: string } | undefined)?.name ?? "?";
const isBanned = (addr: string) => !!(db.prepare("SELECT banned FROM users WHERE addr=?").get(addr) as { banned: number } | undefined)?.banned;

/** Адрес автора объекта жалобы */
function authorOf(kind: Kind, target: string): string {
  if (kind === "user") {
    if (ADDR_RE.test(target)) return target;
    return userByName(target)?.addr ?? "";
  }
  const id = Number(target) || 0;
  if (kind === "post") return (db.prepare("SELECT addr FROM posts WHERE id=?").get(id) as { addr: string } | undefined)?.addr ?? "";
  if (kind === "comment") return (db.prepare("SELECT addr FROM comments WHERE id=?").get(id) as { addr: string } | undefined)?.addr ?? "";
  return (db.prepare("SELECT a FROM dm WHERE id=?").get(id) as { a: string } | undefined)?.a ?? ""; // dm.a — отправитель
}

/** Закрыть все открытые жалобы на объект */
function resolveAll(kind: Kind, target: string) {
  const now = Date.now();
  const ins = db.prepare("INSERT OR IGNORE INTO mod_resolved(kind,rid,at) VALUES(?,?,?)");
  let ids: { id: number }[] = [];
  if (kind === "post" || kind === "user") ids = db.prepare("SELECT id FROM mod_reports WHERE kind=? AND target=?").all(kind, target) as { id: number }[];
  else if (kind === "comment") ids = db.prepare("SELECT id FROM comment_reports WHERE comment=?").all(Number(target) || 0) as { id: number }[];
  else ids = db.prepare("SELECT id FROM dm_reports WHERE msg=?").all(Number(target) || 0) as { id: number }[];
  for (const r of ids) ins.run(kind, r.id, now);
}

const preview = (s: string) => (/^\[voice:/.test(s) ? "[voice message]" : s.slice(0, 300));

type Rep = { id: number; target: string; reporter: string; reason: string; created: number };
function openReports(kind: Kind): Rep[] {
  const open = "NOT EXISTS (SELECT 1 FROM mod_resolved x WHERE x.kind=? AND x.rid=r.id)";
  if (kind === "post" || kind === "user")
    return db.prepare(`SELECT r.id, r.target, r.reporter, r.reason, r.created FROM mod_reports r WHERE r.kind=? AND ${open.replace("x.kind=?", "x.kind=r.kind")} ORDER BY r.id DESC LIMIT 500`).all(kind) as Rep[];
  const [tbl, col] = kind === "comment" ? ["comment_reports", "comment"] : ["dm_reports", "msg"];
  return db.prepare(`SELECT r.id, CAST(r.${col} AS TEXT) target, r.reporter, r.reason, r.created FROM ${tbl} r WHERE ${open} ORDER BY r.id DESC LIMIT 500`).all(kind) as Rep[];
}

function describe(kind: Kind, target: string) {
  if (kind === "post") {
    const p = db.prepare("SELECT p.id,p.addr,p.text,p.media,p.deleted FROM posts p WHERE p.id=?").get(Number(target) || 0) as { addr: string; text: string; media: string; deleted: number } | undefined;
    if (!p) return null;
    let media = 0; try { media = (JSON.parse(p.media) as unknown[]).length; } catch { /* пусто */ }
    return { text: preview(p.text), media, deleted: !!p.deleted, author: nameOf(p.addr), banned: isBanned(p.addr) };
  }
  if (kind === "comment") {
    const c = db.prepare("SELECT addr,text,post,deleted FROM comments WHERE id=?").get(Number(target) || 0) as { addr: string; text: string; post: number; deleted: number } | undefined;
    if (!c) return null;
    return { text: preview(c.text), post: c.post, deleted: !!c.deleted, author: nameOf(c.addr), banned: isBanned(c.addr) };
  }
  if (kind === "dm") {
    const m = db.prepare("SELECT a,b,text,deleted FROM dm WHERE id=?").get(Number(target) || 0) as { a: string; b: string; text: string; deleted: number } | undefined;
    if (!m) return null;
    return { text: preview(m.text), to: nameOf(m.b), deleted: !!m.deleted, author: nameOf(m.a), banned: isBanned(m.a) };
  }
  const u = userByName(target) ?? (ADDR_RE.test(target) ? (db.prepare("SELECT addr,name,avatar,banned,created FROM users WHERE addr=?").get(target) as { addr: string; name: string; avatar: string; banned: number; created: number } | undefined) : undefined);
  if (!u) return null;
  const bio = (db.prepare("SELECT bio FROM users WHERE addr=?").get(u.addr) as { bio: string }).bio;
  return { text: preview(bio), author: u.name, banned: !!u.banned, deleted: false };
}

/**
 * Маршруты: POST /api/report (любой вошедший), GET /api/mod/me, GET /api/mod/reports, GET /api/mod/users?q=, POST /api/mod/action (только модераторы).
 * viewer = кошелёк из токена входа или "".
 */
export async function handleMod(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (p !== "/api/report" && !p.startsWith("/api/mod/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });

  try {
    // ---- жалоба на пост или профиль ----
    if (p === "/api/report") {
      if (req.method !== "POST") return bad("method", 405);
      if (!viewer) return bad("auth", 401);
      if (limited("rep:" + viewer, 20, DAY)) return bad("slow_down", 429);
      const m = await readBody(req);
      const kind = String(m.kind);
      const reason = clean(m.reason, 200);
      if (kind === "post") {
        const id = Number(m.id) || 0;
        const post = db.prepare("SELECT addr FROM posts WHERE id=? AND deleted=0").get(id) as { addr: string } | undefined;
        if (!post) return bad("not_found", 404);
        if (post.addr === viewer) return bad("own", 400);
        db.prepare("INSERT OR IGNORE INTO mod_reports(kind,target,reporter,reason,created) VALUES('post',?,?,?,?)").run(String(id), viewer, reason, Date.now());
        return out(200, { ok: true });
      }
      if (kind === "user") {
        const u = userByName(clean(m.name, 40).toLowerCase());
        if (!u) return bad("not_found", 404);
        if (u.addr === viewer) return bad("own", 400);
        db.prepare("INSERT OR IGNORE INTO mod_reports(kind,target,reporter,reason,created) VALUES('user',?,?,?,?)").run(u.addr, viewer, reason, Date.now());
        return out(200, { ok: true });
      }
      return bad("bad_kind");
    }

    // ---- дальше только модераторы ----
    if (p === "/api/mod/me") return out(200, { ok: true, admin: isAdmin(viewer) });
    if (!isAdmin(viewer)) return bad("forbidden", 403);

    if (req.method === "GET" && p === "/api/mod/reports") {
      const items: unknown[] = [];
      for (const kind of KINDS) {
        const groups = new Map<string, Rep[]>();
        for (const r of openReports(kind)) { const g = groups.get(r.target); if (g) g.push(r); else groups.set(r.target, [r]); }
        for (const [target, reps] of groups) {
          const info = describe(kind, target);
          items.push({
            kind, target, count: reps.length, last: Math.max(...reps.map((r) => r.created)),
            reasons: [...new Set(reps.map((r) => r.reason).filter(Boolean))].slice(0, 5),
            info: info ?? { text: "", author: "?", banned: false, deleted: true, gone: true },
          });
        }
      }
      (items as { count: number; last: number }[]).sort((a, b) => b.count - a.count || b.last - a.last);
      return out(200, { ok: true, items: items.slice(0, 100) });
    }

    if (req.method === "GET" && p === "/api/mod/users") {
      const q = clean(url.searchParams.get("q"), 20).toLowerCase().replace(/[%_]/g, "");
      const rows = (q
        ? db.prepare("SELECT name,avatar,banned,created FROM users WHERE name LIKE ? ORDER BY banned DESC, created DESC LIMIT 20").all(q + "%")
        : db.prepare("SELECT name,avatar,banned,created FROM users WHERE banned=1 ORDER BY created DESC LIMIT 20").all()) as { name: string; avatar: string; banned: number; created: number }[];
      return out(200, { ok: true, users: rows.map((r) => ({ name: r.name, avatar: r.avatar, banned: !!r.banned, created: r.created })) });
    }

    if (req.method === "POST" && p === "/api/mod/action") {
      if (limited("modact:" + viewer, 120, 60_000)) return bad("slow_down", 429);
      const m = await readBody(req);
      const kind = String(m.kind) as Kind;
      const action = String(m.action);
      const target = String(m.target ?? "").slice(0, 60);
      if (!KINDS.includes(kind) || !target) return bad("bad_request");

      if (action === "dismiss") { resolveAll(kind, target); }
      else if (action === "delete") {
        const id = Number(target) || 0;
        if (kind === "post") db.prepare("UPDATE posts SET deleted=1 WHERE id=?").run(id);
        else if (kind === "comment") db.prepare("UPDATE comments SET deleted=1 WHERE id=?").run(id);
        else if (kind === "dm") db.prepare("UPDATE dm SET deleted=1 WHERE id=?").run(id);
        else return bad("bad_request");
        resolveAll(kind, target);
      } else if (action === "ban" || action === "unban") {
        const addr = authorOf(kind, target);
        if (!addr) return bad("not_found", 404);
        if (isAdmin(addr)) return bad("protected", 400);
        db.prepare("UPDATE users SET banned=? WHERE addr=?").run(action === "ban" ? 1 : 0, addr);
        if (action === "ban") resolveAll(kind, target);
      } else return bad("bad_action");

      db.prepare("INSERT INTO mod_log(admin,action,kind,target,at) VALUES(?,?,?,?,?)").run(viewer, action, kind, target, Date.now());
      return out(200, { ok: true });
    }

    return bad("not_found", 404);
  } catch (e) {
    console.error("mod", e);
    return bad("server", 500);
  }
}

// Личные сообщения между профилями: переписки, непрочитанные, блокировка, жалобы. Текст до 1000 символов.
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
CREATE TABLE IF NOT EXISTS dm(
  id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT NOT NULL, b TEXT NOT NULL, text TEXT NOT NULL,
  created INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS dm_ab ON dm(a, b, id);
CREATE INDEX IF NOT EXISTS dm_ba ON dm(b, a, id);
CREATE TABLE IF NOT EXISTS dm_blocks(a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(a, b));
CREATE TABLE IF NOT EXISTS dm_reports(id INTEGER PRIMARY KEY AUTOINCREMENT, reporter TEXT NOT NULL, msg INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
`);

const TEXT_MAX = 1000;
const DAY = 86400000;

/** index.ts подключает уведомление в Telegram: (адрес получателя, ник отправителя) */
let notify: (to: string, fromName: string) => void = () => {};
export function setDmNotify(fn: (to: string, fromName: string) => void) { notify = fn; }

type P = { addr: string; name: string; avatar: string };
const byName = (n: string) => db.prepare("SELECT addr,name,avatar FROM users WHERE name=? AND banned=0").get(String(n).trim().toLowerCase()) as P | undefined;
const byAddr = (a: string) => db.prepare("SELECT addr,name,avatar FROM users WHERE addr=? AND banned=0").get(a) as P | undefined;
const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").trim().slice(0, max);
const blocked = (x: string, y: string) => !!db.prepare("SELECT 1 FROM dm_blocks WHERE a=? AND b=?").get(x, y);

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

type M = { id: number; a: string; text: string; created: number; seen: number };
const shape = (m: M, me: string) => ({ id: m.id, mine: m.a === me, text: m.text, created: m.created, read: !!m.seen });

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 8192) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Маршруты /api/dm/*. viewer = кошелёк из токена входа или "" */
export async function handleDm(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/dm/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (!viewer) return bad("auth", 401);
  const me = viewer;
  const q = url.searchParams;

  try {
    if (req.method === "GET") {
      if (p === "/api/dm/unread") {
        const n = (db.prepare("SELECT COUNT(*) n FROM dm WHERE b=? AND seen=0 AND deleted=0").get(me) as { n: number }).n;
        return out(200, { ok: true, n });
      }
      if (p === "/api/dm/list") {
        const rows = db.prepare(`SELECT peer, MAX(id) mid, SUM(CASE WHEN b=@me AND seen=0 THEN 1 ELSE 0 END) unread
          FROM (SELECT CASE WHEN a=@me THEN b ELSE a END peer, id, a, b, seen FROM dm WHERE (a=@me OR b=@me) AND deleted=0)
          GROUP BY peer ORDER BY mid DESC LIMIT 50`).all({ me }) as { peer: string; mid: number; unread: number }[];
        const chats = rows.flatMap((r) => {
          const u = byAddr(r.peer);
          const m = db.prepare("SELECT id,a,text,created,seen FROM dm WHERE id=?").get(r.mid) as M | undefined;
          return u && m ? [{ name: u.name, avatar: u.avatar, unread: r.unread, last: shape(m, me) }] : [];
        });
        return out(200, { ok: true, chats });
      }
      if (p === "/api/dm/thread") {
        const peer = byName(q.get("name") || "");
        if (!peer || peer.addr === me) return bad("not_found", 404);
        const after = Number(q.get("after")) || 0, before = Number(q.get("before")) || 9e15;
        const rows = (after
          ? db.prepare("SELECT id,a,text,created,seen FROM dm WHERE ((a=@me AND b=@p) OR (a=@p AND b=@me)) AND deleted=0 AND id>@after ORDER BY id ASC LIMIT 100").all({ me, p: peer.addr, after })
          : db.prepare("SELECT id,a,text,created,seen FROM dm WHERE ((a=@me AND b=@p) OR (a=@p AND b=@me)) AND deleted=0 AND id<@before ORDER BY id DESC LIMIT 50").all({ me, p: peer.addr, before }).reverse()) as M[];
        db.prepare("UPDATE dm SET seen=1 WHERE a=? AND b=? AND seen=0").run(peer.addr, me);
        return out(200, {
          ok: true, peer: { name: peer.name, avatar: peer.avatar }, messages: rows.map((m) => shape(m, me)),
          more: !after && rows.length >= 50, blockedByMe: blocked(me, peer.addr), canSend: !blocked(me, peer.addr) && !blocked(peer.addr, me),
        });
      }
      return bad("not_found", 404);
    }
    if (req.method !== "POST") return bad("method", 405);
    const m = await readBody(req);

    if (p === "/api/dm/send") {
      const peer = byName(String(m.name ?? ""));
      if (!peer || peer.addr === me) return bad("not_found", 404);
      const text = clean(m.text, TEXT_MAX);
      if (!text) return bad("empty");
      if (blocked(me, peer.addr)) return bad("you_blocked");
      if (blocked(peer.addr, me)) return bad("cannot_send", 403);
      const had = db.prepare("SELECT 1 FROM dm WHERE (a=@me AND b=@p) OR (a=@p AND b=@me) LIMIT 1").get({ me, p: peer.addr });
      if (limited("dm:" + me, 20, 60000) || limited("dmday:" + me, 500, DAY) || (!had && limited("dmnew:" + me, 20, DAY))) return bad("slow_down", 429);
      const r = db.prepare("INSERT INTO dm(a,b,text,created) VALUES(?,?,?,?)").run(me, peer.addr, text, Date.now());
      const row = db.prepare("SELECT id,a,text,created,seen FROM dm WHERE id=?").get(r.lastInsertRowid) as M;
      const mine = byAddr(me);
      try { notify(peer.addr, mine?.name || "player"); } catch { /* уведомление необязательно */ }
      return out(200, { ok: true, message: shape(row, me) });
    }
    if (p === "/api/dm/delete") { // удалить своё сообщение (у обоих)
      db.prepare("UPDATE dm SET deleted=1 WHERE id=? AND a=?").run(Number(m.id), me);
      return out(200, { ok: true });
    }
    if (p === "/api/dm/block") {
      const peer = byName(String(m.name ?? ""));
      if (!peer || peer.addr === me) return bad("not_found", 404);
      if (m.on) db.prepare("INSERT OR IGNORE INTO dm_blocks(a,b,created) VALUES(?,?,?)").run(me, peer.addr, Date.now());
      else db.prepare("DELETE FROM dm_blocks WHERE a=? AND b=?").run(me, peer.addr);
      return out(200, { ok: true, blockedByMe: !!m.on });
    }
    if (p === "/api/dm/report") { // пожаловаться на сообщение из своей переписки
      const id = Number(m.id);
      const row = db.prepare("SELECT 1 FROM dm WHERE id=? AND (a=? OR b=?)").get(id, me, me);
      if (!row) return bad("not_found", 404);
      if (limited("dmrep:" + me, 10, DAY)) return bad("slow_down", 429);
      db.prepare("INSERT INTO dm_reports(reporter,msg,reason,created) VALUES(?,?,?,?)").run(me, id, clean(m.reason, 200), Date.now());
      return out(200, { ok: true });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "too_big" || msg === "bad_json") return bad(msg);
    console.error("dm", e);
    return bad("server", 500);
  }
}

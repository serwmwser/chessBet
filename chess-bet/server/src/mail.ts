// HiMeet Mail: внутренние письма между профилями сайта (тема + текст до 10 000 символов).
// Папки: входящие, отправленные, избранное, корзина. Наружу (в обычную почту) письма не уходят.
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
CREATE TABLE IF NOT EXISTS mail(
  id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT NOT NULL, b TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, created INTEGER NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0,
  del_a INTEGER NOT NULL DEFAULT 0, del_b INTEGER NOT NULL DEFAULT 0,
  star_a INTEGER NOT NULL DEFAULT 0, star_b INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS mail_a ON mail(a, id);
CREATE INDEX IF NOT EXISTS mail_b ON mail(b, id);
`);
// del_*: 0 — обычное, 1 — в корзине, 2 — удалено у себя навсегда

const SUBJECT_MAX = 120;
const BODY_MAX = 10000;
const BODY_BYTES = 48 * 1024;
const DAY = 86400000;

/** index.ts подключает уведомление: (адрес получателя, ник отправителя) */
let notify: (to: string, fromName: string) => void = () => {};
export function setMailNotify(fn: (to: string, fromName: string) => void) { notify = fn; }

type P = { addr: string; name: string; avatar: string };
const byName = (n: string) => db.prepare("SELECT addr,name,avatar FROM users WHERE name=? AND banned=0").get(String(n).trim().replace(/^@/, "").replace(/@himeet$/i, "").toLowerCase()) as P | undefined;
const byAddr = (a: string) => db.prepare("SELECT addr,name,avatar FROM users WHERE addr=?").get(a) as P | undefined;
const clean = (s: unknown, max: number, multiline: boolean) => {
  const ctl = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮]/g : /[\u0000-\u001F\u007F‪-‮]/g;
  return String(s ?? "").replace(ctl, "").trim().slice(0, max);
};
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

type Row = { id: number; a: string; b: string; subject: string; body: string; created: number; seen: number; del_a: number; del_b: number; star_a: number; star_b: number };
const who = (addr: string) => { const u = byAddr(addr); return { name: u?.name || "?", avatar: u?.avatar || "" }; };
function shape(m: Row, me: string, full: boolean) {
  const mine = m.a === me;
  return {
    id: m.id, mine, from: who(m.a), to: who(m.b), subject: m.subject, created: m.created,
    read: mine ? true : !!m.seen, star: !!(mine ? m.star_a : m.star_b), trash: (mine ? m.del_a : m.del_b) === 1,
    ...(full ? { body: m.body } : { preview: m.body.replace(/\s+/g, " ").slice(0, 120) }),
  };
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > BODY_BYTES) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Маршруты /api/mail/*. viewer = кошелёк из токена входа или "" */
export async function handleMail(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/mail/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (!viewer) return bad("auth", 401);
  const me = viewer;
  const q = url.searchParams;
  const mineRow = (id: number) => db.prepare("SELECT * FROM mail WHERE id=? AND (a=? OR b=?)").get(id, me, me) as Row | undefined;

  try {
    if (req.method === "GET") {
      if (p === "/api/mail/unread") {
        const n = (db.prepare("SELECT COUNT(*) n FROM mail WHERE b=? AND seen=0 AND del_b=0").get(me) as { n: number }).n;
        return out(200, { ok: true, n });
      }
      if (p === "/api/mail/list") {
        const box = q.get("box") || "in";
        const before = Number(q.get("before")) || 9e15;
        const where: Record<string, string> = {
          in: "b=@me AND del_b=0",
          out: "a=@me AND del_a=0",
          star: "((a=@me AND del_a=0 AND star_a=1) OR (b=@me AND del_b=0 AND star_b=1))",
          trash: "((a=@me AND del_a=1) OR (b=@me AND del_b=1))",
        };
        if (!where[box]) return bad("box");
        const rows = db.prepare(`SELECT * FROM mail WHERE ${where[box]} AND id<@before ORDER BY id DESC LIMIT 30`).all({ me, before }) as Row[];
        return out(200, { ok: true, items: rows.map((m) => shape(m, me, false)), more: rows.length >= 30 });
      }
      if (p === "/api/mail/get") {
        const m = mineRow(Number(q.get("id")));
        if (!m || (m.a === me ? m.del_a : m.del_b) === 2) return bad("not_found", 404);
        if (m.b === me && !m.seen) db.prepare("UPDATE mail SET seen=1 WHERE id=?").run(m.id);
        return out(200, { ok: true, mail: shape({ ...m, seen: m.b === me ? 1 : m.seen }, me, true) });
      }
      return bad("not_found", 404);
    }
    if (req.method !== "POST") return bad("method", 405);
    const m = await readBody(req);

    if (p === "/api/mail/send") {
      const peer = byName(String(m.to ?? ""));
      if (!peer || peer.addr === me) return bad("not_found", 404);
      const subject = clean(m.subject, SUBJECT_MAX, false);
      const body = clean(m.body, BODY_MAX, true);
      if (!body) return bad("empty");
      if (blocked(me, peer.addr)) return bad("you_blocked");
      if (blocked(peer.addr, me)) return bad("cannot_send", 403);
      const had = db.prepare("SELECT 1 FROM mail WHERE (a=@me AND b=@p) OR (a=@p AND b=@me) LIMIT 1").get({ me, p: peer.addr });
      if (limited("mail:" + me, 5, 60000) || limited("mailday:" + me, 100, DAY) || (!had && limited("mailnew:" + me, 15, DAY))) return bad("slow_down", 429);
      const r = db.prepare("INSERT INTO mail(a,b,subject,body,created) VALUES(?,?,?,?,?)").run(me, peer.addr, subject, body, Date.now());
      const row = db.prepare("SELECT * FROM mail WHERE id=?").get(r.lastInsertRowid) as Row;
      try { notify(peer.addr, who(me).name); } catch { /* уведомление необязательно */ }
      return out(200, { ok: true, mail: shape(row, me, false) });
    }
    if (p === "/api/mail/star") {
      const row = mineRow(Number(m.id));
      if (!row) return bad("not_found", 404);
      db.prepare(`UPDATE mail SET ${row.a === me ? "star_a" : "star_b"}=? WHERE id=?`).run(m.on ? 1 : 0, row.id);
      return out(200, { ok: true });
    }
    if (p === "/api/mail/trash") { // в корзину или обратно
      const row = mineRow(Number(m.id));
      if (!row) return bad("not_found", 404);
      db.prepare(`UPDATE mail SET ${row.a === me ? "del_a" : "del_b"}=? WHERE id=? AND ${row.a === me ? "del_a" : "del_b"}<>2`).run(m.on ? 1 : 0, row.id);
      return out(200, { ok: true });
    }
    if (p === "/api/mail/purge") { // удалить у себя навсегда (только из корзины)
      const row = mineRow(Number(m.id));
      if (!row) return bad("not_found", 404);
      const col = row.a === me ? "del_a" : "del_b";
      db.prepare(`UPDATE mail SET ${col}=2 WHERE id=? AND ${col}=1`).run(row.id);
      db.prepare("DELETE FROM mail WHERE id=? AND del_a=2 AND del_b=2").run(row.id);
      return out(200, { ok: true });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "too_big" || msg === "bad_json") return bad(msg);
    console.error("mail", e);
    return bad("server", 500);
  }
}

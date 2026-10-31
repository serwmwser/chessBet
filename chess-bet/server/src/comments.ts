// Комментарии под постами: список (виден всем), написать, удалить (свой или под своим постом), пожаловаться. Текст до 300 символов.
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
CREATE TABLE IF NOT EXISTS comments(
  id INTEGER PRIMARY KEY AUTOINCREMENT, post INTEGER NOT NULL, addr TEXT NOT NULL, text TEXT NOT NULL,
  created INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS comments_post ON comments(post, id);
CREATE TABLE IF NOT EXISTS comment_reports(id INTEGER PRIMARY KEY AUTOINCREMENT, reporter TEXT NOT NULL, comment INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
`);

const TEXT_MAX = 300;
const PAGE = 30;
const DAY = 86400000;

const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}
const lastText = new Map<string, number>(); // защита от повторов одного и того же текста подряд

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 4096) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

type CRow = { id: number; addr: string; text: string; created: number; name: string; avatar: string };
const postOwner = (id: number) => (db.prepare("SELECT addr FROM posts WHERE id=? AND deleted=0").get(id) as { addr: string } | undefined)?.addr;
const count = (post: number) => (db.prepare("SELECT COUNT(*) n FROM comments c JOIN users u ON u.addr=c.addr WHERE c.post=? AND c.deleted=0 AND u.banned=0").get(post) as { n: number }).n;
const shape = (r: CRow, me: string, owner: string) => ({
  id: r.id, text: r.text, created: r.created, user: { name: r.name, avatar: r.avatar },
  mine: !!me && r.addr === me, canDelete: !!me && (r.addr === me || owner === me),
});

/** Маршруты GET /api/comments и POST /api/comment/{add,delete,report}. viewer = кошелёк из токена входа или "" */
export async function handleComments(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (p !== "/api/comments" && !p.startsWith("/api/comment/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });

  try {
    if (req.method === "GET" && p === "/api/comments") {
      const post = Number(url.searchParams.get("post")) || 0;
      const after = Number(url.searchParams.get("after")) || 0;
      const owner = postOwner(post);
      if (!owner) return bad("not_found", 404);
      const rows = db.prepare(`SELECT c.id,c.addr,c.text,c.created,u.name,u.avatar FROM comments c JOIN users u ON u.addr=c.addr
        WHERE c.post=@p AND c.deleted=0 AND u.banned=0 AND c.id>@a ORDER BY c.id ASC LIMIT ${PAGE + 1}`).all({ p: post, a: after }) as CRow[];
      return out(200, { ok: true, comments: rows.slice(0, PAGE).map((r) => shape(r, viewer, owner)), more: rows.length > PAGE, count: count(post) });
    }

    if (req.method !== "POST") return bad("method", 405);
    if (!viewer) return bad("auth", 401);
    const me = viewer;
    const m = await readBody(req);

    if (p === "/api/comment/add") {
      const post = Number(m.post) || 0;
      const owner = postOwner(post);
      if (!owner) return bad("not_found", 404);
      const text = clean(m.text, TEXT_MAX);
      if (!text) return bad("empty");
      if ((text.match(/https?:\/\//gi) || []).length > 2) return bad("too_many_links");
      if (limited("cm:" + me, 10, 60000) || limited("cmday:" + me, 200, DAY)) return bad("slow_down", 429);
      const dupKey = `${me}:${post}:${text}`;
      if (Date.now() - (lastText.get(dupKey) || 0) < 60000) return bad("duplicate");
      lastText.set(dupKey, Date.now());
      if (lastText.size > 5000) lastText.clear();
      const r = db.prepare("INSERT INTO comments(post,addr,text,created) VALUES(?,?,?,?)").run(post, me, text, Date.now());
      const row = db.prepare("SELECT c.id,c.addr,c.text,c.created,u.name,u.avatar FROM comments c JOIN users u ON u.addr=c.addr WHERE c.id=?").get(r.lastInsertRowid) as CRow | undefined;
      if (!row) return bad("not_found", 404);
      return out(200, { ok: true, comment: shape(row, me, owner), count: count(post) });
    }

    if (p === "/api/comment/delete") { // свой комментарий или комментарий под своим постом
      const id = Number(m.id) || 0;
      const row = db.prepare("SELECT c.addr,c.post,p.addr owner FROM comments c JOIN posts p ON p.id=c.post WHERE c.id=? AND c.deleted=0").get(id) as { addr: string; post: number; owner: string } | undefined;
      if (!row) return bad("not_found", 404);
      if (row.addr !== me && row.owner !== me) return bad("forbidden", 403);
      db.prepare("UPDATE comments SET deleted=1 WHERE id=?").run(id);
      return out(200, { ok: true, count: count(row.post) });
    }

    if (p === "/api/comment/report") {
      const id = Number(m.id) || 0;
      if (!db.prepare("SELECT 1 FROM comments WHERE id=? AND deleted=0").get(id)) return bad("not_found", 404);
      if (limited("cmrep:" + me, 20, DAY)) return bad("slow_down", 429);
      db.prepare("INSERT INTO comment_reports(reporter,comment,reason,created) VALUES(?,?,?,?)").run(me, id, clean(m.reason, 200), Date.now());
      return out(200, { ok: true });
    }

    return bad("not_found", 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "too_big" || msg === "bad_json") return bad(msg);
    console.error("comments", e);
    return bad("server", 500);
  }
}

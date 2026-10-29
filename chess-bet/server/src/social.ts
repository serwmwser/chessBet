// Соцсеть: профили, подписки, посты, лента, лайки. База SQLite, вход по подписи кошелька (бесплатно, без транзакций).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type http from "node:http";
import Database from "better-sqlite3";
import { ethers } from "ethers";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
const KEY_FILE = process.env.SOCIAL_KEY_FILE || "./data/social.key";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  addr TEXT PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE NOT NULL,
  bio TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '', banner TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, banned INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, addr TEXT NOT NULL, text TEXT NOT NULL,
  media TEXT NOT NULL DEFAULT '[]', created INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS posts_addr ON posts(addr, id);
CREATE TABLE IF NOT EXISTS follows(a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(a, b));
CREATE INDEX IF NOT EXISTS follows_b ON follows(b);
CREATE TABLE IF NOT EXISTS likes(post INTEGER NOT NULL, addr TEXT NOT NULL, PRIMARY KEY(post, addr));
`);

// Секрет для токенов входа: создаётся один раз и хранится в data/
let SECRET = "";
try { SECRET = fs.readFileSync(KEY_FILE, "utf8").trim(); } catch { /* ещё нет */ }
if (!SECRET) { SECRET = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(KEY_FILE, SECRET, { mode: 0o600 }); }

const TOKEN_DAYS = 14;
const NAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set(["admin", "administrator", "support", "chessbet", "chess_bet", "official", "moderator", "mod", "root", "system", "null", "undefined", "api", "www"]);
const POST_MAX = 500;
const PAGE = 20;

const sign = (s: string) => crypto.createHmac("sha256", SECRET).update(s).digest("hex").slice(0, 40);
const makeToken = (addr: string) => {
  const exp = Date.now() + TOKEN_DAYS * 86400000;
  return `${addr}.${exp}.${sign(`${addr}.${exp}`)}`;
};
function viewerOf(req: http.IncomingMessage): string {
  const h = String(req.headers.authorization || "");
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [addr, exp, mac] = t.split(".");
  if (!addr || !exp || !mac || Number(exp) < Date.now()) return "";
  const good = sign(`${addr}.${exp}`);
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return "";
  const u = db.prepare("SELECT banned FROM users WHERE addr=?").get(addr) as { banned: number } | undefined;
  return u && !u.banned ? addr : "";
}

// Вызовы входа (одноразовые тексты для подписи)
const challenges = new Map<string, { addr: string; exp: number }>();
const loginText = (addr: string, nonce: string) =>
  `Chess Bet: вход в соцсеть\nКошелёк: ${addr}\nКод: ${nonce}\nПодпись бесплатна и не тратит деньги.`;

// Ограничение частоты действий
const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challenges) if (v.exp < now) challenges.delete(k);
}, 60000).unref();

const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").trim().slice(0, max);

type U = { addr: string; name: string; bio: string; country: string; link: string; avatar: string; banner: string; created: number };
const userByName = (n: string) => db.prepare("SELECT * FROM users WHERE name=? AND banned=0").get(n) as U | undefined;
const userByAddr = (a: string) => db.prepare("SELECT * FROM users WHERE addr=? AND banned=0").get(a) as U | undefined;

function ensureUser(addr: string): U {
  const ex = userByAddr(addr);
  if (ex) return ex;
  let name = "u" + addr.slice(2, 10);
  for (let i = 0; userByName(name) && i < 5; i++) name = "u" + crypto.randomBytes(4).toString("hex");
  db.prepare("INSERT INTO users(addr,name,created) VALUES(?,?,?)").run(addr, name, Date.now());
  return userByAddr(addr)!;
}

function profile(u: U, viewer: string) {
  const c = (sql: string, ...p: string[]) => (db.prepare(sql).get(...p) as { n: number }).n;
  return {
    name: u.name, bio: u.bio, country: u.country, link: u.link, avatar: u.avatar, banner: u.banner, joined: u.created,
    following: c("SELECT COUNT(*) n FROM follows WHERE a=?", u.addr),
    followers: c("SELECT COUNT(*) n FROM follows WHERE b=?", u.addr),
    posts: c("SELECT COUNT(*) n FROM posts WHERE addr=? AND deleted=0", u.addr),
    me: viewer === u.addr,
    follows: viewer && viewer !== u.addr ? !!db.prepare("SELECT 1 FROM follows WHERE a=? AND b=?").get(viewer, u.addr) : false,
    ...(viewer === u.addr ? { addr: u.addr } : {}),
  };
}

type PRow = { id: number; text: string; media: string; created: number; name: string; avatar: string; likes: number; liked: number };
const POST_SELECT = `SELECT p.id,p.text,p.media,p.created,u.name,u.avatar,
  (SELECT COUNT(*) FROM likes l WHERE l.post=p.id) likes,
  EXISTS(SELECT 1 FROM likes l WHERE l.post=p.id AND l.addr=@v) liked
  FROM posts p JOIN users u ON u.addr=p.addr`;
const shape = (r: PRow) => {
  let media: string[] = [];
  try { media = JSON.parse(r.media); } catch { /* пусто */ }
  return { id: r.id, text: r.text, media, created: r.created, user: { name: r.name, avatar: r.avatar }, likes: r.likes, liked: !!r.liked };
};

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 32768) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Обработчик маршрутов /api/*. Возвращает true, если запрос обработан. */
export async function handleSocial(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  const q = url.searchParams;
  const viewer = viewerOf(req);
  const before = Number(q.get("before")) || 9e15;

  try {
    // ---------- чтение ----------
    if (req.method === "GET") {
      if (p === "/api/user") {
        const u = q.get("name") ? userByName(clean(q.get("name"), 20).toLowerCase()) : viewer ? userByAddr(viewer) : undefined;
        return u ? out(200, { ok: true, user: profile(u, viewer) }) : bad("not_found", 404);
      }
      if (p === "/api/posts") { // посты пользователя или общая лента новых постов
        const n = clean(q.get("name"), 20).toLowerCase();
        if (n) {
          const u = userByName(n);
          if (!u) return bad("not_found", 404);
          const rows = db.prepare(`${POST_SELECT} WHERE p.deleted=0 AND p.addr=@a AND p.id<@b ORDER BY p.id DESC LIMIT ${PAGE}`).all({ v: viewer, a: u.addr, b: before }) as PRow[];
          return out(200, { ok: true, posts: rows.map(shape) });
        }
        const rows = db.prepare(`${POST_SELECT} WHERE p.deleted=0 AND u.banned=0 AND p.id<@b ORDER BY p.id DESC LIMIT ${PAGE}`).all({ v: viewer, b: before }) as PRow[];
        return out(200, { ok: true, posts: rows.map(shape) });
      }
      if (p === "/api/feed") { // лента подписок + свои посты
        if (!viewer) return bad("auth", 401);
        const rows = db.prepare(`${POST_SELECT} WHERE p.deleted=0 AND u.banned=0 AND p.id<@b AND (p.addr=@v OR p.addr IN (SELECT b FROM follows WHERE a=@v)) ORDER BY p.id DESC LIMIT ${PAGE}`).all({ v: viewer, b: before }) as PRow[];
        return out(200, { ok: true, posts: rows.map(shape) });
      }
      if (p === "/api/people") { // поиск людей по нику
        const s = clean(q.get("q"), 20).toLowerCase().replace(/[^a-z0-9_]/g, "");
        const rows = db.prepare("SELECT name,avatar,bio FROM users WHERE banned=0 AND name LIKE ? ORDER BY created DESC LIMIT 20").all(s + "%");
        return out(200, { ok: true, users: rows });
      }
      return bad("not_found", 404);
    }

    if (req.method !== "POST") return bad("method", 405);
    const m = await readBody(req);

    // ---------- вход ----------
    if (p === "/api/auth/challenge") {
      if (!ethers.isAddress(String(m.addr))) return bad("bad_addr");
      if (challenges.size > 5000 || limited("ch:" + req.socket.remoteAddress, 20, 60000)) return bad("busy", 429);
      const addr = String(m.addr).toLowerCase();
      const nonce = crypto.randomBytes(8).toString("hex");
      challenges.set(nonce, { addr, exp: Date.now() + 600000 });
      return out(200, { ok: true, nonce, message: loginText(addr, nonce) });
    }
    if (p === "/api/auth/login") {
      const addr = String(m.addr || "").toLowerCase();
      const c = challenges.get(String(m.nonce));
      if (!c || c.exp < Date.now() || c.addr !== addr) return bad("expired");
      let who = "";
      try { who = ethers.verifyMessage(loginText(addr, String(m.nonce)), String(m.sig)).toLowerCase(); } catch { return bad("bad_sig"); }
      if (who !== addr) return bad("bad_sig");
      challenges.delete(String(m.nonce));
      const banned = db.prepare("SELECT banned FROM users WHERE addr=?").get(addr) as { banned: number } | undefined;
      if (banned?.banned) return bad("banned", 403);
      const u = ensureUser(addr);
      return out(200, { ok: true, token: makeToken(addr), user: profile(u, addr) });
    }

    // ---------- действия (нужен вход) ----------
    if (!viewer) return bad("auth", 401);
    if (limited("act:" + viewer, 60, 60000)) return bad("slow_down", 429);

    if (p === "/api/profile") {
      const u = userByAddr(viewer)!;
      const name = m.name !== undefined ? clean(m.name, 20).toLowerCase() : u.name;
      if (!NAME_RE.test(name) || RESERVED.has(name)) return bad("bad_name");
      const taken = userByName(name);
      if (taken && taken.addr !== viewer) return bad("name_taken", 409);
      let link = clean(m.link ?? u.link, 120);
      if (link && !/^https:\/\/[^\s]+$/i.test(link)) return bad("bad_link");
      const pick = (k: string, cur: string, max: number) => (m[k] !== undefined ? clean(m[k], max) : cur);
      const media = (k: string, cur: string) => {
        const v = m[k] !== undefined ? clean(m[k], 200) : cur;
        return v === "" || /^\/media\/[a-z0-9_.-]+$/i.test(v) ? v : cur; // только загруженные на нашем сервере
      };
      db.prepare("UPDATE users SET name=?, bio=?, country=?, link=?, avatar=?, banner=? WHERE addr=?")
        .run(name, pick("bio", u.bio, 160), pick("country", u.country, 40), link, media("avatar", u.avatar), media("banner", u.banner), viewer);
      return out(200, { ok: true, user: profile(userByAddr(viewer)!, viewer) });
    }
    if (p === "/api/follow") {
      const t = userByName(clean(m.name, 20).toLowerCase());
      if (!t || t.addr === viewer) return bad("not_found", 404);
      if (m.on) db.prepare("INSERT OR IGNORE INTO follows(a,b,created) VALUES(?,?,?)").run(viewer, t.addr, Date.now());
      else db.prepare("DELETE FROM follows WHERE a=? AND b=?").run(viewer, t.addr);
      return out(200, { ok: true, user: profile(t, viewer) });
    }
    if (p === "/api/post") {
      const text = clean(m.text, POST_MAX);
      const media = Array.isArray(m.media) ? m.media.map((x) => clean(x, 200)).filter((x) => /^\/media\/[a-z0-9_.-]+$/i.test(x)).slice(0, 4) : [];
      if (!text && !media.length) return bad("empty");
      if (limited("post:" + viewer, 10, 60000) || limited("postday:" + viewer, 200, 86400000)) return bad("slow_down", 429);
      const r = db.prepare("INSERT INTO posts(addr,text,media,created) VALUES(?,?,?,?)").run(viewer, text, JSON.stringify(media), Date.now());
      const row = db.prepare(`${POST_SELECT} WHERE p.id=@id`).get({ v: viewer, id: r.lastInsertRowid }) as PRow;
      return out(200, { ok: true, post: shape(row) });
    }
    if (p === "/api/like") {
      const id = Number(m.id);
      if (!db.prepare("SELECT 1 FROM posts WHERE id=? AND deleted=0").get(id)) return bad("not_found", 404);
      if (m.on) db.prepare("INSERT OR IGNORE INTO likes(post,addr) VALUES(?,?)").run(id, viewer);
      else db.prepare("DELETE FROM likes WHERE post=? AND addr=?").run(id, viewer);
      const n = (db.prepare("SELECT COUNT(*) n FROM likes WHERE post=?").get(id) as { n: number }).n;
      return out(200, { ok: true, likes: n, liked: !!m.on });
    }
    if (p === "/api/delete") {
      db.prepare("UPDATE posts SET deleted=1 WHERE id=? AND addr=?").run(Number(m.id), viewer);
      return out(200, { ok: true });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "too_big" || msg === "bad_json") return bad(msg);
    console.error("social", e);
    return bad("server", 500);
  }
}

// Знакомства: анкеты (до 3 фото), лента с фильтрами, лайки и совпадения. Только 18+, без контактов в тексте.
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
CREATE TABLE IF NOT EXISTS dating_profiles(
  addr TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, gender TEXT NOT NULL, seeking TEXT NOT NULL DEFAULT 'any',
  birth INTEGER NOT NULL, country TEXT NOT NULL DEFAULT '', about TEXT NOT NULL DEFAULT '', photos TEXT NOT NULL DEFAULT '[]',
  created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dating_likes(a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(a, b));
CREATE INDEX IF NOT EXISTS dating_likes_b ON dating_likes(b);
`);

const DAY = 86400000;
const PAGE = 12;
const ABOUT_MAX = 500;
const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").trim().slice(0, max);

/** Контакты и ссылки в анкете запрещены: защита от мошенников и увода с сайта */
const CONTACT = /(https?:\/\/|www\.|\bt\.me\b|\.(com|ru|net|org|io|me|lol|xyz|info)\b|@\w|\w@\w|\+?\d[\d\s().-]{7,}|telegram|whatsapp|вотсап|ватсап|телеграм|instagram|инстаграм)/i;

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

type Row = { addr: string; enabled: number; gender: string; seeking: string; birth: number; country: string; about: string; photos: string; created: number; updated: number };
type U = { addr: string; name: string; avatar: string; banned: number };
const userByAddr = (a: string) => db.prepare("SELECT addr,name,avatar,banned FROM users WHERE addr=?").get(a) as U | undefined;
const userByName = (n: string) => db.prepare("SELECT addr,name,avatar,banned FROM users WHERE name=?").get(String(n).trim().toLowerCase()) as U | undefined;
const blocked = (x: string, y: string) => { try { return !!db.prepare("SELECT 1 FROM dm_blocks WHERE a=? AND b=?").get(x, y); } catch { return false; } };
const level = (addr: string) => {
  try { const r = db.prepare("SELECT xp FROM q_stats WHERE addr=?").get(addr) as { xp: number } | undefined; return Math.floor(Math.sqrt((r?.xp ?? 0) / 25)) + 1; } catch { return 1; }
};
const photosOf = (r: Row): string[] => { try { const a = JSON.parse(r.photos); return Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 3) : []; } catch { return []; } };
const ageOf = (birth: number) => new Date().getUTCFullYear() - birth;
const likes = (a: string, b: string) => !!db.prepare("SELECT 1 FROM dating_likes WHERE a=? AND b=?").get(a, b);

function card(r: Row, me: string) {
  const u = userByAddr(r.addr);
  return {
    name: u?.name ?? "", avatar: u?.avatar ?? "", age: ageOf(r.birth), gender: r.gender, seeking: r.seeking, country: r.country,
    about: r.about, photos: photosOf(r), level: level(r.addr),
    liked: likes(me, r.addr), likesMe: likes(r.addr, me), match: likes(me, r.addr) && likes(r.addr, me),
  };
}
const mine = (r: Row) => ({ enabled: !!r.enabled, gender: r.gender, seeking: r.seeking, birth: r.birth, country: r.country, about: r.about, photos: photosOf(r) });

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 8192) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Маршруты /api/dating/*. viewer = адрес из токена входа или "" */
export async function handleDating(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/dating/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (!viewer) return bad("auth", 401);
  const me = viewer;
  const q = url.searchParams;
  const myUser = userByAddr(me);
  if (!myUser || myUser.banned) return bad("forbidden", 403);
  const myRow = () => db.prepare("SELECT * FROM dating_profiles WHERE addr=?").get(me) as Row | undefined;

  try {
    if (req.method === "GET") {
      if (p === "/api/dating/me") {
        const r = myRow();
        return out(200, { ok: true, profile: r ? mine(r) : null, name: myUser.name });
      }
      if (p === "/api/dating/browse") {
        const r = myRow();
        if (!r || !r.enabled) return bad("no_profile", 403);
        const g = q.get("gender") === "m" || q.get("gender") === "f" ? q.get("gender")! : (r.seeking === "any" ? "" : r.seeking);
        const min = Math.max(18, Math.min(99, Number(q.get("min")) || 18));
        const max = Math.max(min, Math.min(99, Number(q.get("max")) || 99));
        const country = clean(q.get("country"), 40).toLowerCase();
        const lvl = Math.max(0, Number(q.get("level")) || 0);
        const offset = Math.max(0, Number(q.get("offset")) || 0);
        const year = new Date().getUTCFullYear();
        const rows = db.prepare(
          `SELECT d.* FROM dating_profiles d JOIN users u ON u.addr=d.addr
           WHERE d.addr<>@me AND d.enabled=1 AND u.banned=0
             AND (@g='' OR d.gender=@g) AND (d.seeking='any' OR d.seeking=@mg)
             AND d.birth<=@maxb AND d.birth>=@minb
             AND (@c='' OR lower(d.country)=@c)
             AND NOT EXISTS(SELECT 1 FROM dm_blocks k WHERE (k.a=@me AND k.b=d.addr) OR (k.a=d.addr AND k.b=@me))
           ORDER BY d.updated DESC LIMIT 400`
        ).all({ me, g, mg: r.gender, maxb: year - min, minb: year - max, c: country }) as Row[];
        const list = rows.filter((x) => !lvl || level(x.addr) >= lvl);
        return out(200, { ok: true, total: list.length, items: list.slice(offset, offset + PAGE).map((x) => card(x, me)), next: offset + PAGE < list.length ? offset + PAGE : null });
      }
      if (p === "/api/dating/matches") {
        const rows = db.prepare(
          `SELECT d.* FROM dating_profiles d JOIN users u ON u.addr=d.addr
           WHERE u.banned=0 AND d.addr IN (SELECT a.b FROM dating_likes a JOIN dating_likes b ON b.a=a.b AND b.b=a.a WHERE a.a=@me)
           ORDER BY d.updated DESC LIMIT 200`
        ).all({ me }) as Row[];
        const fans = (db.prepare("SELECT COUNT(*) n FROM dating_likes WHERE b=? AND a NOT IN (SELECT b FROM dating_likes WHERE a=?)").get(me, me) as { n: number }).n;
        return out(200, { ok: true, items: rows.filter((x) => !blocked(me, x.addr) && !blocked(x.addr, me)).map((x) => card(x, me)), pending: fans });
      }
      return bad("not_found", 404);
    }
    if (req.method !== "POST") return bad("method", 405);
    const m = await readBody(req);

    if (p === "/api/dating/save") {
      if (limited("dsave:" + me, 20, DAY)) return bad("slow_down", 429);
      const year = new Date().getUTCFullYear();
      const gender = m.gender === "m" || m.gender === "f" ? String(m.gender) : "";
      const seeking = m.seeking === "m" || m.seeking === "f" ? String(m.seeking) : "any";
      const birth = Math.floor(Number(m.birth));
      if (!gender) return bad("gender");
      if (!Number.isFinite(birth) || birth > year - 18) return bad("adult_only");
      if (birth < year - 90) return bad("birth");
      if (m.adult !== true) return bad("adult_only");
      const country = clean(m.country, 40);
      const about = clean(m.about, ABOUT_MAX);
      if (CONTACT.test(about) || CONTACT.test(country)) return bad("contacts_not_allowed");
      const photos = (Array.isArray(m.photos) ? m.photos : []).map((x) => String(x))
        .filter((x) => /^\/media\/[a-f0-9]{20}\.[a-z0-9]{3,4}$/.test(x)).slice(0, 3);
      const now = Date.now();
      db.prepare(
        `INSERT INTO dating_profiles(addr,enabled,gender,seeking,birth,country,about,photos,created,updated) VALUES(@a,@e,@g,@s,@b,@c,@t,@p,@now,@now)
         ON CONFLICT(addr) DO UPDATE SET enabled=@e,gender=@g,seeking=@s,birth=@b,country=@c,about=@t,photos=@p,updated=@now`
      ).run({ a: me, e: m.enabled === false ? 0 : 1, g: gender, s: seeking, b: birth, c: country, t: about, p: JSON.stringify(photos), now });
      return out(200, { ok: true, profile: mine(myRow()!) });
    }
    if (p === "/api/dating/hide") {
      db.prepare("UPDATE dating_profiles SET enabled=? WHERE addr=?").run(m.on === false ? 1 : 0, me);
      return out(200, { ok: true });
    }
    if (p === "/api/dating/delete") { // удалить анкету и лайки
      db.prepare("DELETE FROM dating_profiles WHERE addr=?").run(me);
      db.prepare("DELETE FROM dating_likes WHERE a=? OR b=?").run(me, me);
      return out(200, { ok: true });
    }
    if (p === "/api/dating/like" || p === "/api/dating/unlike") {
      const mr = myRow();
      if (!mr || !mr.enabled) return bad("no_profile", 403);
      const peer = userByName(String(m.name ?? ""));
      if (!peer || peer.banned || peer.addr === me) return bad("not_found", 404);
      const pr = db.prepare("SELECT * FROM dating_profiles WHERE addr=? AND enabled=1").get(peer.addr) as Row | undefined;
      if (!pr || blocked(me, peer.addr) || blocked(peer.addr, me)) return bad("not_found", 404);
      if (p === "/api/dating/unlike") {
        db.prepare("DELETE FROM dating_likes WHERE a=? AND b=?").run(me, peer.addr);
        return out(200, { ok: true, liked: false, match: false });
      }
      if (limited("dlike:" + me, 100, DAY)) return bad("slow_down", 429);
      db.prepare("INSERT OR IGNORE INTO dating_likes(a,b,created) VALUES(?,?,?)").run(me, peer.addr, Date.now());
      return out(200, { ok: true, liked: true, match: likes(peer.addr, me) });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "too_big") return bad("too_big", 413);
    if (msg === "bad_json") return bad("bad_json");
    console.error("dating", e);
    return bad("server", 500);
  }
}

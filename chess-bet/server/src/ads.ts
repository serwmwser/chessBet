// Объявления (как Avito): купля, продажа, аренда, работа, услуги; страны и города. Пока бесплатно (ADS_FREE), оплата USDC добавляется позже.
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
CREATE TABLE IF NOT EXISTS ads(
  id INTEGER PRIMARY KEY AUTOINCREMENT, addr TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  price REAL, currency TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', photos TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active', created INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL,
  pinned_until INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0,
  cl TEXT NOT NULL DEFAULT '', cy TEXT NOT NULL DEFAULT '', ft TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ads_list ON ads(status, kind, cl, cy, id);
CREATE INDEX IF NOT EXISTS ads_addr ON ads(addr);
CREATE TABLE IF NOT EXISTS ads_reports(ad INTEGER NOT NULL, reporter TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, PRIMARY KEY(ad, reporter));
`);

try { db.exec("ALTER TABLE ads ADD COLUMN free INTEGER NOT NULL DEFAULT 1"); } catch { /* колонка уже есть */ }

const DAY = 86400000;
const TERM = 30 * DAY;          // срок объявления
const RENEW_WINDOW = 7 * DAY;   // продлевать можно за 7 дней до конца и после
const PAGE = 20;
const MAX_ACTIVE = 10;          // активных объявлений на человека
const BASE_FREE = 1;            // бесплатных объявлений у каждого
const MAX_BONUS = 20;           // максимум бонусных объявлений за приглашённых
const KINDS = ["sale", "buy", "rent", "job", "service"] as const;
type Kind = (typeof KINDS)[number];
const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E]/g, "").trim().slice(0, max);
/** Ссылки, почта, телефоны и мессенджеры: общение только через чат сайта (защита от мошенников) */
const CONTACT = /(https?:\/\/|www\.|\bt\.me\b|\.(com|ru|net|org|io|me|lol|xyz|info)\b|\w@\w|\+?\d[\d\s().-]{8,}|telegram|whatsapp|вотсап|ватсап|телеграм|instagram|инстаграм)/i;

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

type Row = { id: number; addr: string; kind: string; title: string; body: string; price: number | null; currency: string; country: string; city: string; photos: string; status: string; created: number; updated: number; expires: number; pinned_until: number; views: number; cl: string; cy: string; ft: string; free: number };
type U = { addr: string; name: string; avatar: string; banned: number };
const userByAddr = (a: string) => db.prepare("SELECT addr,name,avatar,banned FROM users WHERE addr=?").get(a) as U | undefined;
const level = (addr: string) => {
  try { const r = db.prepare("SELECT xp FROM q_stats WHERE addr=?").get(addr) as { xp: number } | undefined; return Math.floor(Math.sqrt((r?.xp ?? 0) / 25)) + 1; } catch { return 1; }
};
const photosOf = (r: Row): string[] => { try { const a = JSON.parse(r.photos); return Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 5) : []; } catch { return []; } };

/** Приглашённые пользователи. Источник задаёт index.ts: ожидающие подтверждения адреса и число друзей, зафиксированных в контракте */
type RefSource = (addr: string) => Promise<{ pending: string[]; chain: number }>;
let refSource: RefSource = async () => ({ pending: [], chain: 0 });
export function setRefSource(fn: RefSource) { refSource = fn; }

/** Бесплатные объявления: 1 + по одному за каждого приглашённого. Засчитывается приглашённый с профилем и хоть какой-то активностью (опыт больше нуля), без блокировки */
async function quota(addr: string) {
  let bonus = 0;
  try {
    const r = await refSource(addr);
    const ok = r.pending.filter((a) => {
      const u = userByAddr(a);
      if (!u || u.banned || a === addr) return false;
      try { return ((db.prepare("SELECT xp FROM q_stats WHERE addr=?").get(a) as { xp: number } | undefined)?.xp ?? 0) > 0; } catch { return false; }
    }).length;
    bonus = Math.min(MAX_BONUS, ok + Math.max(0, r.chain));
  } catch { /* без бонуса */ }
  const used = (db.prepare("SELECT COUNT(*) n FROM ads WHERE addr=? AND free=1").get(addr) as { n: number }).n; // удаление кредит не возвращает
  const credits = BASE_FREE + bonus;
  return { credits, used, left: Math.max(0, credits - used), referred: bonus };
}

function view(r: Row, full: boolean) {
  const u = userByAddr(r.addr);
  const now = Date.now();
  const o: Record<string, unknown> = {
    id: r.id, kind: r.kind, title: r.title, price: r.price, currency: r.currency, country: r.country, city: r.city,
    photos: photosOf(r), created: r.created, expires: r.expires, pinned: r.pinned_until > now,
    seller: { name: u?.name ?? "", avatar: u?.avatar ?? "", level: level(r.addr) },
  };
  if (full) { o.body = r.body; o.views = r.views; o.status = r.status; o.free = !!r.free; }
  else o.preview = r.body.slice(0, 140);
  return o;
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 16384) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Маршруты /api/ads/*. Просмотр открыт всем, подача и управление — только вошедшим. viewer = адрес или "" */
export async function handleAds(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/ads/")) return false;
  const out = (code: number, o: unknown, cache = false) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache ? "public, max-age=30" : "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  const q = url.searchParams;
  const now = Date.now();
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

  try {
    if (req.method === "GET") {
      if (p === "/api/ads/list") {
        const kind = (KINDS as readonly string[]).includes(q.get("kind") || "") ? q.get("kind")! : "";
        const country = clean(q.get("country"), 40).toLowerCase();
        const city = clean(q.get("city"), 40).toLowerCase();
        const text = clean(q.get("q"), 60).toLowerCase();
        const page = Math.max(0, Math.min(500, Number(q.get("page")) || 0));
        const rows = db.prepare(
          `SELECT a.* FROM ads a JOIN users u ON u.addr=a.addr
           WHERE a.status='active' AND a.expires>@now AND u.banned=0
             AND (@k='' OR a.kind=@k) AND (@c='' OR a.cl=@c) AND (@city='' OR a.cy=@city)
             AND (@t='' OR instr(a.ft,@t)>0)
           ORDER BY (a.pinned_until>@now) DESC, a.id DESC LIMIT @lim OFFSET @off`
        ).all({ now, k: kind, c: country, city, t: text, lim: PAGE + 1, off: page * PAGE }) as Row[];
        return out(200, { ok: true, items: rows.slice(0, PAGE).map((r) => view(r, false)), next: rows.length > PAGE ? page + 1 : null }, true);
      }
      if (p === "/api/ads/item") {
        const id = Math.floor(Number(q.get("id")));
        const r = db.prepare("SELECT * FROM ads WHERE id=?").get(id) as Row | undefined;
        const own = !!viewer && r?.addr === viewer;
        if (!r || (!own && (r.status !== "active" || r.expires <= now))) return bad("not_found", 404);
        const u = userByAddr(r.addr);
        if (!own && (!u || u.banned)) return bad("not_found", 404);
        if (!own && !limited(`aview:${ip}:${id}`, 1, 3600000)) db.prepare("UPDATE ads SET views=views+1 WHERE id=?").run(id);
        return out(200, { ok: true, item: view(r, true), mine: own });
      }
      if (p === "/api/ads/places") { // страны и города с числом объявлений: для фильтров и SEO-страниц
        const rows = db.prepare(
          `SELECT a.cl slug, MIN(a.country) country, a.cy cslug, MIN(a.city) city, COUNT(*) n FROM ads a JOIN users u ON u.addr=a.addr
           WHERE a.status='active' AND a.expires>? AND u.banned=0 AND a.cl<>'' GROUP BY a.cl, a.cy`
        ).all(now) as { slug: string; country: string; cslug: string; city: string; n: number }[];
        const map = new Map<string, { slug: string; country: string; count: number; cities: { slug: string; city: string; count: number }[] }>();
        for (const r of rows) {
          const c = map.get(r.slug) ?? { slug: r.slug, country: r.country, count: 0, cities: [] };
          c.count += r.n; if (r.cslug) c.cities.push({ slug: r.cslug, city: r.city, count: r.n });
          map.set(r.slug, c);
        }
        const list = [...map.values()].sort((a, b) => b.count - a.count);
        list.forEach((c) => c.cities.sort((a, b) => b.count - a.count));
        return out(200, { ok: true, places: list }, true);
      }
      if (p === "/api/ads/quota") {
        if (!viewer) return bad("auth", 401);
        return out(200, { ok: true, ...(await quota(viewer)) });
      }
      if (p === "/api/ads/mine") {
        if (!viewer) return bad("auth", 401);
        const rows = db.prepare("SELECT * FROM ads WHERE addr=? AND status<>'deleted' ORDER BY id DESC LIMIT 100").all(viewer) as Row[];
        return out(200, { ok: true, items: rows.map((r) => ({ ...view(r, true), expired: r.expires <= now, canRenew: r.expires - now < RENEW_WINDOW })) });
      }
      return bad("not_found", 404);
    }
    if (req.method !== "POST") return bad("method", 405);
    if (!viewer) return bad("auth", 401);
    const me = viewer;
    const myUser = userByAddr(me);
    if (!myUser || myUser.banned) return bad("forbidden", 403);
    const m = await readBody(req);

    if (p === "/api/ads/save") {
      if (limited("asave:" + me, 20, DAY)) return bad("slow_down", 429);
      const id = Math.floor(Number(m.id)) || 0;
      const kind = String(m.kind) as Kind;
      if (!KINDS.includes(kind)) return bad("kind");
      const title = clean(m.title, 80), body = clean(m.body, 2000);
      if (title.length < 4) return bad("title");
      if (body.length < 10) return bad("body");
      const country = clean(m.country, 40), city = clean(m.city, 40);
      if (!country) return bad("country");
      if (CONTACT.test(title) || CONTACT.test(body) || CONTACT.test(city) || CONTACT.test(country)) return bad("contacts_not_allowed");
      let price: number | null = null;
      if (m.price !== undefined && m.price !== null && m.price !== "") {
        price = Number(m.price);
        if (!Number.isFinite(price) || price < 0 || price > 1e12) return bad("price");
      }
      const currency = clean(m.currency, 4).toUpperCase().replace(/[^A-Z]/g, "");
      const photos = (Array.isArray(m.photos) ? m.photos : []).map((x) => String(x))
        .filter((x) => /^\/media\/[a-f0-9]{20}\.[a-z0-9]{3,4}$/.test(x)).slice(0, 5);
      // поисковые поля в нижнем регистре считаем в коде: SQLite не понижает регистр кириллицы
      const idx = { cl: country.toLowerCase(), cy: city.toLowerCase(), ft: (title + " " + body).toLowerCase() };
      if (id) {
        const r = db.prepare("SELECT * FROM ads WHERE id=? AND addr=? AND status<>'deleted'").get(id, me) as Row | undefined;
        if (!r) return bad("not_found", 404);
        db.prepare("UPDATE ads SET kind=@k,title=@t,body=@b,price=@pr,currency=@cur,country=@c,city=@city,photos=@ph,updated=@now,cl=@cl,cy=@cy,ft=@ft WHERE id=@id")
          .run({ k: kind, t: title, b: body, pr: price, cur: currency, c: country, city, ph: JSON.stringify(photos), now, id, ...idx });
        return out(200, { ok: true, id });
      }
      if ((await quota(me)).left <= 0) return bad("payment_required", 402); // бесплатные кредиты закончились, оплата USDC ещё не запущена
      const active = (db.prepare("SELECT COUNT(*) n FROM ads WHERE addr=? AND status='active' AND expires>?").get(me, now) as { n: number }).n;
      if (active >= MAX_ACTIVE) return bad("too_many");
      if (db.prepare("SELECT 1 FROM ads WHERE addr=? AND status='active' AND lower(title)=lower(?)").get(me, title)) return bad("duplicate");
      const r = db.prepare(
        `INSERT INTO ads(addr,kind,title,body,price,currency,country,city,photos,created,updated,expires,cl,cy,ft,free) VALUES(@a,@k,@t,@b,@pr,@cur,@c,@city,@ph,@now,@now,@exp,@cl,@cy,@ft,1)`
      ).run({ a: me, k: kind, t: title, b: body, pr: price, cur: currency, c: country, city, ph: JSON.stringify(photos), now, exp: now + TERM, ...idx });
      return out(200, { ok: true, id: Number(r.lastInsertRowid) });
    }
    if (p === "/api/ads/renew") { // продление на 30 дней (сейчас бесплатно; позже 1 USDC)
      const id = Math.floor(Number(m.id));
      const r = db.prepare("SELECT * FROM ads WHERE id=? AND addr=? AND status IN ('active','expired')").get(id, me) as Row | undefined;
      if (!r) return bad("not_found", 404);
      if (r.free) return bad("payment_required", 402); // продление платное (1 USDC), оплата ещё не запущена
      if (r.expires - now > RENEW_WINDOW) return bad("too_early");
      const exp = Math.max(now, r.expires) + TERM;
      db.prepare("UPDATE ads SET expires=?, status='active', updated=? WHERE id=?").run(exp, now, id);
      return out(200, { ok: true, expires: exp });
    }
    if (p === "/api/ads/delete") {
      db.prepare("UPDATE ads SET status='deleted' WHERE id=? AND addr=?").run(Math.floor(Number(m.id)), me);
      return out(200, { ok: true });
    }
    if (p === "/api/ads/report") {
      if (limited("arep:" + me, 20, DAY)) return bad("slow_down", 429);
      const id = Math.floor(Number(m.id));
      const r = db.prepare("SELECT * FROM ads WHERE id=? AND status='active'").get(id) as Row | undefined;
      if (!r || r.addr === me) return bad("not_found", 404);
      db.prepare("INSERT OR IGNORE INTO ads_reports(ad,reporter,reason,created) VALUES(?,?,?,?)").run(id, me, clean(m.reason, 200), now);
      const n = (db.prepare("SELECT COUNT(*) n FROM ads_reports WHERE ad=?").get(id) as { n: number }).n;
      if (n >= 3) db.prepare("UPDATE ads SET status='hidden' WHERE id=? AND status='active'").run(id); // 3 жалобы — скрываем до проверки
      return out(200, { ok: true, id });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "too_big") return bad("too_big", 413);
    if (msg === "bad_json") return bad("bad_json");
    console.error("ads", e);
    return bad("server", 500);
  }
}

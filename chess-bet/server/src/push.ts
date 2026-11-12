// Уведомления на телефон и в браузер (Web Push): подписки пользователей и отправка. Ключи VAPID берутся из окружения.
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";
import webpush from "web-push";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec("CREATE TABLE IF NOT EXISTS push_subs(endpoint TEXT PRIMARY KEY, addr TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS push_subs_addr ON push_subs(addr);");

const PUB = process.env.VAPID_PUBLIC || "";
const PRIV = process.env.VAPID_PRIVATE || "";
const SUBJ = process.env.VAPID_SUBJECT || "mailto:chessgrokearn@gmail.com";
const ready = !!(PUB && PRIV);
if (ready) webpush.setVapidDetails(SUBJ, PUB, PRIV);
else console.log("push: ключи VAPID не заданы, уведомления выключены");

// Адрес подписки задаёт пользователь, поэтому разрешены только настоящие службы push браузеров (иначе сервер можно заставить ходить по чужим адресам)
const ENDPOINT_OK = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

export const hasPush = (addr: string): boolean => ready && !!db.prepare("SELECT 1 FROM push_subs WHERE addr=? LIMIT 1").get(addr);

export type PushMsg = { title: string; body: string; url: string; tag?: string; call?: boolean };

export function pushTo(addr: string, msg: PushMsg) {
  if (!ready) return;
  const rows = db.prepare("SELECT endpoint,p256dh,auth FROM push_subs WHERE addr=?").all(addr) as { endpoint: string; p256dh: string; auth: string }[];
  const payload = JSON.stringify(msg);
  for (const r of rows) {
    webpush
      .sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, { TTL: msg.call ? 45 : 3600, urgency: msg.call ? "high" : "normal" })
      .catch((e: { statusCode?: number }) => { if (e && (e.statusCode === 404 || e.statusCode === 410)) db.prepare("DELETE FROM push_subs WHERE endpoint=?").run(r.endpoint); });
  }
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 4096) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** Маршруты /api/push/*: key (открытый ключ), subscribe, unsubscribe. viewer = кошелёк из токена входа или пусто */
export async function handlePush(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const p = url.pathname;
  if (p === "/api/push/key" && req.method === "GET") return out(200, { ok: true, key: ready ? PUB : "" });
  if (!viewer) return out(401, { ok: false, error: "auth" });
  if (req.method !== "POST") return out(405, { ok: false, error: "method" });
  let m: Record<string, unknown>;
  try { m = await readBody(req); } catch { return out(400, { ok: false, error: "bad_request" }); }
  const endpoint = String(m.endpoint ?? "");
  if (p === "/api/push/subscribe") {
    const k = (m.keys ?? {}) as Record<string, unknown>;
    const p256dh = String(k.p256dh ?? ""), auth = String(k.auth ?? "");
    if (!ready) return out(503, { ok: false, error: "push_off" });
    if (endpoint.length > 600 || !ENDPOINT_OK.test(endpoint) || !p256dh || p256dh.length > 200 || !auth || auth.length > 100) return out(400, { ok: false, error: "bad_sub" });
    db.prepare("INSERT OR REPLACE INTO push_subs(endpoint,addr,p256dh,auth,created) VALUES(?,?,?,?,?)").run(endpoint, viewer, p256dh, auth, Date.now());
    db.prepare("DELETE FROM push_subs WHERE addr=? AND endpoint NOT IN (SELECT endpoint FROM push_subs WHERE addr=? ORDER BY created DESC LIMIT 10)").run(viewer, viewer); // не больше 10 устройств на человека
    return out(200, { ok: true });
  }
  if (p === "/api/push/unsubscribe") {
    db.prepare("DELETE FROM push_subs WHERE endpoint=? AND addr=?").run(endpoint, viewer);
    return out(200, { ok: true });
  }
  return out(404, { ok: false, error: "not_found" });
}

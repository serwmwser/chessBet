// Баллы TCH за звонки (этап 2): внутренний баланс на сайте, вывод на кошелёк появится позже (этап 3).
// Ставка: 0,001 TCH за час разговора на пару, поровну 50/50, то есть по 0,0005 TCH в час каждому.
// Единица учёта: 1 микро = 0,000001 TCH (целые числа, без ошибок округления).
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";
import type { CallInfo } from "./calls.js";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS tch_bal(addr TEXT PRIMARY KEY, micro INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tch_log(
  call_id TEXT NOT NULL, addr TEXT NOT NULL, peer TEXT NOT NULL, micro INTEGER NOT NULL, secs INTEGER NOT NULL, created INTEGER NOT NULL,
  PRIMARY KEY(call_id, addr));
CREATE INDEX IF NOT EXISTS tch_log_addr ON tch_log(addr, created);
CREATE INDEX IF NOT EXISTS tch_log_created ON tch_log(created);
`);

const DAY = 86400000;
/** Микро-TCH каждому участнику за час разговора: 0,0005 TCH */
export const MICRO_PER_HOUR_EACH = 500;
const MIN_SECS = 60;                    // звонок короче минуты не считается
const MAX_CALL_SECS = 2 * 3600;         // один звонок учитывается максимум 2 часа
const USER_DAY_SECS = 3 * 3600;         // на человека не больше 3 часов в сутки
const PAIR_DAY_SECS = 3600;             // на одну пару собеседников не больше 1 часа в сутки
const MIN_AGE_MS = DAY;                 // профиль должен существовать минимум сутки
const DAY_POOL_MICRO = Number(process.env.TCH_DAY_POOL_MICRO || 50_000_000); // общий лимит начислений за сутки (по умолчанию 50 TCH)

type CallerRow = { addr: string; created: number; banned: number };
const user = (a: string) => db.prepare("SELECT addr,created,banned FROM users WHERE addr=?").get(a) as CallerRow | undefined;
const blocked = (x: string, y: string) => { try { return !!db.prepare("SELECT 1 FROM dm_blocks WHERE a=? AND b=?").get(x, y); } catch { return false; } };
const usedSecs = (addr: string, since: number) => (db.prepare("SELECT COALESCE(SUM(secs),0) s FROM tch_log WHERE addr=? AND created>=?").get(addr, since) as { s: number }).s;
const usedPair = (a: string, b: string, since: number) => (db.prepare("SELECT COALESCE(SUM(secs),0) s FROM tch_log WHERE addr=? AND peer=? AND created>=?").get(a, b, since) as { s: number }).s;
const dayEmission = (since: number) => (db.prepare("SELECT COALESCE(SUM(micro),0) m FROM tch_log WHERE created>=?").get(since) as { m: number }).m;

const addBal = db.prepare("INSERT INTO tch_bal(addr,micro) VALUES(?,?) ON CONFLICT(addr) DO UPDATE SET micro=micro+excluded.micro");
const addLog = db.prepare("INSERT OR IGNORE INTO tch_log(call_id,addr,peer,micro,secs,created) VALUES(?,?,?,?,?,?)");

/** Результат начисления для тестов и журнала */
export type Award = { ok: boolean; reason?: string; secs?: number; each?: number };

/** Вызывается сервером звонков после каждого завершённого разговора */
export function tchOnCall(c: CallInfo): Award {
  const now = Date.now();
  if (c.secs < MIN_SECS) return { ok: false, reason: "short" };
  if (c.a === c.b) return { ok: false, reason: "self" };
  const ua = user(c.a), ub = user(c.b);
  if (!ua || !ub || ua.banned || ub.banned) return { ok: false, reason: "no_profile" };
  if (now - ua.created < MIN_AGE_MS || now - ub.created < MIN_AGE_MS) return { ok: false, reason: "too_new" };
  if (blocked(c.a, c.b) || blocked(c.b, c.a)) return { ok: false, reason: "blocked" };
  if (db.prepare("SELECT 1 FROM tch_log WHERE call_id=?").get(c.id)) return { ok: false, reason: "duplicate" };

  const since = now - DAY;
  const secs = Math.min(
    Math.min(c.secs, MAX_CALL_SECS),
    USER_DAY_SECS - usedSecs(c.a, since),
    USER_DAY_SECS - usedSecs(c.b, since),
    PAIR_DAY_SECS - usedPair(c.a, c.b, since),
  );
  if (secs < 1) return { ok: false, reason: "limit" };
  const each = Math.floor((secs * MICRO_PER_HOUR_EACH) / 3600);
  if (each < 1) return { ok: false, reason: "tiny" };
  if (dayEmission(since) + 2 * each > DAY_POOL_MICRO) return { ok: false, reason: "pool_day" };

  db.transaction(() => {
    addLog.run(c.id, c.a, c.b, each, secs, now);
    addLog.run(c.id, c.b, c.a, each, secs, now);
    addBal.run(c.a, each);
    addBal.run(c.b, each);
  })();
  return { ok: true, secs, each };
}

/** Маршруты /api/tch/*. viewer = кошелёк из токена входа или "" */
export async function handleTch(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  if (!url.pathname.startsWith("/api/tch/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  if (req.method !== "GET") return out(405, { ok: false, error: "method" });
  if (!viewer) return out(401, { ok: false, error: "auth" });
  if (url.pathname !== "/api/tch/me") return out(404, { ok: false, error: "not_found" });
  try {
    const bal = (db.prepare("SELECT micro FROM tch_bal WHERE addr=?").get(viewer) as { micro: number } | undefined)?.micro ?? 0;
    const since = Date.now() - DAY;
    const today = db.prepare("SELECT COALESCE(SUM(secs),0) secs, COALESCE(SUM(micro),0) micro FROM tch_log WHERE addr=? AND created>=?").get(viewer, since) as { secs: number; micro: number };
    const log = db.prepare("SELECT l.call_id id, l.micro, l.secs, l.created, COALESCE(u.name,'') peer FROM tch_log l LEFT JOIN users u ON u.addr=l.peer WHERE l.addr=? ORDER BY l.created DESC LIMIT 20").all(viewer);
    return out(200, {
      ok: true, balance: bal, today,
      rules: { perHourEach: MICRO_PER_HOUR_EACH, minSecs: MIN_SECS, userDaySecs: USER_DAY_SECS, pairDaySecs: PAIR_DAY_SECS },
      log,
    });
  } catch (e) { console.error("tch", e); return out(500, { ok: false, error: "server" }); }
}

// Ежедневные задания, очки (XP), серии дней и значки. Деньги не участвуют.
// Задания выдаются автоматически каждый день в 00:00 UTC: набор зависит только от даты, одинаковый для всех.
// Прогресс считается по окончании бесплатной партии (хук setFinishHook в rooms.ts), если игрок вошёл на сайте.
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";
import type { FinishInfo } from "./rooms.js";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS q_stats(
  addr TEXT PRIMARY KEY, xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0,
  last_day TEXT NOT NULL DEFAULT '', games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS q_progress(
  addr TEXT NOT NULL, day TEXT NOT NULL, qid TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(addr, day, qid));
CREATE TABLE IF NOT EXISTS q_badges(addr TEXT NOT NULL, badge TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(addr, badge));
CREATE TABLE IF NOT EXISTS q_games(
  addr TEXT NOT NULL, room TEXT NOT NULL, day TEXT NOT NULL, opp TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL,
  PRIMARY KEY(addr, room));
CREATE INDEX IF NOT EXISTS q_games_day ON q_games(addr, day);
CREATE INDEX IF NOT EXISTS q_stats_xp ON q_stats(xp);
`);

const DAY_MS = 86400000;
const MIN_PLIES = 10; // партия короче 5 ходов каждого не считается (защита от накрутки)
const MAX_GAMES_DAY = 30; // зачтённых партий в сутки на аккаунт
const MAX_PAIR_DAY = 5; // и против одного и того же соперника
const XP_GAME = 3, XP_WIN = 5, XP_DRAW = 1, XP_ALL_QUESTS = 20;

const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const prevDay = (d: string) => dayOf(Date.parse(d + "T00:00:00Z") - DAY_MS);
const level = (xp: number) => Math.floor(Math.sqrt(xp / 25)) + 1;
const nextLevelXp = (xp: number) => 25 * level(xp) ** 2;

// ---------- Значки ----------
export const BADGES: Record<string, { icon: string; ru: string; en: string }> = {
  first_game: { icon: "♟", ru: "Первая партия", en: "First game" },
  games10: { icon: "🎯", ru: "10 партий", en: "10 games" },
  games100: { icon: "💯", ru: "100 партий", en: "100 games" },
  first_win: { icon: "🏁", ru: "Первая победа", en: "First win" },
  wins10: { icon: "🥊", ru: "10 побед", en: "10 wins" },
  wins50: { icon: "🦁", ru: "50 побед", en: "50 wins" },
  mate: { icon: "👑", ru: "Первый мат", en: "First checkmate" },
  streak3: { icon: "🔥", ru: "Серия 3 дня", en: "3-day streak" },
  streak7: { icon: "🔥", ru: "Серия 7 дней", en: "7-day streak" },
  streak30: { icon: "🌋", ru: "Серия 30 дней", en: "30-day streak" },
  allquests: { icon: "✅", ru: "Все задания за день", en: "All daily quests" },
  tour_first: { icon: "🎟", ru: "Первый турнир", en: "First tournament" },
  cup1: { icon: "🥇", ru: "Кубок: 1 место", en: "Cup: 1st place" },
  cup2: { icon: "🥈", ru: "Кубок: 2 место", en: "Cup: 2nd place" },
  cup3: { icon: "🥉", ru: "Кубок: 3 место", en: "Cup: 3rd place" },
};

/** Выдать значок. true, если он новый */
export function giveBadge(addr: string, badge: string): boolean {
  if (!addr || !BADGES[badge]) return false;
  return db.prepare("INSERT OR IGNORE INTO q_badges(addr,badge,at) VALUES(?,?,?)").run(addr, badge, Date.now()).changes > 0;
}

/** Добавить очки (турниры и др.). Возвращает новую сумму */
export function addXp(addr: string, n: number): number {
  if (!addr || !Number.isFinite(n) || n <= 0) return 0;
  db.prepare("INSERT OR IGNORE INTO q_stats(addr) VALUES(?)").run(addr);
  db.prepare("UPDATE q_stats SET xp = xp + ? WHERE addr = ?").run(Math.round(n), addr);
  return (db.prepare("SELECT xp FROM q_stats WHERE addr=?").get(addr) as { xp: number }).xp;
}

// ---------- Набор заданий дня ----------
type Metric = "games" | "wins" | "mates" | "long" | "blackwin" | "draws";
type Quest = { id: string; metric: Metric; target: number; xp: number; ru: string; en: string };
const POOL: Quest[] = [
  { id: "games2", metric: "games", target: 2, xp: 15, ru: "Сыграть 2 партии", en: "Play 2 games" },
  { id: "games3", metric: "games", target: 3, xp: 20, ru: "Сыграть 3 партии", en: "Play 3 games" },
  { id: "games5", metric: "games", target: 5, xp: 30, ru: "Сыграть 5 партий", en: "Play 5 games" },
  { id: "wins1", metric: "wins", target: 1, xp: 25, ru: "Выиграть партию", en: "Win a game" },
  { id: "wins2", metric: "wins", target: 2, xp: 40, ru: "Выиграть 2 партии", en: "Win 2 games" },
  { id: "mates1", metric: "mates", target: 1, xp: 30, ru: "Поставить мат", en: "Deliver checkmate" },
  { id: "long1", metric: "long", target: 1, xp: 20, ru: "Сыграть партию дольше 20 ходов", en: "Play a game longer than 20 moves" },
  { id: "black1", metric: "blackwin", target: 1, xp: 30, ru: "Выиграть чёрными", en: "Win as Black" },
  { id: "draw1", metric: "draws", target: 1, xp: 20, ru: "Сыграть вничью", en: "Draw a game" },
];

function rng(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Три задания дня: зависят только от даты, метрики не повторяются */
export function questsFor(day: string): Quest[] {
  const r = rng("chessbet-quests-" + day);
  const pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out: Quest[] = [];
  for (const q of pool) if (out.length < 3 && !out.some((x) => x.metric === q.metric)) out.push(q);
  return out;
}

// ---------- Учёт партии ----------
const getStats = (addr: string) => {
  db.prepare("INSERT OR IGNORE INTO q_stats(addr) VALUES(?)").run(addr);
  return db.prepare("SELECT * FROM q_stats WHERE addr=?").get(addr) as { addr: string; xp: number; streak: number; best: number; last_day: string; games: number; wins: number };
};
const isBanned = (addr: string) => !!(db.prepare("SELECT banned FROM users WHERE addr=?").get(addr) as { banned: number } | undefined)?.banned;

function applyGame(addr: string, opp: string, color: "w" | "b", i: FinishInfo) {
  const now = Date.now(), day = dayOf(now);
  if (isBanned(addr)) return;
  if ((db.prepare("SELECT COUNT(*) n FROM q_games WHERE addr=? AND day=?").get(addr, day) as { n: number }).n >= MAX_GAMES_DAY) return;
  if (opp && (db.prepare("SELECT COUNT(*) n FROM q_games WHERE addr=? AND day=? AND opp=?").get(addr, day, opp) as { n: number }).n >= MAX_PAIR_DAY) return;
  if (db.prepare("INSERT OR IGNORE INTO q_games(addr,room,day,opp,at) VALUES(?,?,?,?,?)").run(addr, i.id, day, opp, now).changes === 0) return; // эта партия уже учтена

  const win = i.winner === color, draw = i.winner === null;
  const st = getStats(addr);
  let xp = XP_GAME + (win ? XP_WIN : draw ? XP_DRAW : 0);
  const games = st.games + 1, wins = st.wins + (win ? 1 : 0);

  // задания дня
  const delta: Record<Metric, number> = {
    games: 1, wins: win ? 1 : 0, mates: win && i.reason === "checkmate" ? 1 : 0,
    long: i.plies >= 40 ? 1 : 0, blackwin: win && color === "b" ? 1 : 0, draws: draw ? 1 : 0,
  };
  const quests = questsFor(day);
  let completed = 0;
  for (const q of quests) {
    db.prepare("INSERT OR IGNORE INTO q_progress(addr,day,qid) VALUES(?,?,?)").run(addr, day, q.id);
    const row = db.prepare("SELECT progress,done FROM q_progress WHERE addr=? AND day=? AND qid=?").get(addr, day, q.id) as { progress: number; done: number };
    if (!row.done && delta[q.metric] > 0) {
      const p = Math.min(q.target, row.progress + delta[q.metric]);
      const done = p >= q.target ? 1 : 0;
      db.prepare("UPDATE q_progress SET progress=?, done=? WHERE addr=? AND day=? AND qid=?").run(p, done, addr, day, q.id);
      if (done) xp += q.xp;
    }
  }
  const all = db.prepare("SELECT COUNT(*) n FROM q_progress WHERE addr=? AND day=? AND done=1").get(addr, day) as { n: number };
  completed = all.n;
  if (completed >= quests.length) {
    // бонус один раз в день: отметка в q_badges не подходит (значок один навсегда), поэтому смотрим на q_games-журнал бонуса
    const key = "bonus-" + day;
    if (db.prepare("INSERT OR IGNORE INTO q_games(addr,room,day,opp,at) VALUES(?,?,?,?,?)").run(addr, key, "", "", now).changes > 0) xp += XP_ALL_QUESTS;
    giveBadge(addr, "allquests");
  }

  // серия дней: засчитывается, если за день выполнено хотя бы одно задание
  let streak = st.streak, lastDay = st.last_day;
  if (completed >= 1 && lastDay !== day) { streak = lastDay === prevDay(day) ? st.streak + 1 : 1; lastDay = day; }
  const best = Math.max(st.best, streak);
  db.prepare("UPDATE q_stats SET xp=xp+?, streak=?, best=?, last_day=?, games=?, wins=? WHERE addr=?").run(xp, streak, best, lastDay, games, wins, addr);

  // значки
  giveBadge(addr, "first_game");
  if (games >= 10) giveBadge(addr, "games10");
  if (games >= 100) giveBadge(addr, "games100");
  if (wins >= 1) giveBadge(addr, "first_win");
  if (wins >= 10) giveBadge(addr, "wins10");
  if (wins >= 50) giveBadge(addr, "wins50");
  if (win && i.reason === "checkmate") giveBadge(addr, "mate");
  if (streak >= 3) giveBadge(addr, "streak3");
  if (streak >= 7) giveBadge(addr, "streak7");
  if (streak >= 30) giveBadge(addr, "streak30");
}

/** Хук окончания партии (rooms.ts). Игроки без входа на сайте (адрес пустой) не учитываются */
export function recordGame(i: FinishInfo) {
  if (i.plies < MIN_PLIES) return;
  if (i.w && i.w === i.b) return; // сам с собой
  const tx = db.transaction(() => {
    if (i.w) applyGame(i.w, i.b, "w", i);
    if (i.b) applyGame(i.b, i.w, "b", i);
  });
  try { tx(); } catch (e) { console.error("quests recordGame", e); }
}

// ---------- API ----------
const badgesOf = (addr: string) =>
  (db.prepare("SELECT badge, at FROM q_badges WHERE addr=? ORDER BY at").all(addr) as { badge: string; at: number }[])
    .filter((b) => BADGES[b.badge]).map((b) => ({ id: b.badge, icon: BADGES[b.badge].icon, ru: BADGES[b.badge].ru, en: BADGES[b.badge].en, at: b.at }));

const statsOf = (addr: string) => {
  const s = (db.prepare("SELECT * FROM q_stats WHERE addr=?").get(addr) as ReturnType<typeof getStats> | undefined) ?? { xp: 0, streak: 0, best: 0, last_day: "", games: 0, wins: 0 };
  // серия «сгорела», если вчера и сегодня заданий не было
  const today = dayOf();
  const alive = s.last_day === today || s.last_day === prevDay(today);
  return { xp: s.xp, level: level(s.xp), nextXp: nextLevelXp(s.xp), streak: alive ? s.streak : 0, best: s.best, games: s.games, wins: s.wins, doneToday: s.last_day === today };
};

/** Маршруты GET /api/quests, /api/quests/stats?name=, /api/quests/top. viewer = кошелёк из токена входа или "" */
export async function handleQuests(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (p !== "/api/quests" && !p.startsWith("/api/quests/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (req.method !== "GET") return bad("method", 405);

  try {
    if (p === "/api/quests") {
      const day = dayOf();
      const prog = new Map<string, { progress: number; done: number }>();
      if (viewer) for (const r of db.prepare("SELECT qid,progress,done FROM q_progress WHERE addr=? AND day=?").all(viewer, day) as { qid: string; progress: number; done: number }[]) prog.set(r.qid, r);
      const quests = questsFor(day).map((q) => ({ id: q.id, ru: q.ru, en: q.en, target: q.target, xp: q.xp, progress: prog.get(q.id)?.progress ?? 0, done: !!prog.get(q.id)?.done }));
      return out(200, {
        ok: true, guest: !viewer, day, resetIn: Date.parse(day + "T00:00:00Z") + DAY_MS - Date.now(),
        quests, allDone: quests.every((q) => q.done), bonus: XP_ALL_QUESTS,
        stats: viewer ? statsOf(viewer) : null, badges: viewer ? badgesOf(viewer) : [],
      });
    }
    if (p === "/api/quests/stats") {
      const name = String(url.searchParams.get("name") || "").trim().slice(0, 40);
      const row = db.prepare("SELECT addr FROM users WHERE name=? AND banned=0").get(name) as { addr: string } | undefined;
      if (!row) return bad("not_found", 404);
      return out(200, { ok: true, stats: statsOf(row.addr), badges: badgesOf(row.addr) });
    }
    if (p === "/api/quests/top") {
      const rows = db.prepare(`SELECT u.name, u.avatar, s.xp, s.wins, s.games FROM q_stats s JOIN users u ON u.addr=s.addr
        WHERE u.banned=0 AND s.xp>0 ORDER BY s.xp DESC, s.wins DESC LIMIT 20`).all() as { name: string; avatar: string; xp: number; wins: number; games: number }[];
      return out(200, { ok: true, top: rows.map((r) => ({ name: r.name, avatar: r.avatar, xp: r.xp, level: level(r.xp), wins: r.wins, games: r.games })) });
    }
    return bad("not_found", 404);
  } catch (e) {
    console.error("quests", e);
    return bad("server", 500);
  }
}

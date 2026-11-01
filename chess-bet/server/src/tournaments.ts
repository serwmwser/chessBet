// Бесплатные турниры (арена): каждый час блиц 3 мин на 30 минут, в 18:00 UTC дневная арена 5 мин на 60 минут.
// Вход свободный, участвуют только вошедшие на сайте. Победа 2 очка, ничья 1. Награды: очки XP, значки и кубки (деньги не участвуют).
// Пары подбирает сервер каждые 3 секунды из тех, кто сейчас на странице турнира; партии идут в бесплатных комнатах (rooms.ts).
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";
import { createTourRoom, roomInfo, forceFinish } from "./rooms.js";
import type { FinishInfo } from "./rooms.js";
import { addXp, giveBadge } from "./quests.js";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS t_tour(
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, start INTEGER NOT NULL, end INTEGER NOT NULL, minutes INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'upcoming');
CREATE INDEX IF NOT EXISTS t_tour_start ON t_tour(start);
CREATE TABLE IF NOT EXISTS t_players(
  tid TEXT NOT NULL, addr TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
  joined INTEGER NOT NULL, last_seen INTEGER NOT NULL DEFAULT 0, gone INTEGER NOT NULL DEFAULT 0,
  cur_room TEXT NOT NULL DEFAULT '', cur_token TEXT NOT NULL DEFAULT '', cur_color TEXT NOT NULL DEFAULT '',
  last_opp TEXT NOT NULL DEFAULT '', whites INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(tid, addr));
CREATE TABLE IF NOT EXISTS t_games(
  room TEXT PRIMARY KEY, tid TEXT NOT NULL, w TEXT NOT NULL, b TEXT NOT NULL, started INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, result TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS t_games_tid ON t_games(tid, done);
`);

const HOUR = 3600_000, MIN = 60_000;
const PRESENCE_MS = 20_000; // игрок «ждёт пару», если его страница опрашивала сервер за последние 20 секунд
const NOSHOW_MS = 90_000; // не зашёл в партию за 90 секунд: партия отменяется, неявившийся выбывает из турнира
const ABANDON_MS = 120_000; // чей ход, тот не в комнате и молчит 2 минуты: поражение
const MIN_PLIES_SCORE = 10; // партия короче 5 ходов каждого (кроме мата) очков не приносит
const CUP_MIN_PLAYERS = 4; // кубки и значки призёров только если сыграли минимум 4 человека (по 2+ партии)
const JOIN_CLOSE_MS = 5 * MIN; // за 5 минут до конца вход закрывается

const KINDS = {
  blitz: { minutes: 3, durMin: 30, ru: "Блиц-арена · 3 мин", en: "Blitz Arena · 3 min" },
  daily: { minutes: 5, durMin: 60, ru: "Дневная арена · 5 мин", en: "Daily Arena · 5 min" },
} as const;
type Kind = keyof typeof KINDS;
type Tour = { id: string; kind: Kind; start: number; end: number; minutes: number; status: "upcoming" | "running" | "finishing" | "finished" | "cancelled" };
type PRow = { tid: string; addr: string; score: number; games: number; wins: number; joined: number; last_seen: number; gone: number; cur_room: string; cur_token: string; cur_color: string; last_opp: string; whites: number };
type GRow = { room: string; tid: string; w: string; b: string; started: number; done: number };

const slotId = (start: number) => "t" + new Date(start).toISOString().slice(0, 13).replace(/[-T]/g, "");
const kindAt = (start: number): Kind => (new Date(start).getUTCHours() === 18 ? "daily" : "blitz");

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

// ---------- Расписание ----------
function ensureSlots(now: number) {
  const h0 = Math.floor(now / HOUR) * HOUR;
  const ins = db.prepare("INSERT OR IGNORE INTO t_tour(id,kind,start,end,minutes,status) VALUES(?,?,?,?,?,'upcoming')");
  for (let k = 0; k <= 3; k++) {
    const start = h0 + k * HOUR;
    if (k === 0 && now - start > 5 * MIN) continue; // текущий час создаём, только если он только что начался
    const kind = kindAt(start);
    ins.run(slotId(start), kind, start, start + KINDS[kind].durMin * MIN, KINDS[kind].minutes);
  }
}

const setStatus = (id: string, s: Tour["status"]) => db.prepare("UPDATE t_tour SET status=? WHERE id=?").run(s, id);
const standingsRows = (tid: string) =>
  db.prepare("SELECT * FROM t_players WHERE tid=? ORDER BY score DESC, wins DESC, games ASC, joined ASC").all(tid) as PRow[];

// ---------- Результат партии ----------
function settle(room: string, winner: "w" | "b" | null, reason: string, plies: number) {
  const g = db.prepare("SELECT * FROM t_games WHERE room=?").get(room) as GRow | undefined;
  if (!g || g.done) return;
  const scored = reason !== "abort" && !(plies < MIN_PLIES_SCORE && reason !== "checkmate");
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare("UPDATE t_games SET done=1, result=? WHERE room=?").run(reason === "abort" ? "abort" : winner === "w" ? "1-0" : winner === "b" ? "0-1" : "1/2", room);
    for (const [addr, color] of [[g.w, "w"], [g.b, "b"]] as const) {
      const win = winner === color, draw = winner === null;
      db.prepare("UPDATE t_players SET cur_room='', cur_token='', cur_color='', last_seen=MAX(last_seen,?) WHERE tid=? AND addr=? AND cur_room=?").run(now, g.tid, addr, room);
      if (scored) db.prepare("UPDATE t_players SET score=score+?, games=games+1, wins=wins+? WHERE tid=? AND addr=?").run(win ? 2 : draw ? 1 : 0, win ? 1 : 0, g.tid, addr);
    }
  });
  try { tx(); } catch (e) { console.error("tournament settle", e); }
}

/** Хук окончания партии из rooms.ts. Для обычных комнат ничего не делает */
export function onGameFinished(i: FinishInfo) { settle(i.id, i.winner, i.reason, i.plies); }

// ---------- Подбор пар ----------
function pairTour(t: Tour, now: number) {
  const rows = db.prepare("SELECT * FROM t_players WHERE tid=? AND gone=0 AND cur_room='' AND last_seen>? ORDER BY score DESC, RANDOM()").all(t.id, now - PRESENCE_MS) as PRow[];
  const used = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    if (used.has(a.addr)) continue;
    const rest = rows.slice(i + 1).filter((x) => !used.has(x.addr));
    let b = rest.find((x) => x.addr !== a.last_opp && a.addr !== x.last_opp);
    if (!b && rest.length === 1) b = rest[0]; // остались только двое: играют повторно
    if (!b) continue;
    used.add(a.addr); used.add(b.addr);
    const [w, bl] = a.whites <= b.whites ? [a, b] : [b, a];
    const room = createTourRoom(w.addr, bl.addr, t.minutes);
    if (!room) return;
    db.transaction(() => {
      db.prepare("INSERT INTO t_games(room,tid,w,b,started) VALUES(?,?,?,?,?)").run(room.id, t.id, w.addr, bl.addr, now);
      db.prepare("UPDATE t_players SET cur_room=?, cur_token=?, cur_color='w', last_opp=?, whites=whites+1 WHERE tid=? AND addr=?").run(room.id, room.wToken, bl.addr, t.id, w.addr);
      db.prepare("UPDATE t_players SET cur_room=?, cur_token=?, cur_color='b', last_opp=? WHERE tid=? AND addr=?").run(room.id, room.bToken, w.addr, t.id, bl.addr);
    })();
  }
}

// ---------- Контроль партий (неявка, брошенная партия) ----------
function checkGames(now: number) {
  const games = db.prepare("SELECT g.* FROM t_games g JOIN t_tour t ON t.id=g.tid WHERE g.done=0 AND t.status IN ('running','finishing')").all() as GRow[];
  for (const g of games) {
    const info = roomInfo(g.room);
    if (!info) { settle(g.room, null, "abort", 0); continue; }
    if (info.over) { settle(g.room, info.winner, info.reason ?? "", info.plies); continue; }
    if (info.plies === 0 && now - g.started > NOSHOW_MS) {
      // неявка: выбывают те, кого нет в комнате; если оба на месте, но первый ход не сделан, выбывают белые
      const absent: string[] = [];
      if (!info.online.w) absent.push(g.w);
      if (!info.online.b) absent.push(g.b);
      if (absent.length === 0) absent.push(g.w);
      forceFinish(g.room, null, "abort");
      settle(g.room, null, "abort", 0);
      for (const a of absent) db.prepare("UPDATE t_players SET gone=1 WHERE tid=? AND addr=?").run(g.tid, a);
    } else if (info.plies > 0 && !info.online[info.turn] && now - info.touched > ABANDON_MS) {
      const winner = info.turn === "w" ? "b" : "w";
      forceFinish(g.room, winner, "forfeit");
      settle(g.room, winner, "forfeit", info.plies);
    }
  }
}

// ---------- Завершение турнира и награды ----------
function finalize(t: Tour) {
  const ps = standingsRows(t.id).filter((p) => p.games >= 1);
  const qualified = ps.filter((p) => p.games >= 2).length;
  for (const p of ps) { giveBadge(p.addr, "tour_first"); addXp(p.addr, 10); }
  if (qualified >= CUP_MIN_PLAYERS) {
    const cups: [string, number][] = [["cup1", 100], ["cup2", 60], ["cup3", 40]];
    cups.forEach(([badge, xp], i) => { const p = ps[i]; if (p && p.games >= 2) { giveBadge(p.addr, badge); addXp(p.addr, xp); } });
  }
  setStatus(t.id, "finished");
}

export function tournamentsTick(now = Date.now()) {
  ensureSlots(now);
  const tours = db.prepare("SELECT * FROM t_tour WHERE status IN ('upcoming','running','finishing')").all() as Tour[];
  for (const t of tours) {
    if (t.status === "upcoming" && now >= t.start) { setStatus(t.id, "running"); t.status = "running"; }
    if (t.status === "running") {
      const n = (db.prepare("SELECT COUNT(*) n FROM t_players WHERE tid=? AND gone=0").get(t.id) as { n: number }).n;
      const played = (db.prepare("SELECT COUNT(*) n FROM t_games WHERE tid=?").get(t.id) as { n: number }).n;
      if (now - t.start > 3 * MIN && n < 2 && played === 0) { setStatus(t.id, "cancelled"); continue; }
      if (now >= t.end) { setStatus(t.id, "finishing"); t.status = "finishing"; }
      else pairTour(t, now);
    }
  }
  checkGames(now);
  for (const t of tours) {
    if (t.status !== "finishing") continue;
    const active = (db.prepare("SELECT COUNT(*) n FROM t_games WHERE tid=? AND done=0").get(t.id) as { n: number }).n;
    if (active === 0 || now > t.end + (t.minutes * 2 + 6) * MIN) {
      if (active > 0) for (const g of db.prepare("SELECT room FROM t_games WHERE tid=? AND done=0").all(t.id) as { room: string }[]) { forceFinish(g.room, null, "abort"); settle(g.room, null, "abort", 0); }
      finalize(t);
    }
  }
}

let started = false;
/** Запуск планировщика (вызывается один раз из index.ts) */
export function startTournaments() {
  if (started) return;
  started = true;
  const run = () => { try { tournamentsTick(); } catch (e) { console.error("tournaments tick", e); } };
  run();
  setInterval(run, 3000).unref();
}

// ---------- API ----------
function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 2048) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

const userInfo = (addr: string) => {
  const r = db.prepare("SELECT name, avatar FROM users WHERE addr=?").get(addr) as { name: string; avatar: string } | undefined;
  return r ?? { name: "?", avatar: "" };
};

const tourOut = (t: Tour, viewer: string) => {
  const players = (db.prepare("SELECT COUNT(*) n FROM t_players WHERE tid=? AND gone=0").get(t.id) as { n: number }).n;
  const mine = viewer ? (db.prepare("SELECT gone FROM t_players WHERE tid=? AND addr=?").get(t.id, viewer) as { gone: number } | undefined) : undefined;
  return {
    id: t.id, kind: t.kind, ru: KINDS[t.kind].ru, en: KINDS[t.kind].en, start: t.start, end: t.end, minutes: t.minutes, status: t.status,
    players, registered: !!mine && !mine.gone,
  };
};

/** Маршруты /api/tournaments (GET), /api/tournaments/one?id= (GET), /api/tournaments/{join,leave,ping} (POST) */
export async function handleTournaments(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (p !== "/api/tournaments" && !p.startsWith("/api/tournaments/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  const getTour = (id: unknown) => db.prepare("SELECT * FROM t_tour WHERE id=?").get(String(id ?? "").slice(0, 20)) as Tour | undefined;

  try {
    if (req.method === "GET" && p === "/api/tournaments") {
      const live = (db.prepare("SELECT * FROM t_tour WHERE status IN ('upcoming','running','finishing') ORDER BY start").all() as Tour[]).map((t) => tourOut(t, viewer));
      const past = (db.prepare("SELECT * FROM t_tour WHERE status IN ('finished','cancelled') ORDER BY start DESC LIMIT 6").all() as Tour[]).map((t) => ({
        ...tourOut(t, viewer),
        top: t.status === "finished" ? standingsRows(t.id).filter((r) => r.games >= 1).slice(0, 3).map((r) => ({ ...userInfo(r.addr), score: r.score })) : [],
      }));
      return out(200, { ok: true, now: Date.now(), live, past });
    }

    if (req.method === "GET" && p === "/api/tournaments/one") {
      const t = getTour(url.searchParams.get("id"));
      if (!t) return bad("not_found", 404);
      const now = Date.now();
      const rows = standingsRows(t.id).filter((r) => !r.gone || r.games > 0);
      const standings = rows.slice(0, 100).map((r, i) => ({
        rank: i + 1, ...userInfo(r.addr), score: r.score, games: r.games, wins: r.wins, playing: !!r.cur_room, online: !!r.cur_room || r.last_seen > now - PRESENCE_MS, me: r.addr === viewer,
      }));
      const mine = viewer ? (db.prepare("SELECT * FROM t_players WHERE tid=? AND addr=?").get(t.id, viewer) as PRow | undefined) : undefined;
      return out(200, {
        ok: true, now, tour: tourOut(t, viewer), standings,
        me: mine ? { registered: !mine.gone, score: mine.score, games: mine.games, rank: rows.findIndex((r) => r.addr === viewer) + 1,
          current: mine.cur_room ? { room: mine.cur_room, token: mine.cur_token, color: mine.cur_color } : null } : null,
      });
    }

    if (req.method !== "POST") return bad("method", 405);
    if (!viewer) return bad("auth", 401);
    if (limited("t:" + viewer, 90, MIN)) return bad("rate_limit", 429);
    const body = await readBody(req);
    const t = getTour(body.id);
    if (!t) return bad("not_found", 404);
    const now = Date.now();

    if (p === "/api/tournaments/join") {
      if (!["upcoming", "running"].includes(t.status) || now > t.end - JOIN_CLOSE_MS) return bad("closed");
      if ((db.prepare("SELECT banned FROM users WHERE addr=?").get(viewer) as { banned: number } | undefined)?.banned) return bad("banned", 403);
      const ex = db.prepare("SELECT gone FROM t_players WHERE tid=? AND addr=?").get(t.id, viewer) as { gone: number } | undefined;
      if (!ex) db.prepare("INSERT INTO t_players(tid,addr,joined,last_seen) VALUES(?,?,?,?)").run(t.id, viewer, now, now);
      else if (ex.gone) db.prepare("UPDATE t_players SET gone=0, last_seen=? WHERE tid=? AND addr=?").run(now, t.id, viewer);
      return out(200, { ok: true });
    }
    if (p === "/api/tournaments/leave") {
      const row = db.prepare("SELECT cur_room FROM t_players WHERE tid=? AND addr=?").get(t.id, viewer) as { cur_room: string } | undefined;
      if (row?.cur_room) return bad("in_game");
      db.prepare("UPDATE t_players SET gone=1 WHERE tid=? AND addr=?").run(t.id, viewer);
      return out(200, { ok: true });
    }
    if (p === "/api/tournaments/ping") {
      // «я на странице турнира, жду пару»: сервер подбирает пары только из таких игроков
      const row = db.prepare("SELECT * FROM t_players WHERE tid=? AND addr=?").get(t.id, viewer) as PRow | undefined;
      if (!row || row.gone) return out(200, { ok: true, registered: false, status: t.status, current: null });
      db.prepare("UPDATE t_players SET last_seen=? WHERE tid=? AND addr=?").run(now, t.id, viewer);
      return out(200, {
        ok: true, registered: true, status: t.status, waiting: !row.cur_room && t.status === "running",
        current: row.cur_room ? { room: row.cur_room, token: row.cur_token, color: row.cur_color } : null,
      });
    }
    return bad("not_found", 404);
  } catch (e) {
    console.error("tournaments", e);
    return bad("server", 500);
  }
}

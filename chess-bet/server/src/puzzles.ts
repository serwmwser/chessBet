// Шахматные задачи (мат в 1, 2 и 3 хода): сервер сам проверяет ходы, отвечает за соперника и начисляет XP один раз за задачу.
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";
import { Chess, type Move } from "chess.js";
import { PUZZLES } from "./puzzles-data.js";
import { addXp } from "./quests.js";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS pz_solved(addr TEXT NOT NULL, id INTEGER NOT NULL, at INTEGER NOT NULL, errors INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(addr, id));
`);

const BASE_XP: Record<number, number> = { 1: 5, 2: 15, 3: 30 };
const LEVELS = [1, 2, 3];
const TTL = 3600_000;

/** Может ли сторона на ходу форсировать мат не позднее чем за n своих ходов */
function winning(ch: Chess, n: number): boolean {
  if (n <= 0) return false;
  for (const m of ch.moves({ verbose: true }) as Move[]) {
    ch.move(m);
    let ok: boolean;
    if (ch.isCheckmate()) ok = true;
    else if (ch.isGameOver() || n === 1) ok = false;
    else {
      ok = true;
      for (const r of ch.moves({ verbose: true }) as Move[]) {
        ch.move(r);
        const w = winning(ch, n - 1);
        ch.undo();
        if (!w) { ok = false; break; }
      }
    }
    ch.undo();
    if (ok) return true;
  }
  return false;
}

/** Выигрывающий ход (мат за n ходов) или null */
export function firstWinningMove(fen: string, n: number): { from: string; to: string; promotion?: string } | null {
  const ch = new Chess(fen);
  for (const m of ch.moves({ verbose: true }) as Move[]) {
    if (isWinningMove(ch, m, n)) return { from: m.from, to: m.to, promotion: m.promotion };
  }
  return null;
}

function isWinningMove(ch: Chess, m: Move, n: number): boolean {
  ch.move(m);
  let ok: boolean;
  if (ch.isCheckmate()) ok = true;
  else if (ch.isGameOver() || n <= 1) ok = false;
  else {
    ok = true;
    for (const r of ch.moves({ verbose: true }) as Move[]) {
      ch.move(r);
      const w = winning(ch, n - 1);
      ch.undo();
      if (!w) { ok = false; break; }
    }
  }
  ch.undo();
  return ok;
}

/** Ответ соперника: самый упорный (мат придётся ставить дольше всего) */
function defenderReply(ch: Chess, left: number): Move | null {
  let best: Move | null = null, bestK = -1;
  for (const r of ch.moves({ verbose: true }) as Move[]) {
    ch.move(r);
    let k = 1;
    while (k < left && !winning(ch, k)) k++;
    ch.undo();
    if (k > bestK) { bestK = k; best = r; }
  }
  return best;
}

/** Первый ход задач на мат в 3 хода: решения заранее записаны в базе (перебор на сервере занял бы секунды) */
const firstMoves = (id: number): string[] | null => (PUZZLES[id - 1]?.[0] === 3 ? PUZZLES[id - 1][2] ?? null : null);
const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion || "");

type Attempt = { id: number; fen: string; left: number; errors: number; hinted: boolean; at: number };
const attempts = new Map<string, Attempt>();

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 4096) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

const total = (lvl: number) => PUZZLES.filter((p) => p[0] === lvl).length;

/** Маршруты /api/puzzles/*. viewer = адрес из токена входа или "" */
export async function handlePuzzles(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/puzzles/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (!viewer) return bad("auth", 401);
  const me = viewer;

  try {
    if (req.method === "GET" && p === "/api/puzzles/stats") {
      const rows = db.prepare("SELECT id, xp FROM pz_solved WHERE addr=?").all(me) as { id: number; xp: number }[];
      const by: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      for (const r of rows) { const lv = PUZZLES[r.id - 1]?.[0]; if (lv) by[lv]++; }
      return out(200, { ok: true, levels: LEVELS.map((l) => ({ level: l, solved: by[l], total: total(l), xp: BASE_XP[l] })), xp: rows.reduce((s, r) => s + r.xp, 0) });
    }

    if (req.method === "GET" && p === "/api/puzzles/next") {
      if (limited("pzn:" + me, 60, 60000)) return bad("slow_down", 429);
      const q = Number(url.searchParams.get("level"));
      const lvl = q === 3 ? 3 : q === 2 ? 2 : 1;
      const skip = Number(url.searchParams.get("skip")) || 0;
      const done = new Set((db.prepare("SELECT id FROM pz_solved WHERE addr=?").all(me) as { id: number }[]).map((r) => r.id));
      const all = PUZZLES.map((x, i) => ({ id: i + 1, lvl: x[0], fen: x[1] })).filter((x) => x.lvl === lvl && x.id !== skip);
      const fresh = all.filter((x) => !done.has(x.id));
      const pool = fresh.length ? fresh : all;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!pick) return bad("empty", 404);
      attempts.set(me, { id: pick.id, fen: pick.fen, left: pick.lvl, errors: 0, hinted: false, at: Date.now() });
      if (attempts.size > 5000) for (const [k, a] of attempts) if (Date.now() - a.at > TTL) attempts.delete(k);
      return out(200, { ok: true, id: pick.id, level: pick.lvl, fen: pick.fen, turn: pick.fen.split(" ")[1], moves: pick.lvl, replay: !fresh.length });
    }

    if (req.method !== "POST") return bad("method", 405);
    const m = await readBody(req);
    const id = Math.floor(Number(m.id));
    const a = attempts.get(me);
    if (!a || a.id !== id || Date.now() - a.at > TTL) return bad("no_attempt", 409);
    if (limited("pzm:" + me, 120, 60000)) return bad("slow_down", 429);

    if (p === "/api/puzzles/hint") {
      a.hinted = true;
      const fm = a.left === 3 ? firstMoves(a.id) : null;
      if (fm?.length) return out(200, { ok: true, from: fm[0].slice(0, 2) });
      const w = firstWinningMove(a.fen, a.left);
      return w ? out(200, { ok: true, from: w.from }) : bad("no_hint", 404);
    }

    if (p === "/api/puzzles/move") {
      const from = String(m.from ?? ""), to = String(m.to ?? "");
      const promo = String(m.promotion ?? "").toLowerCase();
      if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return bad("bad_move");
      const ch = new Chess(a.fen);
      let mv: Move | undefined;
      try { mv = ch.moves({ verbose: true }).find((x) => x.from === from && x.to === to && (!x.promotion || x.promotion === (/^[qrbn]$/.test(promo) ? promo : "q"))); } catch { mv = undefined; }
      if (!mv) return bad("illegal");
      const fm = a.left === 3 ? firstMoves(a.id) : null;
      const right = fm ? fm.includes(uci(mv)) : isWinningMove(ch, mv, a.left);
      if (!right) {
        a.errors++; a.at = Date.now();
        return out(200, { ok: true, status: "wrong", errors: a.errors, fen: a.fen });
      }
      ch.move(mv);
      if (ch.isCheckmate()) {
        const lvl = PUZZLES[a.id - 1][0];
        let gained = 0;
        if (!a.hinted) {
          const base = BASE_XP[lvl] ?? 5;
          const xp = a.errors <= 2 ? base : Math.max(1, Math.floor(base / 2));
          const ins = db.prepare("INSERT OR IGNORE INTO pz_solved(addr,id,at,errors,xp) VALUES(?,?,?,?,?)").run(me, a.id, Date.now(), a.errors, xp);
          if (ins.changes > 0) { gained = xp; addXp(me, xp); }
        }
        attempts.delete(me);
        return out(200, { ok: true, status: "solved", san: mv.san, fen: ch.fen(), xp: gained, hinted: a.hinted, errors: a.errors });
      }
      const reply = defenderReply(ch, a.left - 1);
      if (!reply) { attempts.delete(me); return bad("server", 500); }
      ch.move(reply);
      a.fen = ch.fen(); a.left -= 1; a.at = Date.now();
      return out(200, { ok: true, status: "continue", san: mv.san, reply: { from: reply.from, to: reply.to, san: reply.san }, fen: a.fen, left: a.left });
    }
    return bad("not_found", 404);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "too_big") return bad("too_big", 413);
    if (msg === "bad_json") return bad("bad_json");
    console.error("puzzles", e);
    return bad("server", 500);
  }
}

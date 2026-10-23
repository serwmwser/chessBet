"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Chess } from "chess.js";
import { canMate, PAUSE_MS, PAUSES_TOTAL } from "./rules";

/**
 * Партия с ботом живёт здесь, вне React-компонентов: она не теряется при переходе на другие вкладки,
 * часы и бот продолжают работать в фоне. Состояние дублируется в localStorage (перезагрузка страницы).
 */
export type Res = { kind: "win" | "lose" | "draw"; why: "chk" | "time" | "timeDraw" | "res" | "pause" | "" };
export type BotState = {
  chess: Chess; w: number; b: number; last: number; over: boolean; playing: boolean; me: "w" | "b";
  level: number; minutes: number; sid: number; askedAt: number; thinking: boolean;
  pausesLeft: { w: number; b: number }; pause: { color: "w" | "b"; until: number } | null; res: Res | null;
};

/** Хранилище партии с ботом. У каждого экземпляра своя партия и свой ключ в localStorage (обычная вкладка «Бот» и мультяшная — отдельно). */
export function makeBot(KEY: string) {
  const SKILL = [0, 3, 5, 8, 11, 14, 17, 20];
  const MOVETIME = [100, 150, 250, 400, 600, 800, 1000, 1500];
  /** Бот отвечает не раньше чем через 2 секунды после хода игрока */
  const BOT_DELAY = 2000;
  /** Если бот завис: через 5 с перезапускаем движок, через 10 с делаем запасной ход — первый ход бота не позже 10 секунд */
  const BOT_RETRY = 5000, BOT_MAX = 10000;
  let retried = false;
  const fresh = (): BotState => ({
    chess: new Chess(), w: 0, b: 0, last: 0, over: false, playing: false, me: "w", level: 3, minutes: 15, sid: 0, askedAt: 0, thinking: false,
    pausesLeft: { w: PAUSES_TOTAL, b: PAUSES_TOTAL }, pause: null, res: null,
  });
  let st: BotState = fresh();
  let version = 0;
  let inited = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let worker: Worker | null = null;
  const subs = new Set<() => void>();
  const emit = () => { version++; subs.forEach((f) => f()); };

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        pgn: st.chess.pgn(), w: st.w, b: st.b, me: st.me, level: st.level, minutes: st.minutes, playing: st.playing, over: st.over,
        pausesLeft: st.pausesLeft, pause: st.pause, res: st.res, savedAt: Date.now(),
      }));
    } catch { /* хранилище недоступно */ }
  }

  function stopLoop() { if (timer) { clearInterval(timer); timer = null; } }
  function startLoop() { if (!timer) timer = setInterval(tick, 200); }

  function end(res: Res) {
    if (st.over) return;
    st.over = true; st.playing = false; st.thinking = false; st.pause = null; st.res = res;
    stopLoop(); persist(); emit();
  }
  const win = (winner: "w" | "b" | null, why: Res["why"]): Res => ({ kind: winner === null ? "draw" : winner === st.me ? "win" : "lose", why });

  function checkEnd() {
    const c = st.chess;
    if (c.isCheckmate()) end(win(c.turn() === "w" ? "b" : "w", "chk"));
    else if (c.isDraw() || c.isStalemate() || c.isInsufficientMaterial()) end(win(null, ""));
  }
  /** Просрочка времени: победа соперника, а если он не может поставить мат — ничья */
  function flag(loser: "w" | "b") {
    const winner = loser === "w" ? "b" : "w";
    if (!canMate(st.chess, winner)) end(win(null, "timeDraw"));
    else end(win(winner, "time"));
  }

  function ensureWorker() {
    if (worker) return;
    try { worker = new Worker(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/stockfish.js`); } catch { return; }
    worker.postMessage("uci");
    worker.onerror = () => { worker = null; };
    worker.onmessage = (ev) => {
      const line = String(ev.data);
      if (!line.startsWith("bestmove")) return;
      const s0 = st;
      const mv = line.split(" ")[1];
      if (!s0.playing || s0.over || !mv || mv === "(none)") return;
      const sid = s0.sid, ply = s0.chess.history().length;
      // ждём, пока с момента хода игрока пройдёт BOT_DELAY (часы бота при этом идут)
      const wait = Math.max(0, BOT_DELAY - (Date.now() - s0.askedAt));
      setTimeout(() => {
        const s = st;
        if (s.sid !== sid || !s.playing || s.over || s.pause || s.chess.history().length !== ply) return;
        const now = Date.now(), side = s.chess.turn();
        if (s.chess.history().length > 0) s[side] -= now - s.last; // первый ход белых время не расходует
        s.last = now;
        try { s.chess.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] }); } catch { return; }
        s.thinking = false;
        checkEnd();
        persist(); emit();
      }, wait);
    };
  }
  function askBot() {
    const s = st;
    if (s.over || s.pause) return;
    ensureWorker();
    if (!worker) return;
    s.askedAt = Date.now(); s.thinking = true; retried = false;
    sendToEngine(MOVETIME[s.level - 1]);
  }
  function sendToEngine(ms: number) {
    const s = st;
    if (!worker) return;
    worker.postMessage("stop");
    worker.postMessage(`setoption name Skill Level value ${SKILL[s.level - 1]}`);
    worker.postMessage(`position fen ${s.chess.fen()}`);
    worker.postMessage(`go movetime ${ms}`);
  }
  /** Сторожок: движок молчит слишком долго */
  function watchdog(now: number) {
    const s = st;
    if (!s.thinking || s.chess.turn() === s.me || s.pause) return;
    const waited = now - s.askedAt;
    if (waited > BOT_RETRY && !retried) {
      retried = true;
      try { worker?.terminate(); } catch { /* уже закрыт */ }
      worker = null;
      ensureWorker();
      sendToEngine(300);
    } else if (waited > BOT_MAX) {
      const moves = s.chess.moves({ verbose: true });
      if (!moves.length) return;
      const caps = moves.filter((m) => m.captured);
      const pool = caps.length ? caps : moves;
      const m = pool[Math.floor(Math.random() * pool.length)];
      if (s.chess.history().length > 0) s[s.chess.turn()] -= now - s.last;
      s.last = now;
      try { s.chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { return; }
      s.thinking = false;
      checkEnd(); persist(); emit();
    }
  }

  function tick() {
    const s = st;
    if (!s.playing || s.over) return;
    const now = Date.now();
    if (s.pause) { // идёт пауза: основные часы заморожены, считается только таймер паузы
      if (now >= s.pause.until) end({ kind: "lose", why: "pause" }); else emit();
      return;
    }
    watchdog(now);
    if (s.over) return;
    if (s.chess.history().length === 0) { s.last = now; return; } // часы стоят до первого хода белых
    const side = s.chess.turn();
    s[side] -= now - s.last; s.last = now;
    if (s[side] <= 0) { s[side] = 0; flag(side); return; }
    emit();
  }

  /** Восстановление после перезагрузки страницы: время, прошедшее в закрытой вкладке, тоже считается */
  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      const chess = new Chess();
      if (d.pgn) chess.loadPgn(d.pgn);
      const s = fresh();
      Object.assign(s, {
        chess, w: d.w, b: d.b, me: d.me, level: d.level, minutes: d.minutes, playing: !!d.playing, over: !!d.over,
        pausesLeft: d.pausesLeft ?? s.pausesLeft, pause: d.pause ?? null, res: d.res ?? null, last: Date.now(), sid: 1,
      });
      st = s;
      if (!s.playing || s.over) return;
      const gone = Date.now() - Number(d.savedAt || Date.now());
      if (!s.pause && chess.history().length > 0) {
        const side = chess.turn();
        s[side] -= gone;
        if (s[side] <= 0) { s[side] = 0; flag(side); return; }
      }
      if (s.pause && Date.now() >= s.pause.until) { end({ kind: "lose", why: "pause" }); return; }
      startLoop();
      if (!s.pause && chess.turn() !== s.me) askBot();
    } catch { /* повреждённое сохранение игнорируем */ }
  }
  function init() {
    if (inited) return;
    inited = true;
    restore();
    emit();
  }

  // ---------- действия ----------
  function startBot(minutes: number, level: number, pick: "w" | "b" | "r") {
    const me = pick === "r" ? (Math.random() < 0.5 ? "w" : "b") : pick;
    const ms = minutes * 60_000;
    st = {
      ...fresh(), w: ms, b: ms, last: Date.now(), me, level, minutes, playing: true, sid: st.sid + 1,
    };
    startLoop(); persist(); emit();
    if (me === "b") askBot();
  }
  function botMove(from: string, to: string, promotion?: string) {
    const s = st;
    if (!s.playing || s.over || s.pause || s.chess.turn() !== s.me) return;
    const now = Date.now();
    if (s.chess.history().length > 0) s[s.me] -= now - s.last; // первый ход белых время не расходует
    s.last = now;
    try { s.chess.move({ from, to, promotion }); } catch { return; }
    checkEnd();
    persist(); emit();
    if (!st.over) askBot();
  }
  function botResign() { end({ kind: "lose", why: "res" }); }
  /** Пауза: только в свой ход, после первого хода, не больше двух за партию */
  function botPause(): boolean {
    const s = st;
    if (!s.playing || s.over || s.pause || s.chess.turn() !== s.me || s.chess.history().length === 0 || s.pausesLeft[s.me] <= 0) return false;
    const now = Date.now();
    s[s.me] -= now - s.last; s.last = now;
    if (s[s.me] <= 0) { s[s.me] = 0; flag(s.me); return false; }
    s.pausesLeft = { ...s.pausesLeft, [s.me]: s.pausesLeft[s.me] - 1 };
    s.pause = { color: s.me, until: now + PAUSE_MS };
    persist(); emit();
    return true;
  }
  function botResume() {
    const s = st;
    if (!s.pause) return;
    s.pause = null; s.last = Date.now();
    persist(); emit();
  }
  /** К экрану выбора настроек новой партии */
  function botReset() {
    st = { ...fresh(), sid: st.sid + 1, level: st.level, minutes: st.minutes };
    stopLoop(); persist(); emit();
  }

  // ---------- подписка React ----------
  const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
  /** Текущее состояние партии с ботом; компонент перерисовывается при каждом изменении */
  function useBot(): BotState {
    useEffect(init, []);
    useSyncExternalStore(subscribe, () => version, () => 0);
    return st;
  }
  /** Идёт ли партия с ботом — для значка на вкладке (перерисовка только при смене значения) */
  function useBotActive(): boolean {
    useEffect(init, []);
    return useSyncExternalStore(subscribe, () => st.playing && !st.over, () => false);
  }

  return { startBot, botMove, botResign, botPause, botResume, botReset, useBot, useBotActive };
}

export type BotApi = ReturnType<typeof makeBot>;
export const mainBot: BotApi = makeBot("chessbet.bot.v1");
export const cartoonBot: BotApi = makeBot("chessbet.cbot.v1");
export const { startBot, botMove, botResign, botPause, botResume, botReset, useBot, useBotActive } = mainBot;

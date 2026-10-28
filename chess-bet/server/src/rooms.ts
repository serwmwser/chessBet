import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { Chess } from "chess.js";

// Бесплатные комнаты «партия с другом по ссылке»: без кошелька, без ставок и без блокчейна.
// Возможности как в партии на токены: часы, ничья, сдача, чат, паузы, реванш. Подключение: ws(s)://хост/room
// Комнаты хранятся на диске и переживают перезапуск сервера.

type Color = "w" | "b";
type Who = Color | "s"; // s — зритель
type ChatMsg = { from: Color; text: string; at: number };
type Room = {
  id: string;
  tokens: { w?: string; b?: string }; // секреты мест: по ним игрок возвращается в партию после обрыва связи
  chess: Chess;
  over: boolean;
  reason: string | null;
  winner: Color | null;
  drawOffer: Color | null;
  socks: Map<WebSocket, Who>;
  touched: number;
  limit: number; // время на партию каждому игроку, мс
  clock: { w: number; b: number }; // остаток времени на момент last
  last: number; // когда начался текущий ход
  chat: ChatMsg[];
  pause: { by: Color; until: number } | null; // пауза: часы заморожены, до автопоражения until
  pausesLeft: { w: number; b: number };
  rematch: Color | null; // кто предложил реванш
  next: string | null; // номер комнаты реванша, когда оба согласились
  hold: number | null; // ожидание: соперник сделал ход, а тот, чей ход, не в комнате; его часы стоят (время начала ожидания)
};

const MAX_ROOMS = 3000;
const IDLE_MS = 48 * 3600_000; // комната без действий живёт 48 часов
const DONE_MS = 6 * 3600_000; // оконченная партия остаётся ещё 6 часов
const CREATE_PER_HOUR = 20; // новых комнат в час с одного адреса
const DEFAULT_MIN = 60; // время на партию по умолчанию, минут (каждому игроку)
const MAX_MIN = 180;
const PAUSES = 2; // пауз на игрока, как в партии на токены
const PAUSE_MS = 5 * 60_000; // длина паузы: не вернулся за 5 минут, значит поражение
const HOLD_MAX_MS = 72 * 3600_000; // игрок не заходил в комнату 72 часа после хода соперника: после первого хода отмена, позже поражение

export const roomsWss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const rooms = new Map<string, Room>();
const created = new Map<string, number[]>();
const lastChat = new WeakMap<WebSocket, number>();

// комнаты сохраняются на диск и переживают перезапуск сервера (обновление, перезагрузка VPS)
const ROOMS_FILE = process.env.ROOMS_FILE || "./data/rooms.json";
function saveRooms() {
  try {
    const now = Date.now();
    const out = [...rooms.values()].map((r) => ({
      id: r.id, tokens: r.tokens, moves: r.chess.history(), over: r.over, reason: r.reason, winner: r.winner, drawOffer: r.drawOffer,
      touched: r.touched, limit: r.limit, clock: remaining(r),
      chat: r.chat.slice(-100), pauseBy: r.pause?.by ?? null, pauseLeft: r.pause ? Math.max(0, r.pause.until - now) : 0,
      pausesLeft: r.pausesLeft, rematch: r.rematch, next: r.next, hold: r.hold,
    }));
    fs.mkdirSync(path.dirname(ROOMS_FILE), { recursive: true });
    fs.writeFileSync(ROOMS_FILE + ".tmp", JSON.stringify(out));
    fs.renameSync(ROOMS_FILE + ".tmp", ROOMS_FILE);
  } catch (e) { console.error("rooms save failed", e); }
}
function loadRooms() {
  try {
    const arr = JSON.parse(fs.readFileSync(ROOMS_FILE, "utf8")) as any[];
    const now = Date.now();
    for (const o of arr) {
      if (!o || typeof o.id !== "string" || !/^[0-9a-f]{10}$/.test(o.id)) continue;
      const chess = new Chess();
      let ok = true;
      for (const m of Array.isArray(o.moves) ? o.moves : []) { try { chess.move(String(m)); } catch { ok = false; break; } }
      if (!ok) continue;
      // время простоя сервера не списываем с часов: отсчёт хода начинается заново
      rooms.set(o.id, {
        id: o.id, tokens: o.tokens ?? {}, chess, over: !!o.over, reason: o.reason ?? null, winner: o.winner ?? null, drawOffer: o.drawOffer ?? null,
        socks: new Map(), touched: Number(o.touched) || now, limit: Number(o.limit) || DEFAULT_MIN * 60_000,
        clock: { w: Number(o.clock?.w) || 0, b: Number(o.clock?.b) || 0 }, last: now,
        chat: Array.isArray(o.chat) ? o.chat.filter((c: any) => c && typeof c.text === "string").slice(-100) : [],
        pause: o.pauseBy === "w" || o.pauseBy === "b" ? { by: o.pauseBy, until: now + (Number(o.pauseLeft) || 0) } : null,
        pausesLeft: { w: Number(o.pausesLeft?.w ?? PAUSES), b: Number(o.pausesLeft?.b ?? PAUSES) },
        rematch: o.rematch === "w" || o.rematch === "b" ? o.rematch : null,
        next: typeof o.next === "string" ? o.next : null,
        hold: Number(o.hold) > 0 ? Number(o.hold) : null,
      });
    }
    console.log("rooms restored:", rooms.size);
  } catch { /* файла ещё нет */ }
}

const newToken = () => crypto.randomBytes(16).toString("hex");
const ipOf = (req: http.IncomingMessage) => {
  const f = String(req.headers["x-forwarded-for"] ?? "").split(",").pop()?.trim();
  return f || req.socket.remoteAddress || "?";
};

/** Часы идут после первого хода белых, только у того, чей ход, и не на паузе */
const running = (r: Room) => !r.over && !r.pause && !r.hold && r.chess.history().length > 0;
function remaining(r: Room, now = Date.now()) {
  const used = running(r) ? now - r.last : 0;
  const t = r.chess.turn();
  return { w: Math.max(0, r.clock.w - (t === "w" ? used : 0)), b: Math.max(0, r.clock.b - (t === "b" ? used : 0)) };
}
function state(r: Room, withChat = true) {
  const h = r.chess.history({ verbose: true });
  const lm = h[h.length - 1];
  const on = (c: Color) => [...r.socks.values()].includes(c);
  const now = Date.now();
  return {
    t: "state", id: r.id, fen: r.chess.fen(), history: h.map((x) => x.san), lastMove: lm ? { from: lm.from, to: lm.to } : null,
    turn: r.chess.turn(), over: r.over, reason: r.reason, winner: r.winner, drawOffer: r.drawOffer,
    seats: { w: !!r.tokens.w, b: !!r.tokens.b }, online: { w: on("w"), b: on("b") },
    watchers: [...r.socks.values()].filter((x) => x === "s").length,
    limit: r.limit, clock: remaining(r), running: running(r),
    pause: r.pause ? { by: r.pause.by, left: Math.max(0, r.pause.until - now) } : null, pausesLeft: r.pausesLeft, hold: r.hold ?? null,
    chat: withChat ? r.chat.slice(-50) : [], rematch: r.rematch,
  };
}
/** Чат видят только двое игроков, зрителям он не отправляется */
function broadcast(r: Room) {
  const full = JSON.stringify(state(r, true));
  const lite = JSON.stringify(state(r, false));
  for (const [ws, who] of r.socks) if (ws.readyState === WebSocket.OPEN) ws.send(who === "s" ? lite : full);
}
function finish(r: Room, winner: Color | null, reason: string) {
  if (running(r)) { const t = r.chess.turn(); r.clock[t] = Math.max(0, r.clock[t] - (Date.now() - r.last)); } // замораживаем часы
  r.over = true; r.winner = winner; r.reason = reason; r.drawOffer = null; r.pause = null; r.hold = null;
}
/** Конец партии по правилам шахмат (мат, пат, нехватка материала, повтор, 50 ходов) */
function checkEnd(r: Room) {
  const c = r.chess;
  if (c.isCheckmate()) return finish(r, c.turn() === "w" ? "b" : "w", "checkmate");
  if (c.isStalemate()) return finish(r, null, "stalemate");
  if (c.isInsufficientMaterial()) return finish(r, null, "insufficient");
  if (c.isThreefoldRepetition()) return finish(r, null, "repetition");
  if (c.isDraw()) return finish(r, null, "fifty");
}

loadRooms();
setInterval(saveRooms, Number(process.env.ROOMS_SAVE_MS) || 5000).unref();
for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => { saveRooms(); process.exit(0); });

// раз в секунду проверяем, не кончилось ли у кого-то время и не истекла ли пауза
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.over) continue;
    if (r.pause) {
      if (now >= r.pause.until) { finish(r, r.pause.by === "w" ? "b" : "w", "pause_timeout"); broadcast(r); }
      continue;
    }
    if (r.hold) {
      // игрок не заходил после хода соперника: часы стоят; не зашёл за 72 часа → после первого хода отмена, позже поражение
      if (now - r.hold > HOLD_MAX_MS) { if (r.chess.history().length <= 1) finish(r, null, "abort"); else { const t = r.chess.turn(); finish(r, t === "w" ? "b" : "w", "timeout"); } broadcast(r); }
      continue;
    }
    if (!running(r)) continue;
    const t = r.chess.turn();
    if (remaining(r, now)[t] <= 0) { finish(r, t === "w" ? "b" : "w", "timeout"); broadcast(r); }
  }
}, 1000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) if (now - r.touched > (r.over ? DONE_MS : r.hold ? HOLD_MAX_MS + 3600_000 : IDLE_MS)) rooms.delete(id);
  for (const [ip, list] of created) { const l = list.filter((t) => now - t < 3600_000); if (l.length) created.set(ip, l); else created.delete(ip); }
}, 600_000).unref();

// «пульс» раз в 25 секунд: мёртвые соединения (телефон уснул, сеть пропала) закрываются, а живые не обрываются прокси
const alive = new WeakSet<WebSocket>();
setInterval(() => {
  for (const c of roomsWss.clients) {
    if (!alive.has(c)) { c.terminate(); continue; }
    alive.delete(c);
    try { c.ping(); } catch { /* соединение уже закрыто */ }
  }
}, 25_000).unref();

function newRoom(color: Color, mins: number, now: number): Room {
  const ms = mins * 60_000;
  return { id: crypto.randomBytes(5).toString("hex"), tokens: {}, chess: new Chess(), over: false, reason: null, winner: null, drawOffer: null, socks: new Map(), touched: now,
    limit: ms, clock: { w: ms, b: ms }, last: now, chat: [], pause: null, pausesLeft: { w: PAUSES, b: PAUSES }, rematch: null, next: null, hold: null };
}

roomsWss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = ipOf(req);
  alive.add(ws);
  ws.on("pong", () => alive.add(ws));
  ws.on("error", () => { /* ошибка одного соединения не должна ронять весь сервер */ });
  let room: Room | undefined;
  let who: Who = "s";
  let win = Date.now(), n = 0;
  const send = (o: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  const err = (m: string) => send({ t: "error", message: m });
  const leave = () => { if (room) { room.socks.delete(ws); broadcast(room); room = undefined; } };

  const enter = (r: Room, w: Who, token?: string) => {
    leave();
    room = r; who = w; r.socks.set(ws, w); r.touched = Date.now();
    send({ t: "seat", id: r.id, color: w, token });
    // игрок вернулся в старую комнату, а реванш уже согласован: переводим его в новую
    if (r.next && (w === "w" || w === "b")) {
      const nx = rooms.get(r.next);
      const tok = nx?.tokens[w === "w" ? "b" : "w"]; // цвета в реванше меняются местами
      if (nx && tok) send({ t: "rematch_go", id: nx.id, token: tok });
    }
    // игрок, чей ход, вернулся в комнату: его часы начинают идти с этого момента
    if (r.hold && !r.over && w === r.chess.turn()) { r.hold = null; r.last = Date.now(); }
    broadcast(r);
  };

  ws.on("close", leave);
  ws.on("message", (raw) => {
    const now = Date.now();
    if (now - win > 1000) { win = now; n = 0; }
    if (++n > 15) return err("rate_limit");
    let m: any;
    try { m = JSON.parse(raw.toString()); } catch { return err("bad_json"); }

    if (m.t === "create") {
      if (rooms.size >= MAX_ROOMS) return err("busy");
      const list = (created.get(ip) ?? []).filter((t) => now - t < 3600_000);
      if (list.length >= CREATE_PER_HOUR) return err("too_many_rooms");
      list.push(now); created.set(ip, list);
      const color: Color = m.color === "w" || m.color === "b" ? m.color : Math.random() < 0.5 ? "w" : "b";
      const mins = Math.min(MAX_MIN, Math.max(1, Math.round(Number(m.minutes) || DEFAULT_MIN)));
      const r = newRoom(color, mins, now);
      const token = newToken();
      r.tokens[color] = token;
      rooms.set(r.id, r);
      return enter(r, color, token);
    }
    if (m.t === "join") {
      const id = String(m.id ?? "");
      const r = /^[0-9a-f]{10}$/.test(id) ? rooms.get(id) : undefined;
      if (!r) return err("room_not_found");
      const tok = typeof m.token === "string" ? m.token : "";
      if (tok && tok === r.tokens.w) return enter(r, "w");
      if (tok && tok === r.tokens.b) return enter(r, "b");
      const free: Color | null = !r.tokens.w ? "w" : !r.tokens.b ? "b" : null;
      if (free) { const token = newToken(); r.tokens[free] = token; return enter(r, free, token); }
      return enter(r, "s");
    }
    if (!room) return err("no_room");
    const r = room;
    if (m.t === "sync") return send(state(r, who !== "s")); // клиент после пробуждения просит свежее состояние
    if (who === "s") return err("not_player");
    r.touched = now;
    const me: Color = who;

    if (m.t === "chat") {
      // чат партии: только двое игроков, до 200 символов, без ссылок, не чаще раза в секунду; работает и после конца партии
      const text = String(m.text ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      if (!text || /https?:\/\/|www\./i.test(text)) return err("bad_chat");
      if (now - (lastChat.get(ws) ?? 0) < 1000) return err("rate_limit");
      lastChat.set(ws, now);
      r.chat.push({ from: me, text, at: now });
      if (r.chat.length > 100) r.chat.shift();
      return broadcast(r);
    }
    if (m.t === "rematch") {
      // реванш: когда оба игрока согласны, создаётся новая комната с обмененными цветами и те же часы
      if (!r.over) return err("not_over");
      if (r.next) return;
      if (!r.rematch || r.rematch === me) { r.rematch = me; return broadcast(r); }
      if (rooms.size >= MAX_ROOMS) return err("busy");
      const nx = newRoom("w", Math.round(r.limit / 60_000), now);
      nx.tokens.w = newToken(); nx.tokens.b = newToken(); // белые в реванше: кто играл чёрными
      rooms.set(nx.id, nx);
      r.next = nx.id;
      for (const [s, w] of r.socks) {
        if (w === "s" || s.readyState !== WebSocket.OPEN) continue;
        s.send(JSON.stringify({ t: "rematch_go", id: nx.id, token: w === "w" ? nx.tokens.b : nx.tokens.w }));
      }
      return broadcast(r);
    }
    if (m.t === "resign") { if (!r.over) { finish(r, me === "w" ? "b" : "w", "resign"); broadcast(r); } return; }
    if (r.over) return err("game_over");

    if (m.t === "pause") {
      // только в свой ход, после первого хода, не больше двух раз за партию
      if (r.pause) return err("already_paused");
      const turn = r.chess.turn();
      if (turn !== me) return err("not_your_turn");
      if (r.chess.history().length === 0) return err("not_started");
      if (r.pausesLeft[turn] <= 0) return err("no_pauses");
      if (r.clock[turn] - (now - r.last) <= 0) { finish(r, turn === "w" ? "b" : "w", "timeout"); return broadcast(r); }
      r.clock[turn] -= now - r.last; r.last = now; // фиксируем часы и замораживаем
      r.pausesLeft[turn] -= 1;
      r.pause = { by: me, until: now + PAUSE_MS };
      r.drawOffer = null;
      return broadcast(r);
    }
    if (m.t === "resume") {
      if (!r.pause) return err("not_paused");
      if (r.pause.by !== me) return err("not_pause_owner");
      r.pause = null; r.last = now;
      return broadcast(r);
    }
    if (r.pause) return err("paused"); // на паузе доступны только «продолжить» и «сдаться»

    if (m.t === "move") {
      if (r.chess.turn() !== me) return err("not_your_turn");
      if (!r.tokens.w || !r.tokens.b) return err("wait_opponent");
      const first = r.chess.history().length === 0; // первый ход белых время не расходует
      if (!first && r.clock[me] - (now - r.last) <= 0) { finish(r, me === "w" ? "b" : "w", "timeout"); return broadcast(r); }
      try {
        r.chess.move({ from: String(m.from), to: String(m.to), promotion: m.promotion ? String(m.promotion) : undefined });
      } catch { return err("illegal_move"); }
      if (!first) r.clock[me] -= now - r.last;
      r.last = now;
      r.drawOffer = null;
      checkEnd(r);
      if (!r.over) { const nx: Color = r.chess.turn(); r.hold = [...r.socks.values()].includes(nx) ? null : now; } // следующего игрока нет в комнате: его часы стоят, пока не зайдёт
      return broadcast(r);
    }
    if (m.t === "draw_offer") { r.drawOffer = me; return broadcast(r); }
    if (m.t === "draw_decline") { if (r.drawOffer && r.drawOffer !== me) { r.drawOffer = null; broadcast(r); } return; }
    if (m.t === "draw_accept") { if (r.drawOffer && r.drawOffer !== me) { finish(r, null, "agreement"); broadcast(r); } return; }
    err("unknown");
  });
});

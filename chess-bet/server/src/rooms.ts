import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { Chess } from "chess.js";

// Бесплатные комнаты «партия с другом по ссылке»: без кошелька, без ставок и без блокчейна.
// Живут только в памяти сервера и не связаны с деньгами и контрактом. Подключение: ws(s)://хост/room

type Color = "w" | "b";
type Who = Color | "s"; // s — зритель
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
};

const MAX_ROOMS = 3000;
const IDLE_MS = 48 * 3600_000; // комната без действий живёт 48 часов
const DONE_MS = 6 * 3600_000; // оконченная партия остаётся ещё 6 часов
const CREATE_PER_HOUR = 20; // новых комнат в час с одного адреса
const DEFAULT_MIN = 60; // время на партию по умолчанию, минут (каждому игроку)
const MAX_MIN = 180;

export const roomsWss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
const rooms = new Map<string, Room>();
const created = new Map<string, number[]>();

// ROOMSAVE: комнаты сохраняются на диск и переживают перезапуск сервера (обновление, перезагрузка VPS)
const ROOMS_FILE = process.env.ROOMS_FILE || "./data/rooms.json";
function saveRooms() {
  try {
    const out = [...rooms.values()].map((r) => ({
      id: r.id, tokens: r.tokens, moves: r.chess.history(), over: r.over, reason: r.reason, winner: r.winner, drawOffer: r.drawOffer,
      touched: r.touched, limit: r.limit, clock: remaining(r),
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
      rooms.set(o.id, { id: o.id, tokens: o.tokens ?? {}, chess, over: !!o.over, reason: o.reason ?? null, winner: o.winner ?? null, drawOffer: o.drawOffer ?? null,
        socks: new Map(), touched: Number(o.touched) || now, limit: Number(o.limit) || DEFAULT_MIN * 60_000, clock: { w: Number(o.clock?.w) || 0, b: Number(o.clock?.b) || 0 }, last: now });
    }
    console.log("rooms restored:", rooms.size);
  } catch { /* файла ещё нет */ }
}


const newToken = () => crypto.randomBytes(16).toString("hex");
const ipOf = (req: http.IncomingMessage) => {
  const f = String(req.headers["x-forwarded-for"] ?? "").split(",").pop()?.trim();
  return f || req.socket.remoteAddress || "?";
};

/** Часы идут после первого хода белых, только у того, чей ход */
const running = (r: Room) => !r.over && r.chess.history().length > 0;
function remaining(r: Room, now = Date.now()) {
  const used = running(r) ? now - r.last : 0;
  const t = r.chess.turn();
  return { w: Math.max(0, r.clock.w - (t === "w" ? used : 0)), b: Math.max(0, r.clock.b - (t === "b" ? used : 0)) };
}
function state(r: Room) {
  const h = r.chess.history({ verbose: true });
  const lm = h[h.length - 1];
  const on = (c: Color) => [...r.socks.values()].includes(c);
  return {
    t: "state", id: r.id, fen: r.chess.fen(), history: h.map((x) => x.san), lastMove: lm ? { from: lm.from, to: lm.to } : null,
    turn: r.chess.turn(), over: r.over, reason: r.reason, winner: r.winner, drawOffer: r.drawOffer,
    seats: { w: !!r.tokens.w, b: !!r.tokens.b }, online: { w: on("w"), b: on("b") },
    watchers: [...r.socks.values()].filter((x) => x === "s").length,
    limit: r.limit, clock: remaining(r), running: running(r),
  };
}
function broadcast(r: Room) {
  const s = JSON.stringify(state(r));
  for (const ws of r.socks.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(s);
}
function finish(r: Room, winner: Color | null, reason: string) {
  if (running(r)) { const t = r.chess.turn(); r.clock[t] = Math.max(0, r.clock[t] - (Date.now() - r.last)); } // замораживаем часы
  r.over = true; r.winner = winner; r.reason = reason; r.drawOffer = null;
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

// раз в секунду проверяем, не кончилось ли у кого-то время
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (!running(r)) continue;
    const t = r.chess.turn();
    if (remaining(r, now)[t] <= 0) { finish(r, t === "w" ? "b" : "w", "timeout"); broadcast(r); }
  }
}, 1000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) if (now - r.touched > (r.over ? DONE_MS : IDLE_MS)) rooms.delete(id);
  for (const [ip, list] of created) { const l = list.filter((t) => now - t < 3600_000); if (l.length) created.set(ip, l); else created.delete(ip); }
}, 600_000).unref();

// ROOMFIX: «пульс» раз в 25 секунд: мёртвые соединения (телефон уснул, сеть пропала) закрываются, а живые не обрываются прокси
const alive = new WeakSet<WebSocket>();
setInterval(() => {
  for (const c of roomsWss.clients) {
    if (!alive.has(c)) { c.terminate(); continue; }
    alive.delete(c);
    try { c.ping(); } catch { /* соединение уже закрыто */ }
  }
}, 25_000).unref();

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
      const r: Room = { id: crypto.randomBytes(5).toString("hex"), tokens: {}, chess: new Chess(), over: false, reason: null, winner: null, drawOffer: null, socks: new Map(), touched: now,
        limit: mins * 60_000, clock: { w: mins * 60_000, b: mins * 60_000 }, last: now };
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
    if (m.t === "sync") return send(state(r)); // клиент после пробуждения просит свежее состояние
    if (who === "s") return err("not_player");
    r.touched = now;

    if (m.t === "resign") { if (!r.over) { finish(r, who === "w" ? "b" : "w", "resign"); broadcast(r); } return; }
    if (r.over) return err("game_over");
    if (m.t === "move") {
      if (r.chess.turn() !== who) return err("not_your_turn");
      if (!r.tokens.w || !r.tokens.b) return err("wait_opponent");
      const first = r.chess.history().length === 0; // первый ход белых время не расходует
      if (!first && r.clock[who] - (now - r.last) <= 0) { finish(r, who === "w" ? "b" : "w", "timeout"); return broadcast(r); }
      try {
        r.chess.move({ from: String(m.from), to: String(m.to), promotion: m.promotion ? String(m.promotion) : undefined });
      } catch { return err("illegal_move"); }
      if (!first) r.clock[who] -= now - r.last;
      r.last = now;
      r.drawOffer = null;
      checkEnd(r);
      return broadcast(r);
    }
    if (m.t === "draw_offer") { r.drawOffer = who; return broadcast(r); }
    if (m.t === "draw_decline") { if (r.drawOffer && r.drawOffer !== who) { r.drawOffer = null; broadcast(r); } return; }
    if (m.t === "draw_accept") { if (r.drawOffer && r.drawOffer !== who) { finish(r, null, "agreement"); broadcast(r); } return; }
    err("unknown");
  });
});

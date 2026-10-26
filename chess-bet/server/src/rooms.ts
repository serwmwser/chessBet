import crypto from "node:crypto";
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
};

const MAX_ROOMS = 3000;
const IDLE_MS = 6 * 3600_000; // комната без действий живёт 6 часов
const DONE_MS = 3600_000; // оконченная партия остаётся ещё час
const CREATE_PER_HOUR = 20; // новых комнат в час с одного адреса

export const roomsWss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
const rooms = new Map<string, Room>();
const created = new Map<string, number[]>();

const newToken = () => crypto.randomBytes(16).toString("hex");
const ipOf = (req: http.IncomingMessage) => {
  const f = String(req.headers["x-forwarded-for"] ?? "").split(",").pop()?.trim();
  return f || req.socket.remoteAddress || "?";
};

function state(r: Room) {
  const h = r.chess.history({ verbose: true });
  const lm = h[h.length - 1];
  const on = (c: Color) => [...r.socks.values()].includes(c);
  return {
    t: "state", id: r.id, fen: r.chess.fen(), history: h.map((x) => x.san), lastMove: lm ? { from: lm.from, to: lm.to } : null,
    turn: r.chess.turn(), over: r.over, reason: r.reason, winner: r.winner, drawOffer: r.drawOffer,
    seats: { w: !!r.tokens.w, b: !!r.tokens.b }, online: { w: on("w"), b: on("b") },
    watchers: [...r.socks.values()].filter((x) => x === "s").length,
  };
}
function broadcast(r: Room) {
  const s = JSON.stringify(state(r));
  for (const ws of r.socks.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(s);
}
function finish(r: Room, winner: Color | null, reason: string) {
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

setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) if (now - r.touched > (r.over ? DONE_MS : IDLE_MS)) rooms.delete(id);
  for (const [ip, list] of created) { const l = list.filter((t) => now - t < 3600_000); if (l.length) created.set(ip, l); else created.delete(ip); }
}, 600_000).unref();

roomsWss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = ipOf(req);
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
      const r: Room = { id: crypto.randomBytes(5).toString("hex"), tokens: {}, chess: new Chess(), over: false, reason: null, winner: null, drawOffer: null, socks: new Map(), touched: now };
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
    if (who === "s") return err("not_player");
    r.touched = now;

    if (m.t === "resign") { if (!r.over) { finish(r, who === "w" ? "b" : "w", "resign"); broadcast(r); } return; }
    if (r.over) return err("game_over");
    if (m.t === "move") {
      if (r.chess.turn() !== who) return err("not_your_turn");
      if (!r.tokens.w || !r.tokens.b) return err("wait_opponent");
      try {
        r.chess.move({ from: String(m.from), to: String(m.to), promotion: m.promotion ? String(m.promotion) : undefined });
      } catch { return err("illegal_move"); }
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

// Звонки из профиля: сигнализация WebRTC по WebSocket (/call) и точный учёт времени разговора на сервере.
// Видео и аудио идут напрямую между пользователями; сервер только соединяет, считает секунды и пишет журнал.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import { checkSession } from "./session.js";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`
CREATE TABLE IF NOT EXISTS call_log(
  id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER NOT NULL,
  secs INTEGER NOT NULL, reason TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS call_log_a ON call_log(a, ended);
CREATE INDEX IF NOT EXISTS call_log_b ON call_log(b, ended);
`);

const DAY = 86400000;
const RING_MS = 40_000;      // сколько звонит вызов
const IDLE_MS = 30_000;      // нет пингов дольше — связь потеряна
const ALIVE_MS = 15_000;     // секунды идут, только пока оба слали пинг не позже этого срока (клиент шлёт пинг раз в 5 секунд)
const MAX_SECS = 3 * 3600;   // один звонок не дольше 3 часов
const MAX_CALLS = 300;

type Call = {
  id: string; a: string; b: string; state: "ringing" | "active";
  created: number; started: number; secs: number; last: number; ping: { a: number; b: number };
};
const calls = new Map<string, Call>();
const byUser = new Map<string, string>();      // адрес -> id звонка
const online = new Map<string, WebSocket>();   // адрес -> соединение

export type CallInfo = { id: string; a: string; b: string; started: number; ended: number; secs: number; reason: string };
let callHook: ((c: CallInfo) => void) | null = null;
/** Хук «звонок завершён» (только состоявшиеся разговоры). Подключается позже для начислений */
export function setCallHook(fn: (c: CallInfo) => void) { callHook = fn; }

type U = { addr: string; name: string; avatar: string; banned: number };
const userByAddr = (a: string) => db.prepare("SELECT addr,name,avatar,banned FROM users WHERE addr=?").get(a) as U | undefined;
const userByName = (n: string) => db.prepare("SELECT addr,name,avatar,banned FROM users WHERE name=?").get(String(n).trim().toLowerCase()) as U | undefined;
const blocked = (x: string, y: string) => { try { return !!db.prepare("SELECT 1 FROM dm_blocks WHERE a=? AND b=?").get(x, y); } catch { return false; } };

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

function send(addr: string, o: unknown) {
  const ws = online.get(addr);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o));
}
const peerOf = (c: Call, me: string) => (c.a === me ? c.b : c.a);
const pub = (u?: U) => ({ name: u?.name ?? "", avatar: u?.avatar ?? "" });

/** Серверы для WebRTC: бесплатный STUN и, если настроен coturn, TURN с временным паролем (схема use-auth-secret) */
function iceServers(addr: string) {
  const list: { urls: string[]; username?: string; credential?: string }[] = [{ urls: ["stun:stun.l.google.com:19302"] }];
  const host = process.env.TURN_HOST, secret = process.env.TURN_SECRET;
  if (host && secret) {
    const username = `${Math.floor(Date.now() / 1000) + 6 * 3600}:${addr}`;
    const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");
    list.push({ urls: [`turn:${host}:3478?transport=udp`, `turn:${host}:3478?transport=tcp`], username, credential });
  }
  return list;
}

function end(c: Call, reason: string) {
  if (!calls.has(c.id)) return;
  calls.delete(c.id);
  if (c.state === "active") { // досчитываем секунды с последнего тика, если связь жива у обоих
    const now = Date.now();
    if (now - c.ping.a < ALIVE_MS && now - c.ping.b < ALIVE_MS) c.secs += Math.min(now - c.last, 6000) / 1000;
  }
  if (byUser.get(c.a) === c.id) byUser.delete(c.a);
  if (byUser.get(c.b) === c.id) byUser.delete(c.b);
  const secs = Math.floor(c.secs);
  send(c.a, { t: "ended", id: c.id, reason, secs });
  send(c.b, { t: "ended", id: c.id, reason, secs });
  if (c.state === "active") {
    const info: CallInfo = { id: c.id, a: c.a, b: c.b, started: c.started, ended: Date.now(), secs, reason };
    try { db.prepare("INSERT OR IGNORE INTO call_log(id,a,b,started,ended,secs,reason) VALUES(?,?,?,?,?,?,?)").run(info.id, info.a, info.b, info.started, info.ended, info.secs, info.reason); } catch (e) { console.error("call_log", e); }
    if (callHook) { try { callHook(info); } catch (e) { console.error("call hook", e); } }
  }
}

// раз в 5 секунд: таймаут вызова, потеря связи, учёт секунд
setInterval(() => {
  const now = Date.now();
  for (const c of [...calls.values()]) {
    if (c.state === "ringing") { if (now - c.created > RING_MS) end(c, "no_answer"); continue; }
    const dt = Math.min(now - c.last, 6000) / 1000;
    c.last = now;
    const okA = now - c.ping.a < ALIVE_MS, okB = now - c.ping.b < ALIVE_MS;
    if (okA && okB) c.secs += dt;
    else if (now - c.ping.a > IDLE_MS || now - c.ping.b > IDLE_MS) { end(c, "disconnect"); continue; }
    if (c.secs >= MAX_SECS) end(c, "limit");
  }
}, 5000).unref();

export const callsWss = new WebSocketServer({ noServer: true, maxPayload: 16384 });

callsWss.on("connection", (ws: WebSocket) => {
  let me = "";
  const authTimer = setTimeout(() => { if (!me) ws.close(4001, "auth_timeout"); }, 8000);

  ws.on("message", (raw: Buffer) => {
    let m: Record<string, unknown>;
    try { m = JSON.parse(raw.toString("utf8")); } catch { return; }
    if (!m || typeof m !== "object" || typeof m.t !== "string") return;
    const err = (e: string, id?: string) => ws.send(JSON.stringify({ t: "error", e, id }));

    if (m.t === "auth") {
      const [a, tok] = String(m.token ?? "").split("|");
      const addr = String(a || "").toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(addr) || !tok || !checkSession(addr, tok)) { ws.send(JSON.stringify({ t: "error", e: "auth" })); ws.close(4003, "auth"); return; }
      const u = userByAddr(addr);
      if (!u || u.banned) { ws.send(JSON.stringify({ t: "error", e: "forbidden" })); ws.close(4003, "forbidden"); return; }
      clearTimeout(authTimer);
      const old = online.get(addr);
      if (old && old !== ws) { try { old.close(4000, "replaced"); } catch { /* уже закрыто */ } }
      me = addr; online.set(addr, ws);
      const stale = byUser.get(addr); // обновили страницу: прежний разговор потерян вместе с потоком
      if (stale && calls.get(stale)) end(calls.get(stale)!, "reconnect");
      ws.send(JSON.stringify({ t: "ready", name: u.name, ice: iceServers(addr) }));
      return;
    }
    if (!me) return err("auth");
    const cur = () => { const id = byUser.get(me); return id ? calls.get(id) : undefined; };

    if (m.t === "invite") {
      const peer = userByName(String(m.to ?? ""));
      if (!peer || peer.banned || peer.addr === me) return err("not_found");
      if (blocked(me, peer.addr) || blocked(peer.addr, me)) return err("not_found");
      if (byUser.has(me)) return err("busy_me");
      if (byUser.has(peer.addr)) return err("busy");
      if (!online.has(peer.addr)) return err("offline");
      if (calls.size >= MAX_CALLS) return err("overloaded");
      if (limited("cinv:" + me, 15, 600000) || limited("cinvday:" + me, 100, DAY) || limited(`cpair:${me}>${peer.addr}`, 5, 600000)) return err("slow_down");
      const now = Date.now();
      const c: Call = { id: crypto.randomBytes(8).toString("hex"), a: me, b: peer.addr, state: "ringing", created: now, started: 0, secs: 0, last: now, ping: { a: now, b: now } };
      calls.set(c.id, c); byUser.set(me, c.id); byUser.set(peer.addr, c.id);
      ws.send(JSON.stringify({ t: "ringing", id: c.id, peer: pub(peer) }));
      send(peer.addr, { t: "incoming", id: c.id, from: pub(userByAddr(me)) });
      return;
    }

    const c = calls.get(String(m.id ?? "")) ?? cur();
    if (!c || (c.a !== me && c.b !== me)) return err("no_call", String(m.id ?? ""));

    if (m.t === "accept") {
      if (c.state !== "ringing" || c.b !== me) return err("bad_state", c.id);
      const now = Date.now();
      c.state = "active"; c.started = now; c.last = now; c.ping = { a: now, b: now };
      send(c.a, { t: "accepted", id: c.id }); send(c.b, { t: "accepted", id: c.id });
      return;
    }
    if (m.t === "decline" || m.t === "hangup") {
      end(c, c.state === "ringing" ? (c.b === me ? "declined" : "cancelled") : "hangup");
      return;
    }
    if (m.t === "signal") {
      if (c.state !== "active" && !(c.state === "ringing")) return;
      const data = m.data;
      if (!data || typeof data !== "object" || JSON.stringify(data).length > 8000) return err("bad_signal", c.id);
      send(peerOf(c, me), { t: "signal", id: c.id, data });
      return;
    }
    if (m.t === "ping") {
      if (c.state !== "active") return;
      c.ping[c.a === me ? "a" : "b"] = Date.now();
      ws.send(JSON.stringify({ t: "tick", id: c.id, secs: Math.floor(c.secs) }));
      return;
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimer);
    if (!me) return;
    if (online.get(me) === ws) {
      online.delete(me);
      const id = byUser.get(me);
      const c = id ? calls.get(id) : undefined;
      if (c) end(c, c.state === "ringing" ? "cancelled" : "disconnect");
    }
  });
  ws.on("error", () => { /* закроется само */ });
});

/** HTTP: /api/calls/online?name=… (в сети ли собеседник) и /api/calls/history (мои последние звонки) */
export async function handleCalls(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/calls/")) return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (!viewer) return bad("auth", 401);
  if (req.method !== "GET") return bad("method", 405);
  try {
    if (p === "/api/calls/online") {
      const u = userByName(String(url.searchParams.get("name") ?? ""));
      if (!u || u.banned || u.addr === viewer || blocked(viewer, u.addr) || blocked(u.addr, viewer)) return out(200, { ok: true, online: false, busy: false });
      return out(200, { ok: true, online: online.has(u.addr), busy: byUser.has(u.addr) });
    }
    if (p === "/api/calls/history") {
      const rows = db.prepare("SELECT id,a,b,started,secs,reason FROM call_log WHERE a=@me OR b=@me ORDER BY ended DESC LIMIT 20").all({ me: viewer }) as { id: string; a: string; b: string; started: number; secs: number; reason: string }[];
      return out(200, { ok: true, items: rows.map((r) => ({ id: r.id, peer: userByAddr(r.a === viewer ? r.b : r.a)?.name ?? "", mine: r.a === viewer, started: r.started, secs: r.secs, reason: r.reason })) });
    }
    return bad("not_found", 404);
  } catch (e) {
    console.error("calls", e);
    return bad("server", 500);
  }
}

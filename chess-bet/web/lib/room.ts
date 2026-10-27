"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "./config";

// Бесплатная партия с другом по ссылке: без кошелька и ставок. Сервер: /room (server/src/rooms.ts).

export const ROOM_URL = WS_URL.replace(/\/ws$/, "/room");

export type Color = "w" | "b";
export type Seat = Color | "s"; // s — зритель

export type RoomState = {
  t: "state";
  id: string;
  fen: string;
  history: string[];
  lastMove: { from: string; to: string } | null;
  turn: Color;
  over: boolean;
  reason: string | null;
  winner: Color | null;
  drawOffer: Color | null;
  seats: { w: boolean; b: boolean };
  online: { w: boolean; b: boolean };
  watchers: number;
  limit: number; // время на партию каждому игроку, мс
  clock: { w: number; b: number }; // остаток времени на момент получения
  running: boolean; // часы идут
  pause: { by: Color; left: number } | null; // пауза: кто взял и сколько осталось до автопоражения, мс
  pausesLeft: { w: number; b: number };
  chat: { from: Color; text: string; at: number }[]; // чат видят только двое игроков
  rematch: Color | null; // кто предложил реванш
};

const tokKey = (id: string) => "cb_room_" + id;
const readTok = (id: string) => { try { return localStorage.getItem(tokKey(id)) || undefined; } catch { return undefined; } };
const saveTok = (id: string, t: string) => { try { localStorage.setItem(tokKey(id), t); } catch { /* хранилище недоступно */ } };

// Список моих бесплатных партий (в этом браузере): чтобы партия не пропадала при переходе по страницам
export type MyRoom = { id: string; color: Color; at: number };
const ROOMS_KEY = "cb_my_rooms";
const ROOM_TTL = 48 * 3600_000; // ROOMSAVE: как на сервере: комната живёт до 48 часов без ходов
export function listMyRooms(): MyRoom[] {
  try {
    const a = JSON.parse(localStorage.getItem(ROOMS_KEY) || "[]") as MyRoom[];
    return a.filter((r) => r && typeof r.id === "string" && Date.now() - r.at < ROOM_TTL);
  } catch { return []; }
}
function writeRooms(a: MyRoom[]) { try { localStorage.setItem(ROOMS_KEY, JSON.stringify(a.slice(0, 20))); } catch { /* хранилище недоступно */ } }
export function addMyRoom(id: string, color: Color) {
  const a = listMyRooms().filter((r) => r.id !== id);
  a.unshift({ id, color, at: Date.now() });
  writeRooms(a);
}
export function removeMyRoom(id: string) { writeRooms(listMyRooms().filter((r) => r.id !== id)); }

/** Ссылка-приглашение в комнату */
export const roomLink = (id: string) => `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/?room=${id}`;

/** Подключение к комнате. Без roomId создаёт новую (create: за кого играет создатель, r — случайно). Связь восстанавливается сама. */
export function useRoom(roomId: string | null, create: Color | "r" = "r", minutes = 60) {
  const [id, setId] = useState<string | null>(roomId);
  const [st, setSt] = useState<RoomState | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState(0); // когда получено последнее состояние (для хода часов)
  const [notice, setNotice] = useState<{ code: string; n: number } | null>(null); // нефатальные ошибки сервера (чат, пауза и т.д.)
  const ws = useRef<WebSocket | null>(null);
  const cur = useRef<string | null>(roomId);
  const lastMsg = useRef(0); // ROOMFIX: когда последний раз что-то приходило с сервера

  useEffect(() => {
    let stop = false, tries = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (retry) { clearTimeout(retry); retry = undefined; }
      const s = new WebSocket(ROOM_URL);
      ws.current = s;
      s.onopen = () => {
        setOnline(true); tries = 0;
        if (cur.current) s.send(JSON.stringify({ t: "join", id: cur.current, token: readTok(cur.current) }));
        else s.send(JSON.stringify({ t: "create", color: create, minutes }));
      };
      s.onmessage = (e) => {
        let m: any;
        lastMsg.current = Date.now();
        try { m = JSON.parse(String(e.data)); } catch { return; }
        if (m.t === "state") { setSt(m as RoomState); setAt(Date.now()); setError(null); }
        else if (m.t === "seat") { cur.current = m.id; setId(m.id); setSeat(m.color); if (m.token) saveTok(m.id, m.token); if (m.color === "w" || m.color === "b") addMyRoom(m.id, m.color); }
        else if (m.t === "rematch_go" && typeof m.id === "string" && typeof m.token === "string") {
          // оба согласились на реванш: переходим в новую комнату с обменянными цветами
          saveTok(m.id, m.token); cur.current = m.id; setId(m.id); setSeat(null); setSt(null); setError(null);
          s.send(JSON.stringify({ t: "join", id: m.id, token: m.token }));
        }
        else if (m.t === "error") {
          const c = String(m.message);
          if (c === "room_not_found" || c === "busy" || c === "too_many_rooms") setError(c);
          else setNotice({ code: c, n: Date.now() });
        }
      };
      s.onclose = () => {
        setOnline(false);
        if (stop) return;
        if (++tries > 20) { setError("offline"); return; }
        retry = setTimeout(open, Math.min(1500 * tries, 8000));
      };
    };
    open();
    // после сна телефона или возврата из другого приложения сразу проверяем связь и переподключаемся
    const wake = () => {
      if (stop || document.visibilityState === "hidden") return;
      const s = ws.current;
      if (!s || s.readyState === WebSocket.CLOSED || s.readyState === WebSocket.CLOSING) { tries = 0; open(); return; }
      if (s.readyState === WebSocket.OPEN) {
        const before = lastMsg.current;
        s.send(JSON.stringify({ t: "sync" }));
        setTimeout(() => { if (!stop && lastMsg.current === before && ws.current === s) { try { s.close(); } catch { /* уже закрыто */ } } }, 3000);
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    return () => { stop = true; if (retry) clearTimeout(retry); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); window.removeEventListener("focus", wake); ws.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((o: object) => { if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(o)); }, []);
  return {
    id, st, seat, online, error, at, notice,
    move: (from: string, to: string, promotion?: string) => send({ t: "move", from, to, promotion }),
    resign: () => send({ t: "resign" }),
    offerDraw: () => send({ t: "draw_offer" }),
    acceptDraw: () => send({ t: "draw_accept" }),
    declineDraw: () => send({ t: "draw_decline" }),
    chat: (text: string) => send({ t: "chat", text }),
    pause: () => send({ t: "pause" }),
    resume: () => send({ t: "resume" }),
    rematch: () => send({ t: "rematch" }),
  };
}

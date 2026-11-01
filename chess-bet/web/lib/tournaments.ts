"use client";
// Бесплатные турниры: клиент API (сервер: server/src/tournaments.ts) и хуки для страницы /tournaments/.
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "./config";
import { addMyRoom, roomLink } from "./room";

export type TourStatus = "upcoming" | "running" | "finishing" | "finished" | "cancelled";
export type TourInfo = {
  id: string; kind: "blitz" | "daily"; ru: string; en: string; start: number; end: number; minutes: number;
  status: TourStatus; players: number; registered: boolean;
};
export type PastTour = TourInfo & { top: { name: string; avatar: string; score: number }[] };
export type Standing = { rank: number; name: string; avatar: string; score: number; games: number; wins: number; playing: boolean; online: boolean; me: boolean };
export type Current = { room: string; token: string; color: "w" | "b" };
export type TourOne = {
  now: number; tour: TourInfo; standings: Standing[];
  me: { registered: boolean; score: number; games: number; rank: number; current: Current | null } | null;
};

/** Токен сайта имеет вид «адрес|токен»: в заголовки уходит и то и другое */
async function call<T>(path: string, opt: { post?: unknown; token?: string } = {}): Promise<T> {
  const [wallet, tok] = (opt.token || "").split("|");
  const r = await fetch(`${API_URL}${path}`, {
    method: opt.post !== undefined ? "POST" : "GET",
    cache: "no-store",
    headers: {
      ...(opt.post !== undefined ? { "content-type": "application/json" } : {}),
      ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}),
    },
    body: opt.post !== undefined ? JSON.stringify(opt.post) : undefined,
  });
  const j = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!j.ok) throw new Error(j.error || "error");
  return j;
}

export const listTournaments = (token = "") => call<{ now: number; live: TourInfo[]; past: PastTour[] }>("/api/tournaments", { token });
export const getTournament = (id: string, token = "") => call<TourOne>(`/api/tournaments/one?id=${encodeURIComponent(id)}`, { token });
export const joinTournament = (id: string, token: string) => call<object>("/api/tournaments/join", { post: { id }, token });
export const leaveTournament = (id: string, token: string) => call<object>("/api/tournaments/leave", { post: { id }, token });
export const pingTournament = (id: string, token: string) =>
  call<{ registered: boolean; status: TourStatus; waiting?: boolean; current: Current | null }>("/api/tournaments/ping", { post: { id }, token });

/** Перейти в партию: сохраняем секрет места (как для обычной комнаты) и открываем игру */
export function enterRoom(c: Current) {
  try { localStorage.setItem("cb_room_" + c.room, c.token); } catch { /* хранилище недоступно */ }
  addMyRoom(c.room, c.color);
  location.href = roomLink(c.room);
}

/** Понятный текст ошибки сервера */
export function tourErr(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт, чтобы участвовать", "Sign in to take part"],
    closed: ["Вход в этот турнир закрыт", "Entry to this tournament is closed"],
    banned: ["Аккаунт заблокирован", "Account is blocked"],
    in_game: ["Сначала закончите текущую партию", "Finish your current game first"],
    rate_limit: ["Слишком часто, подождите немного", "Too many requests, please wait"],
    not_found: ["Турнир не найден", "Tournament not found"],
  };
  const t = m[code];
  return t ? (ru ? t[0] : t[1]) : ru ? "Не удалось выполнить. Попробуйте ещё раз" : "Something went wrong. Please try again";
}

/** Список турниров: ближайшие и недавние. Обновляется раз в 15 секунд */
export function useTournaments(token: string) {
  const [data, setData] = useState<{ live: TourInfo[]; past: PastTour[] } | null>(null);
  const [skew, setSkew] = useState(0); // разница часов сервера и устройства, мс
  const [error, setError] = useState(false);
  const reload = useCallback(() => {
    listTournaments(token).then((d) => { setData({ live: d.live, past: d.past }); setSkew(d.now - Date.now()); setError(false); }).catch(() => setError(true));
  }, [token]);
  useEffect(() => {
    reload();
    const t = setInterval(reload, 15_000);
    return () => clearInterval(t);
  }, [reload]);
  return { data, skew, error, reload };
}

/**
 * Один турнир: таблица обновляется раз в 5 секунд. Пока игрок записан и страница открыта, она раз в 3 секунды
 * сообщает серверу «жду пару»; когда пара найдена, игрок автоматически попадает в партию.
 */
export function useTournament(id: string, token: string) {
  const [one, setOne] = useState<TourOne | null>(null);
  const [skew, setSkew] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const entered = useRef(false);

  const reload = useCallback(() => {
    if (!id) return;
    getTournament(id, token)
      .then((d) => {
        setOne(d); setSkew(d.now - Date.now()); setError("");
        const c = d.me?.current;
        if (c && !entered.current) { entered.current = true; enterRoom(c); } // партия уже идёт: возвращаем в неё
      })
      .catch((e: Error) => setError(e.message));
  }, [id, token]);

  useEffect(() => {
    entered.current = false;
    reload();
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [reload]);

  const registered = !!one?.me?.registered;
  const status = one?.tour.status;
  useEffect(() => {
    if (!id || !token || !registered || (status !== "running" && status !== "upcoming")) return;
    let stop = false;
    const ping = () => pingTournament(id, token)
      .then((r) => { if (!stop && r.current && !entered.current) { entered.current = true; enterRoom(r.current); } })
      .catch(() => { /* временный сбой связи: следующий опрос через 3 секунды */ });
    ping();
    const t = setInterval(ping, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [id, token, registered, status]);

  const act = async (fn: () => Promise<object>) => {
    setBusy(true);
    try { await fn(); setError(""); reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return {
    one, skew, error, busy, reload,
    join: () => act(() => joinTournament(id, token)),
    leave: () => act(() => leaveTournament(id, token)),
  };
}

/** Текущее время раз в секунду (для таймеров обратного отсчёта) */
export function useNow(): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t); }, []);
  return n;
}

/** «12:05» или «1:02:05» */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Время начала по часам устройства: «18:00» */
export function hhmm(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

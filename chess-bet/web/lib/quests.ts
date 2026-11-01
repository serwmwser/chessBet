"use client";
// Ежедневные задания, очки (XP), серии дней и значки. Сервер: server/src/quests.ts (маршруты /api/quests*).
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "./config";

export type Quest = { id: string; ru: string; en: string; target: number; xp: number; progress: number; done: boolean };
export type QStats = { xp: number; level: number; nextXp: number; streak: number; best: number; games: number; wins: number; doneToday: boolean };
export type QBadge = { id: string; icon: string; ru: string; en: string; at: number };
export type QuestsData = {
  guest: boolean; day: string; resetIn: number; quests: Quest[]; allDone: boolean; bonus: number;
  stats: QStats | null; badges: QBadge[];
};
export type TopRow = { name: string; avatar: string; xp: number; level: number; wins: number; games: number };

/** Токен сайта имеет вид «адрес|токен»: в заголовки уходит и то и другое */
async function call<T>(path: string, token = ""): Promise<T> {
  const [wallet, tok] = token.split("|");
  const r = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {},
  });
  const j = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!j.ok) throw new Error(j.error || "error");
  return j;
}

export const getQuests = (token = "") => call<QuestsData>("/api/quests", token);
export const getPlayerStats = (name: string) =>
  call<{ stats: QStats; badges: QBadge[] }>(`/api/quests/stats?name=${encodeURIComponent(name)}`);
export const getTop = () => call<{ top: TopRow[] }>("/api/quests/top").then((r) => r.top);

/** Задания и очки текущего игрока. Обновляются при возврате на вкладку и раз в минуту */
export function useQuests(token: string) {
  const [data, setData] = useState<QuestsData | null>(null);
  const [error, setError] = useState(false);
  const reload = useCallback(() => {
    getQuests(token).then((d) => { setData(d); setError(false); }).catch(() => setError(true));
  }, [token]);
  useEffect(() => {
    reload();
    const t = setInterval(reload, 60_000);
    const vis = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [reload]);
  return { data, error, reload };
}

/** «5 ч 12 мин» / «5 h 12 min» до обновления заданий */
export function leftText(ms: number, ru: boolean): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(m / 60);
  return ru ? `${h} ч ${m % 60} мин` : `${h} h ${m % 60} min`;
}

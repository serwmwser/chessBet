"use client";
// Запросы сайта к личным сообщениям на сервере (вход общий с сайтом: токен «адрес|токен» из useSocial).
import { useEffect, useState } from "react";
import { API_URL } from "./config";
import { errText } from "./social";

export type DmMsg = { id: number; mine: boolean; text: string; created: number; read: boolean };
export type DmChat = { name: string; avatar: string; unread: number; last: DmMsg };
export type DmThread = { peer: { name: string; avatar: string }; messages: DmMsg[]; more: boolean; blockedByMe: boolean; canSend: boolean };

async function call<T>(path: string, token: string, post?: unknown): Promise<T> {
  const [wallet, tok] = token.split("|");
  const r = await fetch(`${API_URL}${path}`, {
    method: post !== undefined ? "POST" : "GET",
    cache: "no-store",
    headers: {
      ...(post !== undefined ? { "content-type": "application/json" } : {}),
      ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}),
    },
    body: post !== undefined ? JSON.stringify(post) : undefined,
  });
  const j = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!j.ok) throw new Error(j.error || "error");
  return j;
}

export const dmList = (token: string) => call<{ chats: DmChat[] }>("/api/dm/list", token).then((r) => r.chats);
export const dmUnread = (token: string) => call<{ n: number }>("/api/dm/unread", token).then((r) => r.n);
/** Переписка с игроком: последние 50 сообщений, либо только новые после номера after (для обновления) */
export const dmThread = (token: string, name: string, o: { after?: number; before?: number } = {}) =>
  call<DmThread & { ok: boolean }>(`/api/dm/thread?name=${encodeURIComponent(name)}${o.after ? `&after=${o.after}` : ""}${o.before ? `&before=${o.before}` : ""}`, token);
export const dmSend = (token: string, name: string, text: string) => call<{ message: DmMsg }>("/api/dm/send", token, { name, text }).then((r) => r.message);
export const dmDelete = (token: string, id: number) => call<unknown>("/api/dm/delete", token, { id });
export const dmBlock = (token: string, name: string, on: boolean) => call<{ blockedByMe: boolean }>("/api/dm/block", token, { name, on }).then((r) => r.blockedByMe);
export const dmReport = (token: string, id: number, reason = "") => call<unknown>("/api/dm/report", token, { id, reason });

/** Текст ошибки для сообщений */
export function dmErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "you_blocked") return ru ? "Вы заблокировали этого игрока. Разблокируйте, чтобы написать" : "You blocked this player. Unblock to write";
  if (m === "cannot_send") return ru ? "Этот игрок не принимает ваши сообщения" : "This player does not accept your messages";
  return errText(e, ru);
}

/** Число непрочитанных сообщений (обновляется раз в 30 секунд, пока вкладка открыта) */
export function useUnread(token: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!token) { setN(0); return; }
    let alive = true;
    const tick = () => { if (document.visibilityState === "visible") dmUnread(token).then((v) => { if (alive) setN(v); }).catch(() => {}); };
    tick();
    const i = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", tick); };
  }, [token]);
  return n;
}

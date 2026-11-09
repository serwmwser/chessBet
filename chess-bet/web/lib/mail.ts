"use client";
// Запросы сайта к HiMeet Mail на сервере (вход общий с сайтом: токен «адрес|токен» из useSocial).
import { useEffect, useState } from "react";
import { API_URL } from "./config";
import { errText } from "./social";

export type MailBox = "in" | "out" | "star" | "trash";
export type MailUser = { name: string; avatar: string };
export type MailItem = {
  id: number; mine: boolean; from: MailUser; to: MailUser; subject: string; created: number;
  read: boolean; star: boolean; trash: boolean; preview?: string; body?: string;
};

/** Адрес для показа: ник@himeet */
export const mailAddr = (name: string) => `${name}@himeet`;

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

export const mailList = (token: string, box: MailBox, before?: number) =>
  call<{ items: MailItem[]; more: boolean }>(`/api/mail/list?box=${box}${before ? `&before=${before}` : ""}`, token);
export const mailGet = (token: string, id: number) => call<{ mail: MailItem }>(`/api/mail/get?id=${id}`, token).then((r) => r.mail);
export const mailSend = (token: string, to: string, subject: string, body: string) =>
  call<{ mail: MailItem }>("/api/mail/send", token, { to, subject, body }).then((r) => r.mail);
export const mailStar = (token: string, id: number, on: boolean) => call<unknown>("/api/mail/star", token, { id, on });
export const mailTrash = (token: string, id: number, on: boolean) => call<unknown>("/api/mail/trash", token, { id, on });
export const mailPurge = (token: string, id: number) => call<unknown>("/api/mail/purge", token, { id });
export const mailUnread = (token: string) => call<{ n: number }>("/api/mail/unread", token).then((r) => r.n);

/** Текст ошибки для писем */
export function mailErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "not_found") return ru ? "Получатель не найден. Введите ник без пробелов, например anna или anna@himeet" : "Recipient not found. Enter a name without spaces, e.g. anna or anna@himeet";
  if (m === "empty") return ru ? "Напишите текст письма" : "Write the message text";
  if (m === "you_blocked") return ru ? "Вы заблокировали этого пользователя. Разблокируйте его в чате" : "You blocked this user. Unblock them in chat";
  if (m === "cannot_send") return ru ? "Этот пользователь не принимает ваши письма" : "This user does not accept your mail";
  if (m === "slow_down") return ru ? "Слишком много писем. Подождите немного" : "Too many messages. Please wait a little";
  if (m === "too_big") return ru ? "Письмо слишком длинное (до 10 000 символов)" : "The message is too long (up to 10,000 characters)";
  return errText(e, ru);
}

/** Число непрочитанных писем (обновляется раз в 60 секунд, пока вкладка открыта) */
export function useMailUnread(token: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!token) { setN(0); return; }
    let alive = true;
    const tick = () => { if (document.visibilityState === "visible") mailUnread(token).then((v) => { if (alive) setN(v); }).catch(() => {}); };
    tick();
    const i = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", tick); };
  }, [token]);
  return n;
}

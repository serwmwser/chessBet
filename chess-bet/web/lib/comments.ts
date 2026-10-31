"use client";
// Запросы сайта к комментариям под постами (читать можно без входа, писать — со входом).
import { API_URL } from "./config";
import { errText } from "./social";

export type CUser = { name: string; avatar: string };
export type SComment = { id: number; text: string; created: number; user: CUser; mine: boolean; canDelete: boolean };
export type CPage = { comments: SComment[]; more: boolean; count: number };

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

export const getComments = (postId: number, token: string, after = 0) =>
  call<CPage>(`/api/comments?post=${postId}${after ? `&after=${after}` : ""}`, token);
export const addComment = (token: string, postId: number, text: string) =>
  call<{ comment: SComment; count: number }>("/api/comment/add", token, { post: postId, text });
export const deleteComment = (token: string, id: number) => call<{ count: number }>("/api/comment/delete", token, { id });
export const reportComment = (token: string, id: number, reason = "") => call<unknown>("/api/comment/report", token, { id, reason });

export function commentErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "duplicate") return ru ? "Вы только что отправили такой же комментарий" : "You just sent the same comment";
  if (m === "too_many_links") return ru ? "Не больше двух ссылок в комментарии" : "No more than two links in a comment";
  if (m === "empty") return ru ? "Напишите текст комментария" : "Write some text first";
  if (m === "forbidden") return ru ? "Нет прав на это действие" : "You are not allowed to do this";
  if (m === "not_found") return ru ? "Пост или комментарий не найден" : "Post or comment not found";
  return errText(e, ru);
}

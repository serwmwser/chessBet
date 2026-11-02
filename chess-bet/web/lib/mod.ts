"use client";
// Жалобы и панель модератора. Сервер: server/src/mod.ts (маршруты /api/report и /api/mod/*).
import { API_URL } from "./config";

export type ModKind = "post" | "user" | "comment" | "dm";
export type ModInfo = { text: string; author: string; banned: boolean; deleted: boolean; media?: number; post?: number; to?: string; gone?: boolean };
export type ModItem = { kind: ModKind; target: string; count: number; last: number; reasons: string[]; info: ModInfo };
export type ModUser = { name: string; avatar: string; banned: boolean; created: number };
export type ModAction = "delete" | "ban" | "unban" | "dismiss";

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

/** Пожаловаться на пост */
export const reportPost = (token: string, id: number, reason = "") => call<object>("/api/report", { post: { kind: "post", id, reason }, token });
/** Пожаловаться на профиль */
export const reportUser = (token: string, name: string, reason = "") => call<object>("/api/report", { post: { kind: "user", name, reason }, token });

/** Модератор ли текущий пользователь (для показа админ-панели) */
export const modMe = (token: string) => call<{ admin: boolean }>("/api/mod/me", { token }).then((r) => r.admin);
export const modReports = (token: string) => call<{ items: ModItem[] }>("/api/mod/reports", { token }).then((r) => r.items);
export const modUsers = (token: string, q = "") => call<{ users: ModUser[] }>(`/api/mod/users?q=${encodeURIComponent(q)}`, { token }).then((r) => r.users);
export const modAction = (token: string, kind: ModKind, target: string, action: ModAction) =>
  call<object>("/api/mod/action", { post: { kind, target, action }, token });

/** Понятный текст ошибки */
export function modErr(e: unknown, ru: boolean): string {
  const code = e instanceof Error ? e.message : "";
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт", "Please sign in"],
    own: ["Нельзя пожаловаться на себя", "You cannot report yourself"],
    not_found: ["Не найдено: возможно, уже удалено", "Not found: it may already be removed"],
    slow_down: ["Слишком часто, попробуйте позже", "Too many requests, try again later"],
    forbidden: ["Нет доступа", "No access"],
    protected: ["Модератора заблокировать нельзя", "A moderator cannot be banned"],
  };
  const t = m[code];
  return t ? (ru ? t[0] : t[1]) : ru ? "Не удалось выполнить. Попробуйте ещё раз" : "Something went wrong. Please try again";
}

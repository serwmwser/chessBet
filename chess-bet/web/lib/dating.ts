"use client";
// Знакомства: клиент API (сервер: server/src/dating.ts).
import { API_URL } from "./config";

export type Gender = "m" | "f";
export type Seeking = "m" | "f" | "any";
export type MyProfile = { enabled: boolean; gender: Gender; seeking: Seeking; birth: number; country: string; about: string; photos: string[] };
export type DCard = {
  name: string; avatar: string; age: number; gender: Gender; seeking: Seeking; country: string; about: string; photos: string[];
  level: number; liked: boolean; likesMe: boolean; match: boolean;
};
export type Filters = { gender: "" | Gender; min: number; max: number; country: string; level: number };
export const ABOUT_MAX = 500;

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

export const getMyDating = (token: string) => call<{ profile: MyProfile | null; name: string }>("/api/dating/me", { token });
export const saveDating = (token: string, p: MyProfile & { adult: boolean }) => call<{ profile: MyProfile }>("/api/dating/save", { post: p, token });
export const hideDating = (token: string, on: boolean) => call<object>("/api/dating/hide", { post: { on }, token });
export const deleteDating = (token: string) => call<object>("/api/dating/delete", { post: {}, token });
export const browseDating = (token: string, f: Filters, offset = 0) => {
  const q = new URLSearchParams({ min: String(f.min), max: String(f.max), level: String(f.level), offset: String(offset) });
  if (f.gender) q.set("gender", f.gender);
  if (f.country.trim()) q.set("country", f.country.trim());
  return call<{ total: number; items: DCard[]; next: number | null }>(`/api/dating/browse?${q}`, { token });
};
export const matchesDating = (token: string) => call<{ items: DCard[]; pending: number }>("/api/dating/matches", { token });
export const likeDating = (token: string, name: string, on: boolean) =>
  call<{ liked: boolean; match: boolean }>(on ? "/api/dating/like" : "/api/dating/unlike", { post: { name }, token });

/** Понятный текст ошибки сервера (ru/en) */
export function datingError(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт", "Please sign in"],
    adult_only: ["Знакомства только для 18+", "Dating is for 18+ only"],
    gender: ["Укажите свой пол", "Choose your gender"],
    birth: ["Проверьте год рождения", "Check your birth year"],
    contacts_not_allowed: ["Контакты и ссылки в анкете запрещены — общайтесь в личных сообщениях сайта", "Contacts and links are not allowed — use the site's messages"],
    no_profile: ["Сначала заполните анкету", "Fill in your profile first"],
    slow_down: ["Слишком часто, попробуйте позже", "Too fast, try again later"],
    forbidden: ["Недоступно для этого аккаунта", "Not available for this account"],
    not_found: ["Анкета больше недоступна", "Profile is no longer available"],
  };
  const x = m[code];
  return x ? (ru ? x[0] : x[1]) : ru ? "Ошибка, попробуйте ещё раз" : "Error, please try again";
}

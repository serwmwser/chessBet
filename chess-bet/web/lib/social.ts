"use client";
// Запросы сайта к соцсети на сервере: вход по подписи кошелька, профили, подписки, посты, лента, лайки.
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { API_URL } from "./config";

export type SUser = {
  name: string; bio: string; country: string; link: string; avatar: string; banner: string; joined: number;
  following: number; followers: number; posts: number; me: boolean; follows: boolean; addr?: string;
};
export type SPost = { id: number; text: string; media: string[]; created: number; user: { name: string; avatar: string }; likes: number; liked: boolean };

const KEY = "chessbet.social.token";
type Saved = { addr: string; token: string };
const readSaved = (): Saved | null => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null") as Saved | null; return s && s.token ? s : null; } catch { return null; }
};
const writeSaved = (s: Saved | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* без хранилища */ } };
/** Токен действует для того кошелька, под которым вошли */
export const tokenFor = (addr?: string): string => {
  const s = readSaved();
  return s && addr && s.addr === addr.toLowerCase() && Number(s.token.split(".")[1]) > Date.now() ? s.token : "";
};

async function call<T>(path: string, opt: { post?: unknown; token?: string } = {}): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: opt.post !== undefined ? "POST" : "GET",
    cache: "no-store",
    headers: { ...(opt.post !== undefined ? { "content-type": "application/json" } : {}), ...(opt.token ? { authorization: `Bearer ${opt.token}` } : {}) },
    body: opt.post !== undefined ? JSON.stringify(opt.post) : undefined,
  });
  const j = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!j.ok) throw new Error(j.error || "error");
  return j;
}

type Signer = { address: string; signMessage: (a: { message: string }) => Promise<string> };

/** Вход: кошелёк подписывает бесплатное сообщение, сервер выдаёт токен на 14 дней */
export async function login(account: Signer): Promise<{ token: string; user: SUser }> {
  const addr = account.address.toLowerCase();
  const c = await call<{ nonce: string; message: string }>("/api/auth/challenge", { post: { addr } });
  const sig = await account.signMessage({ message: c.message });
  const r = await call<{ token: string; user: SUser }>("/api/auth/login", { post: { addr, nonce: c.nonce, sig } });
  writeSaved({ addr, token: r.token });
  return r;
}
export const logout = () => writeSaved(null);

export const getUser = (name: string, token = "") => call<{ user: SUser }>(`/api/user?name=${encodeURIComponent(name)}`, { token }).then((r) => r.user);
export const getMe = (token: string) => call<{ user: SUser }>("/api/user", { token }).then((r) => r.user);
export const getPosts = (name: string, before = 0, token = "") =>
  call<{ posts: SPost[] }>(`/api/posts?name=${encodeURIComponent(name)}${before ? `&before=${before}` : ""}`, { token }).then((r) => r.posts);
export const getAll = (before = 0, token = "") => call<{ posts: SPost[] }>(`/api/posts${before ? `?before=${before}` : ""}`, { token }).then((r) => r.posts);
export const getFeed = (token: string, before = 0) => call<{ posts: SPost[] }>(`/api/feed${before ? `?before=${before}` : ""}`, { token }).then((r) => r.posts);
export const findPeople = (q: string) => call<{ users: { name: string; avatar: string; bio: string }[] }>(`/api/people?q=${encodeURIComponent(q)}`).then((r) => r.users);

export const saveProfile = (token: string, p: Partial<Pick<SUser, "name" | "bio" | "country" | "link" | "avatar" | "banner">>) =>
  call<{ user: SUser }>("/api/profile", { token, post: p }).then((r) => r.user);
export const follow = (token: string, name: string, on: boolean) => call<{ user: SUser }>("/api/follow", { token, post: { name, on } }).then((r) => r.user);
export const publish = (token: string, text: string, media: string[] = []) => call<{ post: SPost }>("/api/post", { token, post: { text, media } }).then((r) => r.post);
export const like = (token: string, id: number, on: boolean) => call<{ likes: number; liked: boolean }>("/api/like", { token, post: { id, on } });
export const removePost = (token: string, id: number) => call<unknown>("/api/delete", { token, post: { id } });

/** Текст ошибки сервера для человека */
export function errText(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message || "error";
  const t: Record<string, [string, string]> = {
    auth: ["Войдите, подписав сообщение кошельком", "Sign in with your wallet first"],
    bad_name: ["Ник: 3–20 символов, латиница, цифры и _", "Name: 3–20 chars, letters, digits and _"],
    name_taken: ["Этот ник занят", "This name is taken"],
    bad_link: ["Ссылка должна начинаться с https://", "Link must start with https://"],
    empty: ["Напишите текст или добавьте фото", "Write something or add a photo"],
    slow_down: ["Слишком часто, подождите минуту", "Too fast, wait a minute"],
    not_found: ["Не найдено", "Not found"],
    banned: ["Аккаунт заблокирован", "Account is blocked"],
    expired: ["Время подписи вышло, повторите", "Signature expired, try again"],
  };
  return t[m] ? t[m][ru ? 0 : 1] : m.slice(0, 120);
}

/** Хук: текущий кошелёк, токен входа и кнопка «Войти» */
export function useSocial() {
  const account = useActiveAccount();
  const addr = account?.address;
  const [token, setToken] = useState("");
  const [me, setMe] = useState<SUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = tokenFor(addr);
    setToken(t);
    if (!t) { setMe(null); return; }
    getMe(t).then(setMe).catch(() => { logout(); setToken(""); setMe(null); });
  }, [addr]);

  const signIn = useCallback(async () => {
    if (!account) throw new Error("auth");
    setBusy(true);
    try { const r = await login(account); setToken(r.token); setMe(r.user); return r.token; }
    finally { setBusy(false); }
  }, [account]);
  const signOut = useCallback(() => { logout(); setToken(""); setMe(null); }, []);

  return { addr, token, me, setMe, busy, signIn, signOut, signedIn: !!token };
}

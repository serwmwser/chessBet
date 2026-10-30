"use client";
// Запросы сайта к соцсети на сервере. Вход общий с сайтом: одна подпись кошелька даёт токен на 14 дней (lib/session.ts).
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { API_URL } from "./config";
import { dropToken, ensureToken, getToken } from "./session";

export type SUser = {
  name: string; bio: string; country: string; link: string; avatar: string; banner: string; joined: number;
  following: number; followers: number; posts: number; me: boolean; follows: boolean; addr?: string;
};
export type SPost = { id: number; edited: number; text: string; media: string[]; created: number; user: { name: string; avatar: string }; likes: number; liked: boolean };

/** Признак «не входить автоматически»: ставится, если игрок отказался от подписи или нажал «Выйти» (до закрытия вкладки) */
export const AUTO_OFF = "cb_autologin_off";
export const SESSION_EVENT = "cb-session";

/** Токен для запросов: «адрес|токен». Так компонентам не нужно знать, как устроен вход */
const pack = (addr: string, t: string) => `${addr.toLowerCase()}|${t}`;
export const tokenFor = (addr?: string): string => {
  if (!addr) return "";
  const t = getToken(addr);
  return t ? pack(addr, t) : "";
};

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

export const getUser = (name: string, token = "") => call<{ user: SUser }>(`/api/user?name=${encodeURIComponent(name)}`, { token }).then((r) => r.user);
export const getMe = (token: string) => call<{ user: SUser }>("/api/user", { token }).then((r) => r.user);
export const getPost = (id: number | string, token = "") => call<{ post: SPost }>(`/api/post?id=${encodeURIComponent(String(id))}`, { token }).then((r) => r.post);
export const getPosts = (name: string, before = 0, token = "") =>
  call<{ posts: SPost[] }>(`/api/posts?name=${encodeURIComponent(name)}${before ? `&before=${before}` : ""}`, { token }).then((r) => r.posts);
export const getAll = (before = 0, token = "") => call<{ posts: SPost[] }>(`/api/posts${before ? `?before=${before}` : ""}`, { token }).then((r) => r.posts);
export const getFeed = (token: string, before = 0) => call<{ posts: SPost[] }>(`/api/feed${before ? `?before=${before}` : ""}`, { token }).then((r) => r.posts);
export const findPeople = (q: string) => call<{ users: { name: string; avatar: string; bio: string }[] }>(`/api/people?q=${encodeURIComponent(q)}`).then((r) => r.users);

export const saveProfile = (token: string, p: Partial<Pick<SUser, "name" | "bio" | "country" | "link" | "avatar" | "banner">>) =>
  call<{ user: SUser }>("/api/profile", { token, post: p }).then((r) => r.user);
export const follow = (token: string, name: string, on: boolean) => call<{ user: SUser }>("/api/follow", { token, post: { name, on } }).then((r) => r.user);
export const publish = (token: string, text: string, media: string[] = []) => call<{ post: SPost }>("/api/post", { token, post: { text, media } }).then((r) => r.post);
export const editPost = (token: string, id: number, text: string) => call<{ post: SPost }>("/api/post/edit", { token, post: { id, text } }).then((r) => r.post);
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

/** Хук: текущий кошелёк, токен входа, «Войти» и «Выйти». Вход один на весь сайт (одна подпись на 14 дней) */
export function useSocial() {
  const account = useActiveAccount();
  const addr = account?.address;
  const [token, setToken] = useState("");
  const [me, setMe] = useState<SUser | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    const t = tokenFor(addr);
    setToken(t);
    if (!t) { setMe(null); return; }
    getMe(t).then(setMe).catch(() => { setMe(null); });
  }, [addr]);
  useEffect(() => {
    refresh();
    window.addEventListener(SESSION_EVENT, refresh);
    return () => window.removeEventListener(SESSION_EVENT, refresh);
  }, [refresh]);

  const signIn = useCallback(async () => {
    if (!account) throw new Error("auth");
    setBusy(true);
    try {
      try { sessionStorage.removeItem(AUTO_OFF); } catch { /* без хранилища */ }
      const t = await ensureToken(account); // одна подпись на 14 дней
      if (!t) throw new Error("auth");
      const full = pack(account.address, t);
      setToken(full);
      setMe(await getMe(full));
      window.dispatchEvent(new Event(SESSION_EVENT));
      return full;
    } finally { setBusy(false); }
  }, [account]);
  const signOut = useCallback(() => {
    if (addr) dropToken(addr);
    try { sessionStorage.setItem(AUTO_OFF, "1"); } catch { /* без хранилища */ }
    setToken(""); setMe(null);
    window.dispatchEvent(new Event(SESSION_EVENT));
  }, [addr]);

  return { addr, token, me, setMe, busy, signIn, signOut, signedIn: !!token };
}

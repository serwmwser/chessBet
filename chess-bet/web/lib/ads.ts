"use client";
// Объявления: клиент API (сервер: server/src/ads.ts).
import { API_URL } from "./config";

export type Kind = "sale" | "buy" | "rent" | "job" | "service";
export const KINDS: Kind[] = ["sale", "buy", "rent", "job", "service"];
/** Название раздела; slug используется в адресе страницы */
export const KIND_LABEL: Record<Kind, [string, string]> = {
  sale: ["Продажа", "For sale"],
  buy: ["Куплю", "Wanted"],
  rent: ["Аренда", "Rent"],
  job: ["Работа", "Jobs"],
  service: ["Услуги", "Services"],
};
export type Ad = {
  id: number; kind: Kind; title: string; price: number | null; currency: string; country: string; city: string; photos: string[];
  created: number; expires: number; pinned: boolean; seller: { name: string; avatar: string; level: number };
  preview?: string; body?: string; views?: number; status?: string; expired?: boolean; canRenew?: boolean;
};
export type AdInput = { id?: number; kind: Kind; title: string; body: string; price: number | null; currency: string; country: string; city: string; photos: string[] };
export type Place = { slug: string; country: string; count: number; cities: { slug: string; city: string; count: number }[] };
export type AdFilters = { kind: "" | Kind; country: string; city: string; q: string };
export const TITLE_MAX = 80;
export const BODY_MAX = 2000;
export const MAX_PHOTOS = 5;

/** Токен сайта имеет вид «адрес|токен»: в заголовки уходит и то и другое. Просмотр объявлений работает и без входа */
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

export const listAds = (f: AdFilters, page = 0, token = "") => {
  const q = new URLSearchParams({ page: String(page) });
  if (f.kind) q.set("kind", f.kind);
  if (f.country.trim()) q.set("country", f.country.trim());
  if (f.city.trim()) q.set("city", f.city.trim());
  if (f.q.trim()) q.set("q", f.q.trim());
  return call<{ items: Ad[]; next: number | null }>(`/api/ads/list?${q}`, { token });
};
export const getAd = (id: number, token = "") => call<{ item: Ad; mine: boolean }>(`/api/ads/item?id=${id}`, { token });
export const adPlaces = () => call<{ places: Place[] }>("/api/ads/places").then((r) => r.places);
export const myAds = (token: string) => call<{ items: Ad[] }>("/api/ads/mine", { token }).then((r) => r.items);
export const saveAd = (token: string, a: AdInput) => call<{ id: number }>("/api/ads/save", { post: a, token });
export const renewAd = (token: string, id: number) => call<{ expires: number }>("/api/ads/renew", { post: { id }, token });
export const deleteAd = (token: string, id: number) => call<object>("/api/ads/delete", { post: { id }, token });
export const reportAd = (token: string, id: number, reason = "") => call<object>("/api/ads/report", { post: { id, reason }, token });

/** Цена для показа: «150 USD», «Договорная» */
export function fmtPrice(a: Pick<Ad, "price" | "currency">, ru: boolean): string {
  if (a.price === null || a.price === undefined) return ru ? "Договорная" : "Negotiable";
  if (a.price === 0) return ru ? "Бесплатно" : "Free";
  return `${a.price.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 2 })} ${a.currency || ""}`.trim();
}
/** Адрес страницы раздела: /ads/?kind=sale&country=poland&city=warsaw */
export const adsQuery = (f: Partial<AdFilters>) => {
  const q = new URLSearchParams();
  if (f.kind) q.set("kind", f.kind);
  if (f.country) q.set("country", f.country);
  if (f.city) q.set("city", f.city);
  if (f.q) q.set("q", f.q);
  const s = q.toString();
  return s ? `?${s}` : "";
};

/** Понятный текст ошибки сервера (ru/en) */
export function adsError(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт", "Please sign in"],
    kind: ["Выберите раздел", "Choose a category"],
    title: ["Заголовок: не короче 4 символов", "Title must be at least 4 characters"],
    body: ["Описание: не короче 10 символов", "Description must be at least 10 characters"],
    country: ["Укажите страну", "Enter a country"],
    price: ["Проверьте цену", "Check the price"],
    contacts_not_allowed: ["Ссылки, телефоны и контакты в объявлении запрещены. Общайтесь в чате сайта", "Links, phones and contacts are not allowed. Use the site's chat"],
    too_many: ["Достигнут лимит активных объявлений (10)", "Active ads limit reached (10)"],
    duplicate: ["У вас уже есть объявление с таким заголовком", "You already have an ad with this title"],
    too_early: ["Продлить можно за 7 дней до окончания", "You can renew within 7 days of expiry"],
    slow_down: ["Слишком часто, попробуйте позже", "Too fast, try again later"],
    forbidden: ["Недоступно для этого аккаунта", "Not available for this account"],
    not_found: ["Объявление недоступно", "Ad is not available"],
    too_big: ["Слишком большой текст", "Text is too large"],
  };
  const x = m[code];
  return x ? (ru ? x[0] : x[1]) : ru ? "Ошибка, попробуйте ещё раз" : "Error, please try again";
}

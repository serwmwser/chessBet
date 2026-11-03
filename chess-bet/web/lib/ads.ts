"use client";
import { useEffect, useState } from "react";
import { API_URL } from "./config";

/** Рекламный слот страницы паузы. Список приходит с сервера (GET /ads); пустой список — блок не показывается. */
export type Ad = {
  type: "video" | "banner" | "cta" | "html";
  src?: string; href?: string; title?: string; subtitle?: string; button?: string; html?: string;
};
export const MAX_ADS = 10;
const web = (u?: string) => !!u && /^https?:\/\//i.test(u);

/** Проверка присланного списка: только известные типы, только http(s)-ссылки, HTML до 50 КБ без script */
export function cleanAds(list: unknown): Ad[] {
  if (!Array.isArray(list)) return [];
  const out: Ad[] = [];
  for (const x of list as Record<string, unknown>[]) {
    if (out.length >= MAX_ADS || !x || typeof x !== "object") continue;
    const s = (k: string) => (typeof x[k] === "string" ? (x[k] as string) : undefined);
    const type = s("type"), src = s("src"), href = s("href"), html = s("html");
    if ((type === "video" || type === "banner") && web(src)) out.push({ type, src, href: web(href) ? href : undefined });
    else if (type === "cta" && s("title") && web(href)) out.push({ type, title: s("title")!.slice(0, 120), subtitle: s("subtitle")?.slice(0, 200), button: s("button")?.slice(0, 24), href });
    else if (type === "html" && html && html.length <= 50_000 && !/<\s*script/i.test(html)) out.push({ type, html });
  }
  return out;
}

let cache: Ad[] = [];
/** Реклама для страницы паузы; пока сервер не ответил (или рекламы нет), список пуст */
export function useAds(): Ad[] {
  const [ads, setAds] = useState<Ad[]>(cache);
  useEffect(() => {
    let alive = true;
    fetch(API_URL + "/ads", { cache: "no-store" }).then((r) => r.json()).then((j) => { cache = cleanAds(j); if (alive) setAds(cache); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return ads;
}

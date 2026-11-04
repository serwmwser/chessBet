"use client";
// Перевод сообщений чата на язык сайта (сервер: server/src/translate.ts).
import { API_URL } from "./config";

const memo = new Map<string, { text: string; same: boolean }>();

/** Двухбуквенный код языка сайта для перевода; неизвестный язык — английский */
export const targetLang = (lang: string) => (lang || "en").toLowerCase().slice(0, 2);

/** Переводит текст на язык `to`. Результат запоминается на время работы страницы */
export async function translateText(token: string, text: string, to: string): Promise<{ text: string; same: boolean }> {
  const key = `${to}\n${text}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const [wallet, tok] = token.split("|");
  const r = await fetch(`${API_URL}/api/translate`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}) },
    body: JSON.stringify({ text, to }),
  });
  const j = (await r.json()) as { ok: boolean; error?: string; text?: string; same?: boolean };
  if (!j.ok || typeof j.text !== "string") throw new Error(j.error || "error");
  const out = { text: j.text, same: !!j.same };
  if (memo.size > 300) memo.clear();
  memo.set(key, out);
  return out;
}

/** Понятный текст ошибки перевода (ru/en) */
export function translateError(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт", "Please sign in"],
    slow_down: ["Слишком много переводов, попробуйте позже", "Too many translations, try again later"],
    unavailable: ["Переводчик сейчас недоступен или исчерпал лимит. Попробуйте позже", "The translator is unavailable or over its limit. Try again later"],
    lang: ["Этот язык пока не поддерживается", "This language is not supported yet"],
    empty: ["Нечего переводить", "Nothing to translate"],
  };
  const x = m[code];
  return x ? (ru ? x[0] : x[1]) : ru ? "Не удалось перевести" : "Could not translate";
}

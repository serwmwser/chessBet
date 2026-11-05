"use client";
// Автоперевод полей объявления на язык сайта через /api/translate (только для вошедших; сервер кэширует переводы).
import { useEffect, useState } from "react";
import { targetLang, translateText } from "./translate";

/** Длинный текст режем на части до 900 символов: так проходит лимит сервера */
function parts(text: string, n = 900): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    let l = line;
    while (l.length > n) { if (cur) { out.push(cur); cur = ""; } out.push(l.slice(0, n)); l = l.slice(n); }
    if ((cur ? cur + "\n" : "").length + l.length > n && cur) { out.push(cur); cur = ""; }
    cur = cur ? cur + "\n" + l : l;
  }
  if (cur) out.push(cur);
  return out;
}

async function tr(token: string, text: string, to: string): Promise<{ text: string; same: boolean }> {
  const res: string[] = [];
  let same = true;
  for (const p of parts(text)) {
    if (!p.trim()) { res.push(p); continue; }
    const r = await translateText(token, p, to);
    res.push(r.text);
    if (!r.same) same = false;
  }
  return { text: res.join("\n"), same };
}

/** Возвращает поля, переведённые на язык сайта, и признак «перевод применён». Без входа или при ошибке остаются оригиналы. */
export function useTranslated(src: Record<string, string>, token: string, lang: string, enabled = true) {
  const to = targetLang(lang);
  const key = JSON.stringify(src) + "|" + to + "|" + (token ? 1 : 0);
  const [res, setRes] = useState<{ key: string; out: Record<string, string>; translated: boolean } | null>(null);

  useEffect(() => {
    if (!enabled || !token || !Object.values(src).some((v) => v.trim())) return;
    let on = true;
    (async () => {
      const out: Record<string, string> = {};
      let any = false;
      for (const [k, v] of Object.entries(src)) {
        if (!v.trim()) { out[k] = v; continue; }
        try {
          const r = await tr(token, v, to);
          out[k] = r.text;
          if (!r.same) any = true;
        } catch { out[k] = v; }
      }
      if (on) setRes({ key, out, translated: any });
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const ok = !!res && res.key === key && res.translated;
  return { out: ok && res ? res.out : src, translated: ok };
}

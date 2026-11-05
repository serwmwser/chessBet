"use client";
import { useEffect, useRef } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { ensureToken, getToken } from "@/lib/session";
import { AUTO_OFF, SESSION_EVENT, errText } from "@/lib/social";
import { useApp } from "@/lib/ctx";
import { alog } from "@/lib/authlog";
import { needsTap } from "@/lib/signmode";

/** Один вход на весь сайт: после подключения кошелька просим ОДНУ подпись (токен на 14 дней).
 *  Её хватает для партий, профиля, ленты и постов. Отказались от подписи или нажали «Выйти» — до закрытия вкладки не пристаём. */
export default function AutoLogin() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { lang, toast } = useApp();
  const tried = useRef("");
  useEffect(() => {
    if (!account) return;
    const addr = account.address.toLowerCase();
    if (tried.current === addr || getToken(addr)) return;
    if (needsTap(wallet?.id)) return; // на телефоне подпись просим по нажатию кнопки в блоке входа
    try { if (sessionStorage.getItem(AUTO_OFF)) return; } catch { /* без хранилища */ }
    tried.current = addr;
    alog("кошелёк подключён " + addr.slice(0, 6) + "…" + addr.slice(-4));
    ensureToken(account)
      .then((t) => { if (t) window.dispatchEvent(new Event(SESSION_EVENT)); })
      .catch((e) => {
        try { sessionStorage.setItem(AUTO_OFF, "1"); } catch { /* без хранилища */ }
        const m = String((e as Error)?.message || e || "");
        if (!/reject|denied|cancel|declin|closed/i.test(m)) toast(errText(e, lang === "ru"), "err"); // отказ пользователя молчим, остальное показываем
      });
  }, [account, wallet, lang, toast]);
  return null;
}

"use client";
import { useEffect, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { ensureToken, getToken } from "@/lib/session";
import { AUTO_OFF, SESSION_EVENT } from "@/lib/social";

/** Один вход на весь сайт: после подключения кошелька просим ОДНУ подпись (токен на 14 дней).
 *  Её хватает для партий, профиля, ленты и постов. Отказались от подписи или нажали «Выйти» — до закрытия вкладки не пристаём. */
export default function AutoLogin() {
  const account = useActiveAccount();
  const tried = useRef("");
  useEffect(() => {
    if (!account) return;
    const addr = account.address.toLowerCase();
    if (tried.current === addr || getToken(addr)) return;
    try { if (sessionStorage.getItem(AUTO_OFF)) return; } catch { /* без хранилища */ }
    tried.current = addr;
    ensureToken(account)
      .then((t) => { if (t) window.dispatchEvent(new Event(SESSION_EVENT)); })
      .catch(() => { try { sessionStorage.setItem(AUTO_OFF, "1"); } catch { /* без хранилища */ } });
  }, [account]);
  return null;
}

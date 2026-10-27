"use client";
import { useEffect } from "react";
import { inTelegram } from "@/lib/telegram";

type TgWebApp = {
  ready: () => void; expand: () => void; setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void;
  disableVerticalSwipes?: () => void; initDataUnsafe?: { start_param?: string };
};
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const COLOR = "#0e2233"; // фон приложения

/** Внутри Telegram: подключает официальный скрипт Mini App, разворачивает на весь экран, красит шапку, отключает закрытие свайпом вниз и открывает партию по ссылке startapp=room_ID. Вне Telegram ничего не загружает. */
export default function TelegramInit() {
  useEffect(() => {
    if (!inTelegram()) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.async = true;
    s.onload = () => {
      try {
        const w = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
        if (!w) return;
        w.ready(); w.expand();
        w.setHeaderColor?.(COLOR); w.setBackgroundColor?.(COLOR);
        w.disableVerticalSwipes?.();
        const sp = w.initDataUnsafe?.start_param;
        const m = sp && /^room_([0-9a-f]{10})$/.exec(sp);
        if (m && !new URLSearchParams(location.search).get("room") && !sessionStorage.getItem("cb_tg_start")) {
          sessionStorage.setItem("cb_tg_start", "1");
          location.replace(`${BASE}/?room=${m[1]}`);
        }
      } catch { /* Mini App необязателен */ }
    };
    document.head.appendChild(s);
  }, []);
  return null;
}

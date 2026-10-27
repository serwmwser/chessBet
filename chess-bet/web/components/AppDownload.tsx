"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Карточка «Скачать для Android». Скрыта, если сайт уже открыт как установленное приложение. */
export default function AppDownload() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [hide, setHide] = useState(false);
  const [android, setAndroid] = useState(true);
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || document.referrer.startsWith("android-app://");
      setHide(standalone);
      setAndroid(/android/i.test(navigator.userAgent));
    } catch { /* ничего */ }
  }, []);
  if (hide) return null;
  return (
    <section className="card flex items-center gap-3" style={{ border: "1px solid #3ddc84" }}>
      <div className="text-3xl" aria-hidden="true">🤖</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold">{ru ? "Приложение для Android" : "Android app"}</div>
        <div className="text-xs opacity-70">
          {android
            ? (ru ? "Скачайте, откройте файл и разрешите установку." : "Download, open the file and allow installation.")
            : (ru ? "Скачайте на телефон с Android и установите." : "Download it on an Android phone and install.")}
        </div>
      </div>
      <a href={`${BASE}/Chess_Bet.apk`} download="Chess_Bet.apk" className="shrink-0 px-4 py-2 rounded-xl font-bold text-black" style={{ background: "#3ddc84" }}>
        {ru ? "Скачать" : "Download"}
      </a>
    </section>
  );
}

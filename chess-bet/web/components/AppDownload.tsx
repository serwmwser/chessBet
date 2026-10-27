"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

type InstallEvt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Карточка установки. На Android главная кнопка «Скачать APK», рядом «Установить» через браузер; на остальных устройствах только установка через браузер. Скрыта, если сайт уже открыт как приложение. */
export default function AppDownload() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [hide, setHide] = useState(false);
  const [android, setAndroid] = useState(false);
  const [evt, setEvt] = useState<InstallEvt | null>(null);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || document.referrer.startsWith("android-app://");
      setHide(standalone);
      setAndroid(/android/i.test(navigator.userAgent));
    } catch { /* ничего */ }
    const on = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvt); };
    const done = () => setHide(true);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (hide) return null;
  const install = async () => {
    if (!evt) { setHint(true); return; }
    try { await evt.prompt(); await evt.userChoice; } catch { /* отменили */ }
    setEvt(null);
  };
  const green = { background: "#3ddc84" } as const;
  return (
    <section className="card space-y-3" style={{ border: "1px solid #3ddc84" }}>
      <div className="flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">📲</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{ru ? "Приложение Chess Bet" : "Chess Bet app"}</div>
          <div className="text-xs opacity-70">{ru ? "Значок на экране, запуск без адресной строки." : "Home-screen icon, opens without the address bar."}</div>
        </div>
      </div>
      {android ? (
        <div className="grid grid-cols-1 gap-2">
          <a href={`${BASE}/Chess_Bet.apk`} download="Chess_Bet.apk" className="w-full text-center px-4 py-3 rounded-xl font-extrabold text-black text-base" style={{ ...green, boxShadow: "0 4px 0 rgba(0,0,0,.25)" }}>
            ⬇ {ru ? "Скачать APK для Android" : "Download Android APK"}
          </a>
          <div className="text-[11px] opacity-70">{ru ? "Откройте скачанный файл и разрешите установку. Если Play Защита спросит, нажмите «Всё равно установить»." : "Open the downloaded file and allow installation. If Play Protect asks, tap “Install anyway”."}</div>
          <button type="button" onClick={install} className="w-full px-4 py-2 rounded-xl font-bold border border-emerald-400/60 text-emerald-300">
            {ru ? "Или установить через браузер" : "Or install via browser"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={install} className="w-full px-4 py-3 rounded-xl font-extrabold text-black text-base" style={green}>
          {ru ? "Установить" : "Install"}
        </button>
      )}
      {hint && (
        <div className="text-xs opacity-80">
          {ru ? "Откройте меню браузера (три точки или кнопка «Поделиться») и выберите «Установить приложение» / «Добавить на главный экран»." : "Open the browser menu (three dots or the Share button) and choose “Install app” / “Add to Home screen”."}
        </div>
      )}
    </section>
  );
}

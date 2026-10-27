"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

type InstallEvt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Карточка «Установить приложение»: установка в один тап через браузер, а APK остаётся запасной ссылкой. Скрыта, если сайт уже открыт как приложение. */
export default function AppDownload() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [hide, setHide] = useState(false);
  const [android, setAndroid] = useState(true);
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
  return (
    <section className="card space-y-2" style={{ border: "1px solid #3ddc84" }}>
      <div className="flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">📲</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{ru ? "Установить приложение" : "Install the app"}</div>
          <div className="text-xs opacity-70">{ru ? "Значок на экране, запуск без адресной строки." : "Home-screen icon, opens without the address bar."}</div>
        </div>
        <button type="button" onClick={install} className="shrink-0 px-4 py-2 rounded-xl font-bold text-black" style={{ background: "#3ddc84" }}>
          {ru ? "Установить" : "Install"}
        </button>
      </div>
      {hint && (
        <div className="text-xs opacity-80">
          {ru ? "Откройте меню браузера (три точки или кнопка «Поделиться») и выберите «Установить приложение» / «Добавить на главный экран»." : "Open the browser menu (three dots or the Share button) and choose “Install app” / “Add to Home screen”."}
        </div>
      )}
      {android && (
        <div className="text-[11px] opacity-60">
          {ru ? "Не получается? " : "Not working? "}
          <a className="underline" href={`${BASE}/Chess_Bet.apk`} download="Chess_Bet.apk">{ru ? "Скачать APK для Android" : "Download Android APK"}</a>
        </div>
      )}
    </section>
  );
}

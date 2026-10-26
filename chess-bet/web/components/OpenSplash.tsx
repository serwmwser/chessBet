"use client";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Заставка при открытии сайта и приложения: картинка с фигурами и надписью chessbet.lol. Показывается один раз за сессию. */
export default function OpenSplash() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("cb_open_splash")) { setShow(false); return; }
      sessionStorage.setItem("cb_open_splash", "1");
    } catch { /* хранилище недоступно: просто покажем заставку */ }
    const t1 = setTimeout(() => setFade(true), 1700);
    const t2 = setTimeout(() => setShow(false), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      onClick={() => setShow(false)}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#04101c", opacity: fade ? 0 : 1, transition: "opacity .6s ease" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/splash.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom" }} />
    </div>
  );
}

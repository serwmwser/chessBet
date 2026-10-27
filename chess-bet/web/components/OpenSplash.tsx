"use client";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Заставка при открытии сайта и приложения. Скрывается чисто через CSS за ~2 секунды (не зависит от загрузки скриптов), внизу полоска загрузки. */
export default function OpenSplash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("cb_open_splash")) { setShow(false); return; }
      sessionStorage.setItem("cb_open_splash", "1");
    } catch { /* хранилище недоступно: заставка уйдёт сама по CSS */ }
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div aria-hidden="true" className="cb-os" onClick={() => setShow(false)}>
      <style>{`
        .cb-os{position:fixed;inset:0;z-index:9999;background:#04101c;animation:cbosOut .5s ease 1.9s forwards}
        .cb-os img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block}
        .cb-os i{position:absolute;left:18%;right:18%;bottom:max(28px,env(safe-area-inset-bottom));height:5px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden}
        .cb-os i b{display:block;height:100%;width:100%;background:#ffc400;border-radius:5px;transform-origin:left;animation:cbosBar 1.9s ease-out forwards}
        @keyframes cbosBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes cbosOut{to{opacity:0;visibility:hidden;pointer-events:none}}
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/splash.jpg`} alt="" />
      <i><b /></i>
    </div>
  );
}

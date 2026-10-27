"use client";
import { useState } from "react";
import { useApp } from "@/lib/ctx";

/** «Проверить обновление»: сбрасывает кэш и сервис-воркер и перезагружает страницу со свежей версией. */
export default function UpdateButton() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* всё равно перезагрузим */ }
    const u = new URL(location.href);
    u.searchParams.set("v", String(Date.now()));
    location.replace(u.toString());
  };
  return (
    <button type="button" className="chip" disabled={busy} onClick={run}>
      {busy ? (ru ? "Обновляю…" : "Updating…") : (ru ? "🔄 Проверить обновление" : "🔄 Check for update")}
    </button>
  );
}

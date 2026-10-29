"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";

const GA_ID = "G-479YKFSZTQ";
const KEY = "chessbet.consent";
type G = (...a: unknown[]) => void;
const gtagOf = (): G | null => { try { return (window as unknown as { gtag?: G }).gtag ?? null; } catch { return null; } };

const TXT = {
  en: { t: "We use cookies for anonymous visit statistics. Accept?", y: "Accept", n: "Decline" },
  ru: { t: "Мы используем cookie для анонимной статистики посещений. Принять?", y: "Принять", n: "Отклонить" },
};

/** Google Analytics 4 с режимом согласия: без согласия cookie не ставятся, плашка спрашивает один раз */
export default function Analytics() {
  const { lang } = useApp();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* хранилище недоступно */ }
    if (v === "granted") gtagOf()?.("consent", "update", { analytics_storage: "granted" });
    else if (v !== "denied") setAsk(true);
  }, []);

  const choose = (granted: boolean) => {
    try { localStorage.setItem(KEY, granted ? "granted" : "denied"); } catch { /* ничего */ }
    gtagOf()?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
    setAsk(false);
  };

  const tx = lang === "ru" ? TXT.ru : TXT.en;
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { anonymize_ip: true });
      `}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      {ask && (
        <div role="dialog" aria-label="Cookies" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-slate-900/95 text-white p-3 shadow-xl border border-white/10 flex items-center gap-3 text-xs">
          <span className="flex-1">{tx.t}</span>
          <button type="button" onClick={() => choose(false)} className="px-3 py-1.5 rounded-lg border border-white/30">{tx.n}</button>
          <button type="button" onClick={() => choose(true)} className="px-3 py-1.5 rounded-lg font-bold text-black" style={{ background: "#f5b301" }}>{tx.y}</button>
        </div>
      )}
    </>
  );
}

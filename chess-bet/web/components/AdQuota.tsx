"use client";
// Плашка «Бесплатных объявлений: N» и реферальная ссылка (за каждого приглашённого друга +1 бесплатное объявление).
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { adsQuota, type Quota } from "@/lib/classifieds";
import { refLink } from "@/lib/ref";

export default function AdQuota({ token, addr }: { token: string; addr: string }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [q, setQ] = useState<Quota | null>(null);

  useEffect(() => {
    if (!token) { setQ(null); return; }
    let on = true;
    adsQuota(token).then((r) => { if (on) setQ(r); }).catch(() => {});
    return () => { on = false; };
  }, [token]);

  if (!q) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(refLink(addr)); toast(ru ? "Ссылка скопирована" : "Link copied", "ok"); }
    catch { toast(ru ? "Не удалось скопировать" : "Could not copy", "err"); }
  };
  return (
    <section className="card space-y-2 text-sm">
      <p>
        <b>{ru ? "Бесплатных объявлений" : "Free ads left"}: {q.left}</b>
        <span className="opacity-70"> ({ru ? "всего" : "total"} {q.credits}, {ru ? "использовано" : "used"} {q.used})</span>
      </p>
      <p className="opacity-80">
        {q.left > 0
          ? (ru ? "Первое объявление бесплатно. За каждого приглашённого друга, который зарегистрировался и начал пользоваться сайтом, вы получаете ещё одно бесплатное." : "Your first ad is free. For every invited friend who signs up and starts using the site you get one more free ad.")
          : (ru ? "Бесплатные объявления закончились. Платное размещение (1 USDC) скоро появится. Пригласите друга и получите ещё одно бесплатное." : "Free ads are used up. Paid posting (1 USDC) is coming soon. Invite a friend to get one more free ad.")}
      </p>
      {addr && <button type="button" className="btn btn-ghost !py-2" onClick={() => void copy()}>🔗 {ru ? "Скопировать ссылку для друзей" : "Copy invite link"}</button>}
    </section>
  );
}

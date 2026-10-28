"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import Share from "@/components/Share";
import { TG_BOT_URL, inTelegram } from "@/lib/telegram";

export default function TelegramCard() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [hide, setHide] = useState(true);
  useEffect(() => { setHide(inTelegram()); }, []);
  if (hide) return null;
  return (
    <section className="card space-y-3" style={{ border: "1px solid #2aabee" }}>
      <div className="flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">✈️</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{ru ? "Играйте в Telegram" : "Play in Telegram"}</div>
          <div className="text-xs opacity-70">{ru ? "Откройте Chess Bet прямо в мессенджере и зовите друзей одним касанием." : "Open Chess Bet inside Telegram and invite friends in one tap."}</div>
        </div>
      </div>
      <a href={TG_BOT_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-3 rounded-xl font-extrabold text-white text-base" style={{ background: "#2aabee", boxShadow: "0 4px 0 rgba(0,0,0,.25)" }}>
        ✈️ {ru ? "Открыть в Telegram" : "Open in Telegram"}
      </a>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(TG_BOT_URL); toast(ru ? "Ссылка скопирована" : "Link copied", "ok"); } catch { window.prompt(ru ? "Скопируйте ссылку" : "Copy the link", TG_BOT_URL); } }} className="w-full px-4 py-2 rounded-xl font-bold border border-sky-400/60 text-sky-300">
        📋 {ru ? "Скопировать ссылку" : "Copy link"}
      </button>
      <Share url={TG_BOT_URL} text={ru ? "Шахматы Chess Bet в Telegram" : "Chess Bet chess in Telegram"} />
    </section>
  );
}

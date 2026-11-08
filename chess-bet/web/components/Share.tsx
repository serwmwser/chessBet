"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { setShareDraft, shareNets } from "@/lib/shareNets";
import NetBadge from "./NetBadge";

/** Кнопки отправки ссылки (приглашение, игра, реферальная ссылка): системное меню телефона, Rook Club, копирование с отметкой «Скопировано» и значки соцсетей. */
export default function Share({ url, text }: { url: string; text: string }) {
  const { t, toast, lang } = useApp();
  const ru = lang === "ru";
  const [native, setNative] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setNative(typeof navigator.share === "function");
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(t("linkCopied"), "ok"); }
    catch { window.prompt(t("copyLink"), url); return; }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  const inApp = () => {
    setShareDraft(`${text} ${url}`);
    window.location.assign(`${ROUTES.profile}?tab=chat&share=1`);
  };
  const pill = "chip inline-flex items-center gap-1.5";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {native && (
          <button type="button" className={pill + " chip-on"} onClick={() => navigator.share({ title: "Chess Bet", text, url }).catch(() => {})}>↗ {t("share")}</button>
        )}
        <button type="button" className={pill} onClick={inApp}>♜ {ru ? "В Rook Club" : "Rook Club"}</button>
        <button type="button" className={pill} onClick={copy} aria-live="polite">{copied ? "✓ " + (ru ? "Скопировано" : "Copied") : "🔗 " + t("copyLink")}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ru ? "Поделиться в соцсетях" : "Share on social networks"}>
        {shareNets(url, text).map((n) => (
          <a key={n.name} href={n.href} target="_blank" rel="noopener noreferrer" aria-label={n.name} title={n.name}
            className="rounded-full transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            <NetBadge glyph={n.glyph} color={n.color} size={34} />
          </a>
        ))}
      </div>
    </div>
  );
}

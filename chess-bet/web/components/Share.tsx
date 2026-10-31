"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { setShareDraft, shareNets } from "@/lib/shareNets";

/** Кнопки отправки ссылки (приглашение, игра, реферальная ссылка): в Rook Club сообщением, системное меню телефона, соцсети, копирование. */
export default function Share({ url, text }: { url: string; text: string }) {
  const { t, toast, lang } = useApp();
  const ru = lang === "ru";
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(typeof navigator.share === "function"); }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(t("linkCopied"), "ok"); }
    catch { window.prompt(t("copyLink"), url); }
  };
  const inApp = () => {
    setShareDraft(`${text} ${url}`);
    window.location.assign(`${ROUTES.profile}?tab=chat&share=1`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {native && (
        <button className="chip chip-on" onClick={() => navigator.share({ title: "Chess Bet", text, url }).catch(() => {})}>{t("share")}</button>
      )}
      <button className="chip" onClick={inApp}>♜ {ru ? "В Rook Club" : "Rook Club"}</button>
      {shareNets(url, text).map((n) => (
        <a key={n.name} className="chip" target="_blank" rel="noreferrer" href={n.href}>{n.name}</a>
      ))}
      <button className="chip" onClick={copy}>{t("copyLink")}</button>
    </div>
  );
}

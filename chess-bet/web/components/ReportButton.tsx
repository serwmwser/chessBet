"use client";
import { useState } from "react";
import { useApp } from "@/lib/ctx";
import { modErr, reportPost, reportUser } from "@/lib/mod";

/** Кнопка «Пожаловаться» на пост (kind="post", id) или профиль (kind="user", name). Показывается только вошедшим */
export default function ReportButton({ kind, id, name, token, className = "text-xs opacity-60 hover:opacity-100" }: {
  kind: "post" | "user"; id?: number; name?: string; token: string; className?: string;
}) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [sent, setSent] = useState(false);
  if (!token) return null;
  const go = async () => {
    const reason = window.prompt(ru ? "Почему вы жалуетесь? (можно оставить пустым)" : "Why are you reporting this? (optional)", "");
    if (reason === null) return; // нажали «Отмена»
    try {
      if (kind === "post") await reportPost(token, id || 0, reason);
      else await reportUser(token, name || "", reason);
      setSent(true);
      toast(ru ? "Жалоба отправлена. Спасибо!" : "Report sent. Thank you!", "ok");
    } catch (e) { toast(modErr(e, ru), "err"); }
  };
  return (
    <button type="button" onClick={go} disabled={sent} className={className} aria-label={ru ? "Пожаловаться" : "Report"}>
      {sent ? (ru ? "✓ Отправлено" : "✓ Sent") : `⚑ ${ru ? "Пожаловаться" : "Report"}`}
    </button>
  );
}

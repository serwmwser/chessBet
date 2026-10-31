"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { setShareDraft, shareNets } from "@/lib/shareNets";

/** Кнопка «Поделиться» с меню: отправка в Rook Club (личным сообщением), Telegram, WhatsApp, X, Facebook, VK, Reddit, LinkedIn, e-mail, копирование, системное меню */
export default function ShareMenu({ url, text, label, className }: { url: string; text: string; label?: string; className?: string }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  const item = "block w-full text-start px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10";
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const inApp = () => {
    setShareDraft(`${text} ${url}`);
    window.location.assign(`${ROUTES.profile}?tab=chat&share=1`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(ru ? "Ссылка скопирована" : "Link copied", "ok"); }
    catch { window.prompt(ru ? "Скопируйте ссылку:" : "Copy the link:", url); }
    setOpen(false);
  };
  const native = async () => {
    try { await navigator.share({ title: "Rook Club", text, url }); } catch { /* окно закрыли */ }
    setOpen(false);
  };

  return (
    <div ref={root} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className={className || "opacity-70 hover:opacity-100"}>
        ↗ {label || (ru ? "Поделиться" : "Share")}
      </button>
      {open && (
        <div role="menu" className="absolute z-30 start-0 top-full mt-1 min-w-[14rem] max-h-80 overflow-y-auto rounded-xl border shadow-lg bg-white dark:bg-ink-800 text-inherit">
          <button type="button" role="menuitem" className={item} onClick={inApp}><span aria-hidden className="inline-block w-6">♜</span>{ru ? "В Rook Club (сообщением)" : "In Rook Club (message)"}</button>
          {canNative && <button type="button" role="menuitem" className={item} onClick={native}><span aria-hidden className="inline-block w-6">📱</span>{ru ? "Через приложения телефона…" : "Via your apps…"}</button>}
          {shareNets(url, text).map((n) => (
            <a key={n.name} role="menuitem" className={item} target="_blank" rel="noopener noreferrer" href={n.href} onClick={() => setOpen(false)}>
              <span aria-hidden className="inline-block w-6">{n.icon}</span>{n.name}
            </a>
          ))}
          <button type="button" role="menuitem" className={item} onClick={copy}><span aria-hidden className="inline-block w-6">🔗</span>{ru ? "Копировать ссылку" : "Copy link"}</button>
        </div>
      )}
    </div>
  );
}

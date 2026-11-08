"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { setShareDraft, shareNets } from "@/lib/shareNets";
import NetBadge from "./NetBadge";

/** Кнопка «Поделиться»: открывает окно (снизу на телефоне) со ссылкой, копированием, Rook Club, системным меню и значками соцсетей */
export default function ShareMenu({ url, text, label, className }: { url: string; text: string; label?: string; className?: string }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const inApp = () => {
    setShareDraft(`${text} ${url}`);
    window.location.assign(`${ROUTES.profile}?tab=chat&share=1`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(ru ? "Ссылка скопирована" : "Link copied", "ok"); }
    catch { window.prompt(ru ? "Скопируйте ссылку:" : "Copy the link:", url); return; }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  const native = async () => {
    try { await navigator.share({ title: "Rook Club", text, url }); } catch { /* окно закрыли */ }
    setOpen(false);
  };

  const tile = "flex flex-col items-center gap-1 rounded-xl p-1 text-center text-[11px] leading-tight transition hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={className || "opacity-70 hover:opacity-100"}>
        ↗ {label || (ru ? "Поделиться" : "Share")}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={ru ? "Поделиться" : "Share"}>
          <button type="button" tabIndex={-1} aria-label={ru ? "Закрыть" : "Close"} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 text-neutral-900 shadow-2xl sm:max-w-sm sm:rounded-2xl dark:bg-ink-800 dark:text-white">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">↗ {label || (ru ? "Поделиться" : "Share")}</h2>
              <button type="button" className="text-2xl leading-none opacity-60 hover:opacity-100" onClick={() => setOpen(false)} aria-label={ru ? "Закрыть" : "Close"}>✕</button>
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-black/5 p-2 dark:bg-white/10">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={ru ? "Ссылка" : "Link"} dir="ltr" className="min-w-0 flex-1 bg-transparent px-1 text-xs outline-none" />
              <button type="button" className="chip chip-on shrink-0" onClick={copy} aria-live="polite">{copied ? "✓ " + (ru ? "Готово" : "Done") : ru ? "Копировать" : "Copy"}</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" className={tile} onClick={inApp}><NetBadge glyph="♜" color="#7C3AED" size={44} />{ru ? "Rook Club" : "Rook Club"}</button>
              {canNative && <button type="button" className={tile} onClick={native}><NetBadge glyph="↗" color="#0EA5E9" size={44} />{ru ? "Приложения" : "Apps"}</button>}
              {shareNets(url, text).map((n) => (
                <a key={n.name} className={tile} href={n.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                  <NetBadge glyph={n.glyph} color={n.color} size={44} />{n.name.replace(" (Twitter)", "")}
                </a>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

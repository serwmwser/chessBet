"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { encodeFile, fileErr, uploadFile } from "@/lib/attach";

/** Кнопка «прикрепить файл» (фото или PDF до 5 МБ): после загрузки отдаёт служебную строку вложения в onFile */
export default function AttachButton({ token, onFile, disabled }: { token: string; onFile: (marker: string) => void | Promise<void>; disabled?: boolean }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f || busy) return;
    setBusy(true);
    try { const r = await uploadFile(token, f); await onFile(encodeFile(r.path, r.bytes)); }
    catch (e) { toast(fileErr(e, ru), "err"); }
    finally { setBusy(false); }
  };
  const label = ru ? "Прикрепить фото или PDF (до 5 МБ)" : "Attach a photo or PDF (up to 5 MB)";
  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
      <button type="button" className="btn btn-ghost shrink-0 !rounded-full" style={{ padding: 7, minHeight: 0, lineHeight: 0 }} disabled={disabled || busy}
        onClick={() => input.current?.click()} aria-label={label} title={label}>
        {busy ? "…" : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
          </svg>
        )}
      </button>
    </>
  );
}

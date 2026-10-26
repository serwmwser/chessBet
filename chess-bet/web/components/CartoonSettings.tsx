"use client";
import { speak } from "@/lib/cheers";
import { packOf, PAWN_NAMES, useCartoonPrefs, VOICE_PACKS } from "@/lib/cartoonPrefs";
import { useApp } from "@/lib/ctx";

/** Личные настройки мультяшного режима: пешки белых и чёрных и голос фигур (видны только вам) */
export default function CartoonSettings() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [p, set] = useCartoonPrefs();
  const pk = packOf(p.pack);
  const chips = (cur: number, on: (i: number) => void) => (
    <div className="flex gap-2 flex-wrap">
      {PAWN_NAMES.map((n, i) => <button key={i} type="button" className={"chip " + (cur === i ? "chip-on" : "")} onClick={() => on(i)}>{ru ? n[0] : n[1]}</button>)}
    </div>
  );
  return (
    <details className="card group">
      <summary className="cursor-pointer list-none flex items-center justify-between font-bold">
        <span>🎨 {ru ? "Мои фигуры и голос" : "My pieces and voice"}</span>
        <span className="opacity-50 transition group-open:rotate-180" aria-hidden>▾</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-xs opacity-70">{ru ? "Это видите только вы: у соперника свои настройки." : "Only you see this: your opponent has their own settings."}</p>
        <div><div className="opacity-70 mb-1">{ru ? "Пешки белых" : "White pawns"}</div>{chips(p.pawnW, (i) => set({ pawnW: i }))}</div>
        <div><div className="opacity-70 mb-1">{ru ? "Пешки чёрных" : "Black pawns"}</div>{chips(p.pawnB, (i) => set({ pawnB: i }))}</div>
        <div>
          <div className="opacity-70 mb-1">{ru ? "Голос фигур" : "Voice of the pieces"}</div>
          <div className="flex gap-2 flex-wrap">
            {VOICE_PACKS.map((v) => <button key={v.id} type="button" className={"chip " + (p.pack === v.id ? "chip-on" : "")} onClick={() => set({ pack: v.id })}>{ru ? v.ru : v.en}</button>)}
          </div>
          <button type="button" className="btn btn-ghost mt-2" onClick={() => speak(ru ? "Привет! Я ваша фигура. Ход за вами!" : "Hello! I am your piece. Your move!", ru ? "ru-RU" : "en-US", 1.2 * pk.pitch, pk.rate)}>
            🔊 {ru ? "Проверить голос" : "Test the voice"}
          </button>
        </div>
      </div>
    </details>
  );
}

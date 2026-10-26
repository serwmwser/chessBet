"use client";
import { speak } from "@/lib/cheers";
import { CARTOON_BOARDS, packOf, PAWN_NAMES, useCartoonPrefs, VOICE_PACKS } from "@/lib/cartoonPrefs";
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
        <div>
          <div className="opacity-70 mb-1">{ru ? "Набор фигур" : "Piece set"}</div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={"chip " + (p.team === "clay" ? "chip-on" : "")} onClick={() => set({ team: "clay" })}>{ru ? "Мультяшные" : "Cartoon"}</button>
            <button type="button" className={"chip " + (p.team === "knights" ? "chip-on" : "")} onClick={() => set({ team: "knights" })}>⚔️ {ru ? "Рыцари" : "Knights"}</button>
          </div>
        </div>
        <div>
          <div className="opacity-70 mb-1">{ru ? "Доска" : "Board"}</div>
          <div className="flex gap-2 flex-wrap">
            {CARTOON_BOARDS.map((b) => (
              <button key={b.id} type="button" className={"chip " + (p.cboard === b.id ? "chip-on" : "")} onClick={() => set({ cboard: b.id })}>
                <span aria-hidden style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, marginInlineEnd: 6, background: `linear-gradient(135deg, ${b.light} 50%, ${b.dark} 50%)`, border: "1px solid rgba(0,0,0,.2)" }} />
                {ru ? b.ru : b.en}
              </button>
            ))}
          </div>
        </div>
        {p.team === "clay" && <div><div className="opacity-70 mb-1">{ru ? "Пешки белых" : "White pawns"}</div>{chips(p.pawnW, (i) => set({ pawnW: i }))}</div>}
        {p.team === "clay" && <div><div className="opacity-70 mb-1">{ru ? "Пешки чёрных" : "Black pawns"}</div>{chips(p.pawnB, (i) => set({ pawnB: i }))}</div>}
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

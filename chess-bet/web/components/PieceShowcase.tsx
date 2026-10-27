"use client";
import { ReactNode, useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { useCartoonPrefs } from "@/lib/cartoonPrefs";
import Piece from "./cartoon/Pieces";
import Knight from "./cartoon/Knights";
import { CARTOON_CSS } from "./cartoon/Character";
import Share from "./Share";

const SEEN = "cb_knights_seen";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Витрина наборов фигур для мультяшного режима: картинки, выбор в одно касание, значок «НОВОЕ» и «показать друзьям». */
export default function PieceShowcase() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [p, set] = useCartoonPrefs();
  const [seen, setSeen] = useState(true);
  const [url, setUrl] = useState("");
  useEffect(() => {
    try { setSeen(localStorage.getItem(SEEN) === "1"); } catch { setSeen(false); }
    setUrl(location.origin + BASE + "/");
  }, []);
  const pick = (team: "clay" | "knights") => {
    set({ team });
    if (team === "knights") { try { localStorage.setItem(SEEN, "1"); } catch { /* без сохранения */ } setSeen(true); }
  };
  const cards: { id: "clay" | "knights"; title: string; sub: string; w: ReactNode; b: ReactNode; isNew?: boolean }[] = [
    { id: "clay", title: ru ? "Мультяшные" : "Cartoon", sub: ru ? "Забавные персонажи" : "Funny characters", w: <Piece type="k" side="w" size={56} animate={false} />, b: <Piece type="k" side="b" size={56} animate={false} /> },
    { id: "knights", title: "⚔️ " + (ru ? "Рыцари" : "Knights"), sub: ru ? "Игрушечные рыцари" : "Toy knights", isNew: !seen, w: <Knight type="k" side="w" size={56} animate={false} />, b: <Knight type="k" side="b" size={56} animate={false} /> },
  ];
  return (
    <section className="card space-y-3">
      <style>{CARTOON_CSS}</style>
      <h2 className="text-lg font-bold">🎨 {ru ? "Выберите фигуры" : "Choose your pieces"}</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button key={c.id} type="button" onClick={() => pick(c.id)} className={"relative rounded-2xl p-3 pt-5 text-center bg-black/5 dark:bg-white/5 transition " + (p.team === c.id ? "ring-2 ring-emerald-500" : "opacity-90 hover:opacity-100")}>
            {c.isNew && <span className="absolute -top-2 end-2 rounded-full bg-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5">{ru ? "НОВОЕ" : "NEW"}</span>}
            <div className="flex justify-center gap-1 min-h-[78px]">{c.w}{c.b}</div>
            <div className="font-bold text-sm mt-1">{c.title}</div>
            <div className="text-xs opacity-70">{p.team === c.id ? "✓ " + (ru ? "выбрано" : "selected") : c.sub}</div>
          </button>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer opacity-80">{ru ? "Показать друзьям" : "Show your friends"}</summary>
        <div className="mt-2">
          <Share url={url} text={ru ? "Новые фигуры «Рыцари» в Chess Bet: играй с мультяшными рыцарями!" : "New “Knights” pieces in Chess Bet: play with toy knights!"} />
        </div>
      </details>
      <p className="text-[11px] opacity-60">{ru ? "Выбор виден только вам: соперник играет со своим набором." : "Only you see your choice: your opponent plays with their own set."}</p>
    </section>
  );
}

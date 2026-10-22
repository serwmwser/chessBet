"use client";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { BOARDS, useApp } from "@/lib/ctx";
import { piecesFor, usePieceSet } from "@/lib/pieces";
import Avatar from "./Avatar";

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`;
};

export function Clock({ ms, active, label, who }: { ms: number; active: boolean; label: string; who?: { name?: string; avatar?: string } }) {
  const low = ms < 30_000;
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-2.5 border transition ${active ? "border-emerald-500/60 bg-emerald-500/10" : "border-transparent bg-black/5 dark:bg-white/5"}`}>
      <span className="flex items-center gap-2 min-w-0">
        {who && <Avatar src={who.avatar} name={who.name || label} size={32} />}
        <span className="text-sm opacity-80 truncate">{label}</span>
      </span>
      <span className={`mono text-xl font-semibold ${low && active ? "text-red-500" : ""}`}>{fmtClock(ms)}</span>
    </div>
  );
}

export function Moves({ san }: { san: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [san.length]);
  const rows: [string, string?][] = [];
  for (let i = 0; i < san.length; i += 2) rows.push([san[i], san[i + 1]]);
  return (
    <div ref={ref} className="mono text-sm max-h-28 overflow-y-auto rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2 grid grid-cols-[auto_1fr_1fr] gap-x-3" dir="ltr">
      {rows.map((r, i) => (
        <div key={i} className="contents"><span className="opacity-50">{i + 1}.</span><span>{r[0]}</span><span>{r[1] ?? ""}</span></div>
      ))}
    </div>
  );
}

function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 220; o.type = "triangle";
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.1);
    setTimeout(() => ctx.close(), 300);
  } catch { /* звук необязателен */ }
}

type Props = {
  fen: string;
  orientation: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  disabled?: boolean;
  mute?: boolean; // без звука (например, при просмотре истории партии)
  onMove: (from: string, to: string, promotion?: string) => void;
  pieces?: ReturnType<typeof piecesFor>; // свои фигуры (мультяшная доска); без параметра — выбранный набор
};

export default function Board({ fen, orientation, lastMove, disabled, mute, onMove, pieces }: Props) {
  const { board } = useApp();
  const [pset] = usePieceSet();
  const [sel, setSel] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const mine = orientation === "white" ? "w" : "b";
  const first = useRef(true);

  useEffect(() => {
    setSel(null); setPromo(null);
    if (first.current) { first.current = false; return; }
    if (!mute) beep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const legal = useMemo(() => (sel ? chess.moves({ square: sel as Square, verbose: true }) : []), [sel, chess]);

  const tryMove = (from: string, to: string) => {
    const m = chess.moves({ square: from as Square, verbose: true }).find((x) => x.to === to);
    if (!m) return false;
    if (m.promotion) { setPromo({ from, to }); return true; }
    onMove(from, to);
    return true;
  };

  const styles: Record<string, CSSProperties> = {};
  if (lastMove) {
    styles[lastMove.from] = { background: "rgba(250,204,21,.38)" };
    styles[lastMove.to] = { background: "rgba(250,204,21,.38)" };
  }
  if (sel) styles[sel] = { background: "rgba(16,185,129,.55)" };
  for (const m of legal) {
    styles[m.to] = {
      ...styles[m.to],
      background: m.captured
        ? "radial-gradient(circle, transparent 55%, rgba(16,185,129,.55) 58%)"
        : "radial-gradient(circle, rgba(16,185,129,.55) 20%, transparent 22%)",
    };
  }

  const glyph: Record<string, string> = mine === "w" ? { q: "♕", r: "♖", b: "♗", n: "♘" } : { q: "♛", r: "♜", b: "♝", n: "♞" };

  return (
    <div className="relative w-full max-w-[560px] mx-auto" dir="ltr">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={!disabled && !promo}
        animationDuration={180}
        customDarkSquareStyle={{ backgroundColor: BOARDS[board][1] }}
        customLightSquareStyle={{ backgroundColor: BOARDS[board][0] }}
        customPieces={pieces ?? piecesFor(pset)}
        customBoardStyle={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 50px -18px rgba(0,0,0,.55)" }}
        customSquareStyles={styles}
        onPromotionCheck={() => false}
        isDraggablePiece={({ piece }) => piece[0] === mine}
        onPieceDrop={(from, to) => {
          if (disabled) return false;
          tryMove(from, to);
          return false; // позицию обновит родитель (после ответа сервера / хода локально)
        }}
        onSquareClick={(sq) => {
          if (disabled) return;
          if (sel && sel !== sq && tryMove(sel, sq)) { if (!promo) setSel(null); return; }
          const p = chess.get(sq as Square);
          setSel(p && p.color === mine ? sq : null);
        }}
      />
      {promo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 rounded-2xl">
          <div className="glass rounded-3xl p-3 flex gap-2">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                className="w-16 h-16 text-5xl rounded-2xl bg-white/80 text-slate-900 hover:scale-105 transition"
                onClick={() => { const pr = promo; setPromo(null); setSel(null); onMove(pr.from, pr.to, p); }}
                aria-label={p}
              >{glyph[p]}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

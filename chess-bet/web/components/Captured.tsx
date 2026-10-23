"use client";
import type { PType } from "@/lib/material";
import Piece from "./cartoon/Pieces";

const GLYPH: Record<PType, string> = { p: "\u265F", n: "\u265E", b: "\u265D", r: "\u265C", q: "\u265B" };

/** Взятые фигуры противника (color = цвет самих фигур) и перевес игрока в очках. Одинаковые фигуры чуть накладываются друг на друга. */
export default function Captured({ taken, color, plus, cartoon = false, pawn = 0 }: { taken: PType[]; color: "w" | "b"; plus: number; cartoon?: boolean; pawn?: number }) {
  return (
    <div className="flex items-center gap-2 min-h-7 px-1" dir="ltr" aria-label="captured">
      <div className="flex items-center">
        {taken.map((t, i) => {
          const gap = i === 0 ? 0 : taken[i - 1] === t ? -(cartoon ? 8 : 7) : 4;
          return cartoon ? (
            <span key={i} className="inline-flex" style={{ marginLeft: gap }}>
              <Piece type={t} side={color} size={20} variant={pawn} animate={false} />
            </span>
          ) : (
            <span
              key={i}
              className="leading-none select-none"
              style={{
                marginLeft: gap,
                fontSize: 22,
                color: color === "w" ? "#ffffff" : "#1c1c26",
                WebkitTextStroke: color === "w" ? "0.8px #5d6573" : "0.6px #d4dae4",
                paintOrder: "stroke fill",
              }}
            >
              {GLYPH[t] + "\uFE0E"}
            </span>
          );
        })}
      </div>
      {plus > 0 && <span className="text-xs font-bold opacity-80">+{plus}</span>}
    </div>
  );
}

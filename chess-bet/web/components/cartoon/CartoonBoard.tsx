"use client";
import { ComponentProps, ReactElement, useMemo } from "react";
import Board from "../Board";
import Piece, { PieceType } from "./Pieces";
import { CARTOON_CSS, type Mood } from "./Character";

type BoardProps = ComponentProps<typeof Board>;
type PieceFn = (a: { squareWidth: number }) => ReactElement;

/** Набор для доски: wP, bN и т.д. pawnW / pawnB выбирают персонажа-пешку. moods: настроение по ключу «цвет+тип» (wN, bK...). Все фигуры моргают, короли ещё и покачивают головой. */
function build(pawnW: number, pawnB: number, moods: Record<string, Mood>): BoardProps["pieces"] {
  const out: Record<string, PieceFn> = {};
  for (const side of ["w", "b"] as const) {
    for (const t of ["P", "N", "B", "R", "Q", "K"]) {
      const type = t.toLowerCase() as PieceType;
      const variant = side === "w" ? pawnW : pawnB;
      const mood = moods[side + t] ?? "idle";
      const animate: boolean | "blink" = t === "K" || mood !== "idle" ? true : "blink";
      out[side + t] = ({ squareWidth }) => (
        <div style={{ width: squareWidth, height: squareWidth, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          <Piece type={type} side={side} size={squareWidth * 0.8} variant={variant} animate={animate} mood={mood} />
        </div>
      );
    }
  }
  return out as unknown as BoardProps["pieces"];
}

/** Доска с мультяшными фигурами: вся логика (ходы, подсветка, превращение, звук) та же, что у обычной доски. */
export default function CartoonBoard({ pawnW = 1, pawnB = 0, moods, ...rest }: Omit<BoardProps, "pieces"> & { pawnW?: number; pawnB?: number; moods?: Record<string, Mood> }) {
  const key = JSON.stringify(moods ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => build(pawnW, pawnB, moods ?? {}), [pawnW, pawnB, key]);
  return (
    <>
      <style>{CARTOON_CSS}</style>
      <Board {...rest} pieces={pieces} />
    </>
  );
}

"use client";
import { ComponentProps, ReactElement, useMemo } from "react";
import Board from "../Board";
import { cboardOf, useCartoonPrefs } from "@/lib/cartoonPrefs";
import Piece, { PieceType } from "./Pieces";
import Knight from "./Knights";
import { CARTOON_CSS, type Mood } from "./Character";

type BoardProps = ComponentProps<typeof Board>;
type PieceFn = (a: { squareWidth: number; square?: string }) => ReactElement;
type Hop = { square: string; mood: Mood } | null;

/** Набор для доски: wP, bN и т.д. pawnW / pawnB выбирают персонажа-пешку. moods: настроение королей (wK, bK). hop: фигура на этой клетке реагирует (подпрыгивает), остальные такого же типа не затрагиваются. */
function build(pawnW: number, pawnB: number, moods: Record<string, Mood>, hop: Hop, knights: boolean): BoardProps["pieces"] {
  const out: Record<string, PieceFn> = {};
  for (const side of ["w", "b"] as const) {
    for (const t of ["P", "N", "B", "R", "Q", "K"]) {
      const type = t.toLowerCase() as PieceType;
      const variant = side === "w" ? pawnW : pawnB;
      out[side + t] = ({ squareWidth, square }) => {
        const mood: Mood = t === "K" ? moods[side + t] ?? "idle" : hop && square === hop.square ? hop.mood : "idle";
        const animate: boolean | "blink" = t === "K" || mood !== "idle" ? true : "blink";
        return (
          <div style={{ width: squareWidth, height: squareWidth, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            {knights
              ? <Knight type={type} side={side} size={squareWidth * 0.8} animate={animate} mood={mood} />
              : <Piece type={type} side={side} size={squareWidth * 0.8} variant={variant} animate={animate} mood={mood} />}
          </div>
        );
      };
    }
  }
  return out as unknown as BoardProps["pieces"];
}

/** Доска с мультяшными фигурами: вся логика (ходы, подсветка, превращение, звук) та же, что у обычной доски. */
export default function CartoonBoard({ pawnW = 1, pawnB = 0, moods, hop = null, ...rest }: Omit<BoardProps, "pieces"> & { pawnW?: number; pawnB?: number; moods?: Record<string, Mood>; hop?: Hop }) {
  const [prefs] = useCartoonPrefs();
  const cb = cboardOf(prefs.cboard);
  const key = JSON.stringify(moods ?? {}) + "|" + (hop ? hop.square + hop.mood : "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const knights = prefs.team === "knights";
  const pieces = useMemo(() => build(pawnW, pawnB, moods ?? {}, hop, knights), [pawnW, pawnB, key, knights]);
  return (
    <>
      <style>{CARTOON_CSS}</style>
      <Board {...rest} pieces={pieces} colors={[cb.light, cb.dark]} />
    </>
  );
}

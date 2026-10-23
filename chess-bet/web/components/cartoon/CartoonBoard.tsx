"use client";
import { ComponentProps, ReactElement, useMemo } from "react";
import Board from "../Board";
import Piece, { PieceType } from "./Pieces";
import { CARTOON_CSS, type Mood } from "./Character";

type BoardProps = ComponentProps<typeof Board>;
type PieceFn = (a: { squareWidth: number }) => ReactElement;
type Kings = { w: Mood; b: Mood };

/** Набор для доски: wP, bN и т.д. pawnW / pawnB выбирают персонажа-пешку. Живые (с мимикой) только короли, остальные фигуры статичны. */
function build(pawnW: number, pawnB: number, kings: Kings): BoardProps["pieces"] {
  const out: Record<string, PieceFn> = {};
  for (const side of ["w", "b"] as const) {
    for (const t of ["P", "N", "B", "R", "Q", "K"]) {
      const type = t.toLowerCase() as PieceType;
      const variant = side === "w" ? pawnW : pawnB;
      const king = t === "K";
      out[side + t] = ({ squareWidth }) => (
        <div style={{ width: squareWidth, height: squareWidth, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          <Piece type={type} side={side} size={squareWidth * 0.8} variant={variant} animate={king} mood={king ? kings[side] : "idle"} />
        </div>
      );
    }
  }
  return out as unknown as BoardProps["pieces"];
}

/** Доска с мультяшными фигурами: вся логика (ходы, подсветка, превращение, звук) та же, что у обычной доски. */
export default function CartoonBoard({ pawnW = 1, pawnB = 0, kings, ...rest }: Omit<BoardProps, "pieces"> & { pawnW?: number; pawnB?: number; kings?: Kings }) {
  const kw = kings?.w ?? "idle", kb = kings?.b ?? "idle";
  const pieces = useMemo(() => build(pawnW, pawnB, { w: kw, b: kb }), [pawnW, pawnB, kw, kb]);
  return (
    <>
      <style>{CARTOON_CSS}</style>
      <Board {...rest} pieces={pieces} />
    </>
  );
}

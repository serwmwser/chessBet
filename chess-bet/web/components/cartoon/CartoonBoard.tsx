"use client";
import { ComponentProps, ReactElement, useMemo } from "react";
import Board from "../Board";
import Piece, { PieceType } from "./Pieces";
import { CARTOON_CSS } from "./Character";

type BoardProps = ComponentProps<typeof Board>;
type PieceFn = (a: { squareWidth: number }) => ReactElement;

/** Набор для доски: wP, bN и т.д. pawnW / pawnB выбирают персонажа-пешку (номер из списка персонажей стороны). */
function build(pawnW: number, pawnB: number): BoardProps["pieces"] {
  const out: Record<string, PieceFn> = {};
  for (const side of ["w", "b"] as const) {
    for (const t of ["P", "N", "B", "R", "Q", "K"]) {
      const type = t.toLowerCase() as PieceType;
      const variant = side === "w" ? pawnW : pawnB;
      out[side + t] = ({ squareWidth }) => (
        <div style={{ width: squareWidth, height: squareWidth, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          <Piece type={type} side={side} size={squareWidth * 0.8} variant={variant} animate={false} />
        </div>
      );
    }
  }
  return out as unknown as BoardProps["pieces"];
}

/** Доска с мультяшными фигурами: вся логика (ходы, подсветка, превращение, звук) та же, что у обычной доски. */
export default function CartoonBoard({ pawnW = 1, pawnB = 0, ...rest }: Omit<BoardProps, "pieces"> & { pawnW?: number; pawnB?: number }) {
  const pieces = useMemo(() => build(pawnW, pawnB), [pawnW, pawnB]);
  return (
    <>
      <style>{CARTOON_CSS}</style>
      <Board {...rest} pieces={pieces} />
    </>
  );
}

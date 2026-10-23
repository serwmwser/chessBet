import { Chess } from "chess.js";

export type PType = "p" | "n" | "b" | "r" | "q";
/** Цена фигур для подсчёта преимущества (король не считается) */
export const VALUE: Record<PType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER: PType[] = ["q", "r", "b", "n", "p"];

export type Material = {
  /** взятые фигуры: w = что взяли белые (чёрные фигуры), b = что взяли чёрные; от крупных к мелким */
  taken: { w: PType[]; b: PType[] };
  /** перевес в очках: плюс — у белых, минус — у чёрных (считается по фигурам на доске, превращения учтены) */
  diff: number;
};

/** Разбор партии по списку ходов (SAN): кто что взял и у кого перевес */
export function analyze(san: string[]): Material {
  const c = new Chess();
  const taken: { w: PType[]; b: PType[] } = { w: [], b: [] };
  for (const s of san) {
    try {
      const m = c.move(s);
      if (m.captured) taken[m.color].push(m.captured as PType);
    } catch {
      break;
    }
  }
  const byOrder = (a: PType, b: PType) => ORDER.indexOf(a) - ORDER.indexOf(b);
  taken.w.sort(byOrder);
  taken.b.sort(byOrder);
  let diff = 0;
  for (const row of c.board()) {
    for (const sq of row) {
      if (sq && sq.type !== "k") diff += (sq.color === "w" ? 1 : -1) * VALUE[sq.type as PType];
    }
  }
  return { taken, diff };
}

/** Доля белых на полосе преимущества, в процентах: 50 при равенстве, плавно растёт с перевесом */
export const whiteShare = (diff: number) => 50 + 50 * Math.tanh(diff / 6);

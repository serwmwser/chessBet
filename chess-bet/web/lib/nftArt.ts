import type { Mood, Side } from "@/components/cartoon/Character";
import type { PieceType } from "@/components/cartoon/Pieces";

/** Мультяшная фигура для NFT: набор, тип, цвет и вариант пешки (для «глиняного» набора). Всего 30 штук: глина 18 (пешки 4×2 и 5 фигур ×2) + рыцари 12. */
export type Figure = { id: string; set: "clay" | "knights"; type: PieceType; side: Side; variant: number; ru: string; en: string };

const TYPES: { t: PieceType; ru: string; en: string }[] = [
  { t: "k", ru: "Король", en: "King" },
  { t: "q", ru: "Ферзь", en: "Queen" },
  { t: "r", ru: "Ладья", en: "Rook" },
  { t: "b", ru: "Слон", en: "Bishop" },
  { t: "n", ru: "Конь", en: "Knight" },
];
const PAWN_KINDS: [string, string][] = [["Ниндзя", "Ninja"], ["Полицейский", "Police"], ["Леди", "Lady"], ["Бандит", "Bandit"]];
const SIDE_NAME = { w: ["белый", "White"], b: ["чёрный", "Black"] } as const;

export const FIGURES: Figure[] = (() => {
  const out: Figure[] = [];
  for (const set of ["clay", "knights"] as const) {
    for (const side of ["w", "b"] as const) {
      const sn = SIDE_NAME[side];
      for (const x of TYPES) out.push({ id: `${set}-${side}-${x.t}`, set, type: x.t, side, variant: 0, ru: `${x.ru} (${sn[0]}, ${set === "clay" ? "глина" : "рыцари"})`, en: `${x.en} (${sn[1]}, ${set === "clay" ? "clay" : "knights"})` });
      if (set === "knights") out.push({ id: `knights-${side}-p`, set, type: "p", side, variant: 0, ru: `Пешка (${sn[0]}, рыцари)`, en: `Pawn (${sn[1]}, knights)` });
      else PAWN_KINDS.forEach((k, v) => out.push({ id: `clay-${side}-p${v}`, set, type: "p", side, variant: v, ru: `${k[0]} (${sn[0]}, глина)`, en: `${k[1]} (${sn[1]}, clay)` }));
    }
  }
  return out;
})();

export const figureOf = (id: string): Figure => FIGURES.find((f) => f.id === id) ?? FIGURES[0];

export type MoodOpt = { id: Mood; ru: string; en: string };
export const MOODS: MoodOpt[] = [
  { id: "cheer", ru: "Улыбка", en: "Smile" },
  { id: "idle", ru: "Спокойный", en: "Calm" },
  { id: "scream", ru: "Злость", en: "Anger" },
  { id: "sad", ru: "Грусть", en: "Sad" },
];
export const moodOf = (id: string): Mood => (MOODS.find((m) => m.id === id)?.id ?? "cheer");

/** Яркие однотонные фоны */
export const NFT_BGS: { id: string; ru: string; en: string; color: string }[] = [
  { id: "orange", ru: "Оранжевый", en: "Orange", color: "#ff5a1f" },
  { id: "sky", ru: "Голубой", en: "Sky", color: "#1cb0f6" },
  { id: "lime", ru: "Лайм", en: "Lime", color: "#58cc02" },
  { id: "pink", ru: "Розовый", en: "Pink", color: "#ff4fa3" },
  { id: "yellow", ru: "Жёлтый", en: "Yellow", color: "#ffc800" },
  { id: "violet", ru: "Фиолетовый", en: "Violet", color: "#8b4dff" },
  { id: "red", ru: "Красный", en: "Red", color: "#e8334a" },
  { id: "teal", ru: "Бирюзовый", en: "Teal", color: "#14c8b4" },
];
export const bgOf = (id: string) => NFT_BGS.find((b) => b.id === id) ?? NFT_BGS[0];

/** Разбор позиции из FEN: 8 рядов сверху вниз, в клетке буква фигуры (заглавная белая) или пусто */
export function boardFromFen(fen: string): (string | null)[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((r) => {
    const row: (string | null)[] = [];
    for (const ch of r) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) row.push(null);
      else row.push(ch);
    }
    while (row.length < 8) row.push(null);
    return row.slice(0, 8);
  });
}

export const GLYPH: Record<string, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

/** Клетка вида e4 в индексы (ряд сверху, колонка слева) */
export function sqIdx(sq: string): [number, number] {
  return [8 - Number(sq[1]), sq.charCodeAt(0) - 97];
}

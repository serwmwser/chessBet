// Выгрузка мультяшных фигур в готовые SVG для сервера (картинки NFT).
// Запуск: cd chess-bet/web && npx tsx --tsconfig tsconfig.figs.json scripts/exportFigs.ts
// Результат: chess-bet/server/src/figs.json (30 фигур × 4 настроения).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import Piece from "../components/cartoon/Pieces";
import Knight from "../components/cartoon/Knights";
import { FIGURES, MOODS } from "../lib/nftArt";

const SIZE = 165;
const out: Record<string, string> = {};
for (const f of FIGURES) {
  for (const m of MOODS) {
    const el = f.set === "knights"
      ? createElement(Knight, { type: f.type, side: f.side, mood: m.id, size: SIZE, animate: false })
      : createElement(Piece, { type: f.type, side: f.side, variant: f.variant, mood: m.id, size: SIZE, animate: false });
    // чистим динамику: класс анимации и случайную задержку, чтобы картинка была статичной и одинаковой при каждой выгрузке
    out[`${f.id}|${m.id}`] = renderToStaticMarkup(el).replace(/--d:[^;"]*;?/g, "").replace(/ class="[^"]*"/, "");
  }
}
const file = new URL("../../server/src/figs.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out));
console.log("Готово:", Object.keys(out).length, "картинок →", file);

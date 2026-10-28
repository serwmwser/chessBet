import { readFileSync } from "node:fs";

/** Картинка NFT (SVG 400×560): сверху мультяшная фигура, снизу доска с выбранным ходом, фон яркий однотонный. Совпадает с карточкой на сайте (web/components/NftCard.tsx). */
const FIGS: Record<string, string> = JSON.parse(readFileSync(new URL("./figs.json", import.meta.url), "utf8"));

// порядок как в web/lib/nftArt.ts и контракте GameNFT
const FIG_IDS: string[] = [];
for (const set of ["clay", "knights"]) {
  for (const side of ["w", "b"]) {
    for (const t of ["k", "q", "r", "b", "n"]) FIG_IDS.push(`${set}-${side}-${t}`);
    if (set === "knights") FIG_IDS.push(`knights-${side}-p`);
    else for (let v = 0; v < 4; v++) FIG_IDS.push(`clay-${side}-p${v}`);
  }
}
const MOOD_IDS = ["cheer", "idle", "scream", "sad"];
const BG_COLORS = ["#ff5a1f", "#1cb0f6", "#58cc02", "#ff4fa3", "#ffc800", "#8b4dff", "#e8334a", "#14c8b4"];
const GLYPH: Record<string, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const OUT = "#2a2140";

export type NftImg = {
  fen: string; from?: string; to?: string;
  figure: number; mood: number; bg: number;
  gameId: number; ply: number; total: number; san: string;
  result: string; bet: string; white: string; black: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const short = (a: string) => (a.length > 12 ? a.slice(0, 6) + "…" + a.slice(-4) : a);

export function renderNft(d: NftImg): string {
  const figId = FIG_IDS[d.figure] ?? FIG_IDS[0];
  const side = figId.split("-")[1];
  const raw = FIGS[`${figId}|${MOOD_IDS[d.mood] ?? "cheer"}`] ?? "";
  const fs = figId.endsWith("-k") ? 136 : 150; // у короля высокая корона: фигура чуть меньше, чтобы не заходила на заголовок
  const fig = raw.replace(/^<svg[^>]*>/, `<svg x="${200 - fs / 2}" y="${258 - fs * 1.2}" width="${fs}" height="${fs * 1.2}" viewBox="0 0 100 120" overflow="visible">`);
  const bg = BG_COLORS[d.bg] ?? BG_COLORS[0];
  const arm = side === "w" ? "#ffffff" : "#32333f";
  const C = 30, BX = 80, BY = 272;
  const hl = new Set<string>();
  for (const s of [d.from, d.to]) if (s && /^[a-h][1-8]$/.test(s)) hl.add(`${8 - Number(s[1])},${s.charCodeAt(0) - 97}`);
  const rows = d.fen.split(" ")[0].split("/");
  let board = "";
  for (let r = 0; r < 8; r++) {
    let c = 0;
    const cells: (string | null)[] = [];
    for (const ch of rows[r] ?? "") { if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null); else cells.push(ch); }
    while (cells.length < 8) cells.push(null);
    for (c = 0; c < 8; c++) {
      const x = BX + c * C, y = BY + r * C;
      const fill = hl.has(`${r},${c}`) ? "#ffd84a" : (r + c) % 2 === 0 ? "#fff0fa" : "#ff86d0";
      board += `<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${fill}"/>`;
      const p = cells[c];
      if (p && GLYPH[p]) {
        const white = p === p.toUpperCase();
        board += `<text x="${x + C / 2}" y="${y + 24}" text-anchor="middle" font-family="'DejaVu Sans','Segoe UI Symbol','Noto Sans Symbols 2',sans-serif" font-size="27" fill="${white ? "#fff" : OUT}"${white ? ` stroke="${OUT}" stroke-width="1.6" paint-order="stroke"` : ""}>${GLYPH[p]}&#xFE0E;</text>`;
      }
    }
  }
  const title = `CHESS BET #${d.gameId}`;
  const sub = `Move ${d.ply}/${d.total} · ${d.san}${d.ply === d.total ? " (final)" : ""}`;
  const arms = (col: string, w: number, op = "") =>
    `<path d="M158 236Q104 270 70 346" stroke="${col}" ${op} stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="M242 236Q296 270 330 346" stroke="${col}" ${op} stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="800" height="1120">`
    + `<rect width="400" height="560" rx="30" fill="${bg}"/>`
    + `<circle cx="200" cy="160" r="105" fill="#fff" opacity=".18"/>`
    + `<text x="200" y="34" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="#fff" stroke="${OUT}" stroke-opacity=".5" stroke-width="1.2" paint-order="stroke">${esc(title)}</text>`
    + `<text x="200" y="52" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#fff">${esc(sub)}</text>`
    + arms(OUT, 22, 'stroke-opacity=".55"') + arms(arm, 18)
    + fig
    + `<rect x="${BX - 9}" y="${BY - 9}" width="${C * 8 + 18}" height="${C * 8 + 18}" rx="14" fill="#fff" stroke="${OUT}" stroke-opacity=".7" stroke-width="3"/>`
    + board
    + `<rect x="${BX}" y="${BY}" width="${C * 8}" height="${C * 8}" fill="none" stroke="${OUT}" stroke-width="2"/>`
    + `<ellipse cx="68" cy="352" rx="14" ry="17" fill="#ffd9b8" stroke="${OUT}" stroke-opacity=".7" stroke-width="2.5"/><ellipse cx="332" cy="352" rx="14" ry="17" fill="#ffd9b8" stroke="${OUT}" stroke-opacity=".7" stroke-width="2.5"/>`
    + `<text x="200" y="540" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="20" fill="#fff" stroke="${OUT}" stroke-opacity=".5" stroke-width="1.2" paint-order="stroke">${esc(`${d.result} | ${d.bet} USDC`)}</text>`
    + `<text x="200" y="555" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#fff" opacity=".9">${esc(`${short(d.white)} vs ${short(d.black)}`)}</text>`
    + `</svg>`;
}

type Meta = { attributes: { trait_type: string; value: string | number }[] };

/** Данные для картинки из метаданных токена (JSON из tokenURI контракта GameNFT) и выбора игрока */
export function imgFromMeta(meta: Meta, art: { figure: number; mood: number; bg: number }, last?: { from: string; to: string }): NftImg {
  const at = (n: string) => meta.attributes.find((x) => x.trait_type === n)?.value;
  return {
    fen: String(at("Position") ?? ""),
    from: last?.from, to: last?.to,
    figure: art.figure, mood: art.mood, bg: art.bg,
    gameId: Number(at("Game")), ply: Number(at("Move")), total: Number(at("Moves in game")), san: String(at("Last move") ?? ""),
    result: String(at("Result") ?? ""), bet: Number(at("Bet (USDC)")).toFixed(2),
    white: String(at("White") ?? ""), black: String(at("Black") ?? ""),
  };
}

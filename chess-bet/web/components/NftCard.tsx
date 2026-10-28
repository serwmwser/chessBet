"use client";
import { CARTOON_CSS, OUT } from "./cartoon/Character";
import Piece from "./cartoon/Pieces";
import Knight from "./cartoon/Knights";
import { bgOf, boardFromFen, figureOf, GLYPH, moodOf, sqIdx } from "@/lib/nftArt";

export type NftCardProps = {
  fen: string;
  from?: string;
  to?: string;
  figureId: string;
  mood: string;
  bgId: string;
  title: string;
  sub?: string;
  line1?: string;
  line2?: string;
  animate?: boolean;
};

const C = 30;
const BX = 80;
const BY = 272;

/** Карточка NFT 400×560: верхняя половина это мультяшная фигура, нижняя половина доска с выбранным ходом; фон яркий однотонный. */
export default function NftCard({ fen, from, to, figureId, mood, bgId, title, sub, line1, line2, animate = false }: NftCardProps) {
  const fig = figureOf(figureId);
  const bg = bgOf(bgId);
  const rows = boardFromFen(fen);
  const hl = new Set<string>();
  for (const s of [from, to]) if (s && /^[a-h][1-8]$/.test(s)) { const [r, c] = sqIdx(s); hl.add(r + "," + c); }
  const arm = fig.side === "w" ? "#ffffff" : "#32333f";
  const skin = "#ffd9b8";
  const m = moodOf(mood);
  return (
    <div style={{ width: "100%", maxWidth: 400, aspectRatio: "400 / 560", margin: "0 auto" }}>
      <style>{CARTOON_CSS}</style>
      <svg viewBox="0 0 400 560" width="100%" height="100%" role="img" aria-label={title} style={{ display: "block", borderRadius: 30 }}>
        <rect width="400" height="560" rx="30" fill={bg.color} />
        <circle cx="200" cy="160" r="105" fill="#ffffff" opacity=".18" />
        <text x="200" y="34" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight={900} fontSize="24" fill="#fff" stroke={OUT} strokeOpacity=".5" strokeWidth="1.2" paintOrder="stroke">{title}</text>
        {sub && <text x="200" y="52" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight={700} fontSize="12" fill="#fff">{sub}</text>}

        {/* руки: от фигуры к краям доски */}
        <path d="M158 236Q104 270 70 346" stroke={OUT} strokeOpacity=".55" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M242 236Q296 270 330 346" stroke={OUT} strokeOpacity=".55" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M158 236Q104 270 70 346" stroke={arm} strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d="M242 236Q296 270 330 346" stroke={arm} strokeWidth="18" fill="none" strokeLinecap="round" />

        {/* фигура (верхняя половина) */}
        <foreignObject x="100" y="58" width="200" height="214">
          <div style={{ width: 200, height: 214, display: "flex", justifyContent: "center", alignItems: "center", overflow: "visible" }}>
            {fig.set === "knights"
              ? <Knight type={fig.type} side={fig.side} mood={m} size={165} animate={animate} />
              : <Piece type={fig.type} side={fig.side} variant={fig.variant} mood={m} size={165} animate={animate} />}
          </div>
        </foreignObject>

        {/* доска (нижняя половина) */}
        <rect x={BX - 9} y={BY - 9} width={C * 8 + 18} height={C * 8 + 18} rx="14" fill="#fff" stroke={OUT} strokeOpacity=".7" strokeWidth="3" />
        {rows.map((row, r) => row.map((p, c) => {
          const x = BX + c * C, y = BY + r * C;
          const light = (r + c) % 2 === 0;
          const fill = hl.has(r + "," + c) ? "#ffd84a" : light ? "#fff0fa" : "#ff86d0";
          const white = !!p && p === p.toUpperCase();
          return (
            <g key={r + "-" + c}>
              <rect x={x} y={y} width={C} height={C} fill={fill} />
              {p && (
                <text x={x + C / 2} y={y + 24} textAnchor="middle" fontFamily="'DejaVu Sans','Segoe UI Symbol',sans-serif" fontSize="27" fill={white ? "#fff" : OUT} stroke={white ? OUT : "none"} strokeWidth="1.6" paintOrder="stroke">{GLYPH[p]}{"\uFE0E"}</text>
              )}
            </g>
          );
        }))}
        <rect x={BX} y={BY} width={C * 8} height={C * 8} fill="none" stroke={OUT} strokeWidth="2" />

        {/* кисти на краях доски */}
        <ellipse cx="68" cy="352" rx="14" ry="17" fill={skin} stroke={OUT} strokeOpacity=".7" strokeWidth="2.5" />
        <ellipse cx="332" cy="352" rx="14" ry="17" fill={skin} stroke={OUT} strokeOpacity=".7" strokeWidth="2.5" />

        {line1 && <text x="200" y="540" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight={900} fontSize="20" fill="#fff" stroke={OUT} strokeOpacity=".5" strokeWidth="1.2" paintOrder="stroke">{line1}</text>}
        {line2 && <text x="200" y="555" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="11" fill="#fff" opacity=".9">{line2}</text>}
      </svg>
    </div>
  );
}

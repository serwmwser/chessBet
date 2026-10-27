"use client";
import { useMemo } from "react";
import { Aura, ClayDefs, Eyes, Gloss, grad, Mouth, OUT, SKIN, type Mood, type Side } from "./Character";
import type { PieceType } from "./Pieces";

/** Набор «Рыцари»: объёмные «игрушечные» фигурки. Пешка мелкая в простом шлеме, ладья со щитом и башней, конь это лошадка в доспехах, слон в митре с посохом, ферзь в платье с длинными волосами, король бородатый в мантии с большой короной. */
const K = {
  w: { armor: "#eef2fb", armor2: "#c5d0e6", helm: "#f4f7fd", steel: "#dfe6f2", trim: "#ffc400", accent: "#16b8f3", cape: "#16b8f3", leather: "#c27a3c", boot: "#b36a2e", wood: "#d9954f", plume: "#ff5b7f", gem: "#ff4f8b", fur: "#ffffff", horse: "#f8f4ea", muzzle: "#eadcc6", hair: "#ffd24d", gown: "#ff6fa8", hoof: "#7a5230", beard: "#f1f3f8" },
  b: { armor: "#3d4152", armor2: "#262936", helm: "#2f3240", steel: "#59607a", trim: "#ff8f1f", accent: "#b04dff", cape: "#e2314d", leather: "#7b3f17", boot: "#2a2018", wood: "#a8662f", plume: "#ff8f1f", gem: "#35e0a1", fur: "#d9dbe6", horse: "#454a5e", muzzle: "#666c84", hair: "#7a3bc0", gown: "#9d3cff", hoof: "#2a2018", beard: "#9aa0b8" },
};
const RIM = { stroke: OUT, strokeOpacity: 0.55 };
const SCALE: Record<PieceType, number> = { p: 0.84, r: 1, n: 1, b: 1, q: 1, k: 1.05 };

export default function Knight({ type, side, mood = "idle", size = 110, animate = true }: { type: PieceType; side: Side; mood?: Mood; size?: number; variant?: number; animate?: boolean | "blink" }) {
  const dl = useMemo(() => "-" + (Math.random() * 4).toFixed(2) + "s", []);
  const p = K[side];
  const used = new Set<string>();
  const G = (c: string) => { used.add(c); return grad(c); };
  const sc = SCALE[type];
  const humanBody = type !== "q" && type !== "n";

  return (
    <svg className={"cc cc-" + side + " " + (animate === "blink" ? "cc-blinkonly" : animate ? "cc-" + mood : "cc-still")} viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={type} style={{ display: "block", overflow: "visible", ...({ "--d": dl } as object) }}>
      <Aura side={side} />
      <ellipse cx="50" cy="113" rx="34" ry="5" fill="rgba(0,0,0,.22)" />
      <ellipse cx="50" cy="107" rx="34" ry="9" fill={G(p.wood)} {...RIM} strokeWidth="1.6" />
      <Gloss cx={36} cy={104} rx={13} ry={2.2} rot={-8} o={0.35} />

      <g transform={`translate(50 106) scale(${sc}) translate(-50 -106)`}>
        {/* ====== КОРОЛЬ: мантия с мехом ====== */}
        {type === "k" && (
          <>
            <path d="M20 106 C12 80 28 64 38 60 L62 60 C72 64 88 80 80 106 Z" fill={G(p.cape)} {...RIM} strokeWidth="1.8" />
            <path d="M22 100 C26 106 40 108 50 108 C60 108 74 106 78 100 L80 106 C70 110 30 110 20 106 Z" fill={G(p.fur)} {...RIM} strokeWidth="1.4" />
            {[30, 42, 54, 66].map((x) => <circle key={x} cx={x} cy="105" r="1.4" fill={OUT} opacity=".7" />)}
          </>
        )}

        {/* ====== ФЕРЗЬ: платье ====== */}
        {type === "q" && (
          <>
            <path d="M37 64 L63 64 C68 78 78 94 84 106 C70 111 30 111 16 106 C22 94 32 78 37 64 Z" fill={G(p.gown)} {...RIM} strokeWidth="1.8" />
            <path d="M18 103 C30 109 70 109 82 103" stroke={p.trim} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <Gloss cx={38} cy={86} rx={3.6} ry={13} rot={14} o={0.35} />
            <path d="M39 64 L61 64 L58 80 Q50 85 42 80 Z" fill={G(p.armor)} {...RIM} strokeWidth="1.5" />
            <path d="M42 74 Q50 82 58 74" stroke={p.trim} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="80" r="2.6" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <ellipse cx="33" cy="76" rx="5" ry="6.5" fill={G(p.gown)} {...RIM} strokeWidth="1.4" />
            <ellipse cx="67" cy="76" rx="5" ry="6.5" fill={G(p.gown)} {...RIM} strokeWidth="1.4" />
          </>
        )}

        {/* ====== КОНЬ: хвост и копыта ====== */}
        {type === "n" && (
          <>
            <path className="tail" d="M32 92 C14 90 8 72 14 58 C18 72 24 78 34 80 Z" fill={G(p.plume)} {...RIM} strokeWidth="1.5" strokeLinejoin="round" />
            <ellipse cx="40" cy="101" rx="8.5" ry="6" fill={G(p.hoof)} {...RIM} strokeWidth="1.5" />
            <ellipse cx="60" cy="101" rx="8.5" ry="6" fill={G(p.hoof)} {...RIM} strokeWidth="1.5" />
            <path d="M31 100 C30 84 35 72 42 66 L58 66 C65 72 70 84 69 100 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.8" />
            <path d="M33 70 L67 70 L68 96 Q50 104 32 96 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M33 78 H67 M33 88 H67" stroke={p.trim} strokeWidth="2.2" />
            <circle cx="50" cy="83" r="4" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
            <Gloss cx={42} cy={80} rx={3.6} ry={11} rot={10} o={0.4} />
            <ellipse cx="29" cy="86" rx="5.5" ry="6" fill={G(p.hoof)} {...RIM} strokeWidth="1.4" />
            <ellipse cx="71" cy="86" rx="5.5" ry="6" fill={G(p.hoof)} {...RIM} strokeWidth="1.4" />
          </>
        )}

        {/* ====== БРОНЯ у людей: сапоги, корпус, пояс, наплечники, руки ====== */}
        {humanBody && (
          <>
            <ellipse cx="40" cy="101" rx="9" ry="6.5" fill={G(p.boot)} {...RIM} strokeWidth="1.5" />
            <ellipse cx="60" cy="101" rx="9" ry="6.5" fill={G(p.boot)} {...RIM} strokeWidth="1.5" />
            <path d="M31 100 C30 84 35 72 42 66 L58 66 C65 72 70 84 69 100 Z" fill={G(p.armor)} {...RIM} strokeWidth="1.8" />
            <Gloss cx={42} cy={80} rx={3.6} ry={11} rot={10} o={0.4} />
            <path d="M33 88 H67 V93 H33 Z" fill={G(p.leather)} {...RIM} strokeWidth="1.3" />
            <circle cx="50" cy="90.5" r="4" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
            <circle cx="50" cy="90.5" r="1.5" fill={G(p.armor2)} />
            <path d="M44 70 L50 76 L56 70" stroke={p.trim} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="31" cy="73" r={type === "k" ? 9 : 7.5} fill={G(p.armor2)} {...RIM} strokeWidth="1.6" />
            <circle cx="69" cy="73" r={type === "k" ? 9 : 7.5} fill={G(p.armor2)} {...RIM} strokeWidth="1.6" />
            <circle cx="29" cy="74" r="2" fill={G(p.trim)} />
            <circle cx="71" cy="74" r="2" fill={G(p.trim)} />
            <ellipse cx="27" cy="88" rx="5.5" ry="6" fill={G(p.steel)} {...RIM} strokeWidth="1.4" />
            <ellipse cx="73" cy="88" rx="5.5" ry="6" fill={G(p.steel)} {...RIM} strokeWidth="1.4" />
          </>
        )}

        {/* ====== предметы в руках ====== */}
        {type === "p" && (
          <>
            <path d="M75 94 L72 66 L78 66 Z" fill={G(p.steel)} {...RIM} strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="68" y="92" width="14" height="3.6" rx="1.8" fill={G(p.trim)} {...RIM} strokeWidth="1.2" />
          </>
        )}
        {type === "r" && (
          <>
            <path d="M6 68 H30 V88 Q30 101 18 105 Q6 101 6 88 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M18 72 V101 M8 84 H28" stroke={p.trim} strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {type === "b" && (
          <>
            <path d="M76 100 L76 52" stroke={p.leather} strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="76" cy="48" r="5" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
            <path d="M76 44 V52 M72 48 H80" stroke={p.armor2} strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {type === "q" && (
          <>
            <path d="M78 100 L78 62" stroke={p.leather} strokeWidth="3" strokeLinecap="round" />
            <path d="M78 52 C71 54 71 63 78 67 C85 63 85 54 78 52 Z" fill={G(p.gem)} {...RIM} strokeWidth="1.3" />
            <ellipse cx="73" cy="84" rx="5" ry="5.5" fill={G(SKIN)} {...RIM} strokeWidth="1.3" />
          </>
        )}
        {type === "k" && (
          <>
            <path d="M78 100 L78 52" stroke={p.leather} strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="78" cy="46" r="6" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
            <path d="M78 38 V48 M73 43 H83" stroke={p.gem} strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {/* ====== голова ====== */}
        <g className="head tg">
          {/* КОНЬ: уши, грива, морда */}
          {type === "n" && (
            <>
              <path d="M30 26 L26 2 L44 18 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M70 26 L74 2 L56 18 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M31 21 L29 8 L38 17 Z M69 21 L71 8 L62 17 Z" fill={G(p.gem)} opacity=".85" />
              <path d="M66 14 C86 18 90 44 82 66 C80 52 74 44 66 40 Z" fill={G(p.plume)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
              <ellipse cx="50" cy="42" rx="21" ry="25" fill={G(p.horse)} {...RIM} strokeWidth="1.8" />
              <path d="M40 8 Q50 -2 60 8 Q56 16 50 18 Q44 16 40 8 Z" fill={G(p.plume)} {...RIM} strokeWidth="1.5" strokeLinejoin="round" />
              <ellipse cx="50" cy="62" rx="16" ry="12.5" fill={G(p.muzzle)} {...RIM} strokeWidth="1.7" />
              <ellipse cx="44" cy="60" rx="2.4" ry="3.2" fill={OUT} />
              <ellipse cx="56" cy="60" rx="2.4" ry="3.2" fill={OUT} />
              <path d="M36 22 L64 22 L60 34 L40 34 Z" fill={G(p.steel)} {...RIM} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M38 27 H62" stroke={p.trim} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="50" cy="28" r="2.4" fill={G(p.gem)} {...RIM} strokeWidth="1" />
              <Gloss cx={40} cy={36} rx={7} ry={5} o={0.4} />
              <Eyes mood={mood} lit={false} />
              {mood === "scream" || mood === "cheer" ? (
                <path d="M41 66 Q50 80 59 66 Z" fill="#7a1f3d" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
              ) : mood === "sad" ? (
                <path d="M44 70 Q50 65 56 70" stroke={OUT} strokeWidth="2.6" fill="none" strokeLinecap="round" />
              ) : (
                <path d="M43 67 Q50 73 57 67" stroke={OUT} strokeWidth="2.6" fill="none" strokeLinecap="round" />
              )}
            </>
          )}

          {/* ФЕРЗЬ: длинные волосы, лицо без шлема */}
          {type === "q" && (
            <>
              <path d="M26 40 Q16 70 28 92 Q36 74 38 52 Z M74 40 Q84 70 72 92 Q64 74 62 52 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.5" />
              <path d="M26 46 C24 14 40 6 50 6 C60 6 76 14 74 46 Q60 24 50 28 Q40 24 26 46 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.8" />
              <circle cx="50" cy="46" r="20" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
              <path d="M30 40 Q38 22 52 26 Q64 24 70 40 Q60 30 50 34 Q40 30 30 40 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.4" />
              <circle cx="36" cy="54" r="3.8" fill="#ff9aa8" opacity=".55" />
              <circle cx="64" cy="54" r="3.8" fill="#ff9aa8" opacity=".55" />
              <Eyes mood={mood} lit={false} />
              <path d="M33 39 L29 36 M67 39 L71 36" stroke={OUT} strokeWidth="1.8" strokeLinecap="round" />
              <Mouth mood={mood} kind="lady" />
              <path d="M34 20 L32 4 L42 14 L50 -4 L58 14 L68 4 L66 20 Z" fill={G(p.trim)} {...RIM} strokeWidth="1.7" strokeLinejoin="round" />
              <Gloss cx={42} cy={9} rx={5} ry={2.2} o={0.5} />
              <circle cx="50" cy="8" r="3" fill={G(p.gem)} {...RIM} strokeWidth="1" />
              <circle cx="32" cy="4" r="2" fill="#ffffff" {...RIM} strokeWidth="0.8" />
              <circle cx="68" cy="4" r="2" fill="#ffffff" {...RIM} strokeWidth="0.8" />
              <rect x="33" y="17" width="34" height="5" rx="2" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
            </>
          )}

          {/* КОРОЛЬ: седые волосы, борода, большая корона */}
          {type === "k" && (
            <>
              <path d="M24 46 C20 18 38 10 50 10 C62 10 80 18 76 46 Q76 62 70 70 L66 52 Q50 38 34 52 L30 70 Q24 62 24 46 Z" fill={G(p.beard)} {...RIM} strokeWidth="1.8" />
              <circle cx="50" cy="46" r="20" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
              <circle cx="36" cy="52" r="3.6" fill="#ff9aa8" opacity=".5" />
              <circle cx="64" cy="52" r="3.6" fill="#ff9aa8" opacity=".5" />
              <Eyes mood={mood} lit={false} />
              <path d="M31 36 L44 33 M56 33 L69 36" stroke={p.beard} strokeWidth="4.2" strokeLinecap="round" />
              <path d="M32 56 Q50 98 68 56 Q60 68 50 66 Q40 68 32 56 Z" fill={G(p.beard)} {...RIM} strokeWidth="1.6" />
              <path d="M40 57 Q50 53 60 57 Q50 62 40 57 Z" fill={G(p.beard)} {...RIM} strokeWidth="1.2" />
              <Mouth mood={mood} kind="police" />
              <path d="M27 24 L24 -14 L38 2 L50 -22 L62 2 L76 -14 L73 24 Z" fill={G(p.trim)} {...RIM} strokeWidth="2" strokeLinejoin="round" />
              <Gloss cx={39} cy={-4} rx={7} ry={2.8} o={0.5} />
              <path d="M50 -34 V-20 M44 -28 H56" stroke={p.trim} strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="0" r="4" fill={G(p.gem)} {...RIM} strokeWidth="1" />
              <circle cx="35" cy="8" r="2.6" fill={G(p.accent)} {...RIM} strokeWidth="0.8" />
              <circle cx="65" cy="8" r="2.6" fill={G(p.accent)} {...RIM} strokeWidth="0.8" />
              <rect x="26" y="19" width="48" height="8" rx="2.4" fill={G(p.trim)} {...RIM} strokeWidth="1.6" />
              <circle cx="38" cy="23" r="1.8" fill={G(p.gem)} />
              <circle cx="50" cy="23" r="1.8" fill={G(p.accent)} />
              <circle cx="62" cy="23" r="1.8" fill={G(p.gem)} />
            </>
          )}

          {/* пешка, ладья, слон: человек в шлеме */}
          {humanBody && type !== "k" && (
            <>
              <circle cx="50" cy="46" r="20" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
              <circle cx="36" cy="54" r="3.8" fill="#ff9aa8" opacity=".5" />
              <circle cx="64" cy="54" r="3.8" fill="#ff9aa8" opacity=".5" />
              <Eyes mood={mood} lit={false} />
              <Mouth mood={mood} kind="police" />
              <path d="M25 50 C22 14 40 4 50 4 C60 4 78 14 75 50 L67 50 C67 38 59 31 50 31 C41 31 33 38 33 50 Z" fill={G(p.helm)} {...RIM} strokeWidth="1.9" strokeLinejoin="round" />
              <Gloss cx={39} cy={17} rx={9} ry={4.5} o={0.5} />
              <path d="M25 50 C25 56 27 60 31 62 L33 50 Z M75 50 C75 56 73 60 69 62 L67 50 Z" fill={G(p.armor2)} {...RIM} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M33 33 Q50 24 67 33" stroke={p.armor2} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <circle cx="29" cy="40" r="2.4" fill={G(p.trim)} />
              <circle cx="71" cy="40" r="2.4" fill={G(p.trim)} />
            </>
          )}
          {type === "p" && <path d="M46 5 L54 5 L55 31 L45 31 Z" fill={G(p.trim)} {...RIM} strokeWidth="1.4" strokeLinejoin="round" />}
          {type === "r" && (
            <>
              <path d="M28 20 L28 -2 L38 -2 L38 7 L45 7 L45 -2 L55 -2 L55 7 L62 7 L62 -2 L72 -2 L72 20 Q50 10 28 20 Z" fill={G(p.steel)} {...RIM} strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M31 19 Q50 11 69 19" stroke={p.trim} strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          )}
          {type === "b" && (
            <>
              <path d="M31 22 Q50 -24 69 22 Q50 14 31 22 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
              <Gloss cx={44} cy={4} rx={5} ry={3.5} o={0.45} />
              <path d="M33 22 Q50 16 67 22" stroke={p.trim} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M50 -13 V7 M43 -5 H57" stroke={p.trim} strokeWidth="3.6" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>
      <ClayDefs colors={[...used]} side={side} />
    </svg>
  );
}

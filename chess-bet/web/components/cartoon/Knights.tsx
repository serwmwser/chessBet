"use client";
import { useMemo } from "react";
import { Aura, ClayDefs, Eyes, Gloss, grad, Mouth, OUT, SKIN, type Mood, type Side } from "./Character";
import type { PieceType } from "./Pieces";

/** Набор «Рыцари»: объёмные «игрушечные» рыцарские фигурки. Белые: серебро с золотом и голубым, чёрные: графит с оранжевым и фиолетовым. */
const K = {
  w: { armor: "#eef2fb", armor2: "#c5d0e6", helm: "#f4f7fd", steel: "#dfe6f2", trim: "#ffc400", accent: "#16b8f3", cape: "#16b8f3", leather: "#c27a3c", boot: "#b36a2e", wood: "#d9954f", plume: "#ff5b7f", gem: "#ff4f8b", fur: "#ffffff" },
  b: { armor: "#3d4152", armor2: "#262936", helm: "#2f3240", steel: "#59607a", trim: "#ff8f1f", accent: "#b04dff", cape: "#e2314d", leather: "#7b3f17", boot: "#2a2018", wood: "#a8662f", plume: "#ff8f1f", gem: "#35e0a1", fur: "#d9dbe6" },
};
const RIM = { stroke: OUT, strokeOpacity: 0.55 };

export default function Knight({ type, side, mood = "idle", size = 110, animate = true }: { type: PieceType; side: Side; mood?: Mood; size?: number; variant?: number; animate?: boolean | "blink" }) {
  const dl = useMemo(() => "-" + (Math.random() * 4).toFixed(2) + "s", []);
  const p = K[side];
  const used = new Set<string>();
  const G = (c: string) => { used.add(c); return grad(c); };
  const lit = false;
  const royal = type === "k" || type === "q";
  return (
    <svg className={"cc cc-" + side + " " + (animate === "blink" ? "cc-blinkonly" : animate ? "cc-" + mood : "cc-still")} viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={type} style={{ display: "block", overflow: "visible", ...({ "--d": dl } as object) }}>
      <Aura side={side} />
      <ellipse cx="50" cy="113" rx="34" ry="5" fill="rgba(0,0,0,.22)" />
      {/* деревянная подставка */}
      <ellipse cx="50" cy="107" rx="34" ry="9" fill={G(p.wood)} {...RIM} strokeWidth="1.6" />
      <Gloss cx={36} cy={104} rx={13} ry={2.2} rot={-8} o={0.35} />

      {/* плащ у короля и ферзя */}
      {royal && <path d="M24 106 C18 82 32 66 40 62 L60 62 C68 66 82 82 76 106 Z" fill={G(p.cape)} {...RIM} strokeWidth="1.8" />}
      {type === "k" && <path d="M34 66 Q50 76 66 66 L64 60 Q50 66 36 60 Z" fill={G(p.fur)} {...RIM} strokeWidth="1.5" />}

      {/* сапоги */}
      <ellipse cx="40" cy="101" rx="9" ry="6.5" fill={G(p.boot)} {...RIM} strokeWidth="1.5" />
      <ellipse cx="60" cy="101" rx="9" ry="6.5" fill={G(p.boot)} {...RIM} strokeWidth="1.5" />
      {/* корпус в доспехах */}
      <path d="M31 100 C30 84 35 72 42 66 L58 66 C65 72 70 84 69 100 Z" fill={G(p.armor)} {...RIM} strokeWidth="1.8" />
      <Gloss cx={42} cy={80} rx={3.6} ry={11} rot={10} o={0.4} />
      <path d="M33 88 H67 V93 H33 Z" fill={G(p.leather)} {...RIM} strokeWidth="1.3" />
      <circle cx="50" cy="90.5" r="4" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
      <circle cx="50" cy="90.5" r="1.5" fill={G(p.armor2)} />
      <path d="M44 70 L50 76 L56 70" stroke={p.trim} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* наплечники и руки */}
      <circle cx="31" cy="73" r="7.5" fill={G(p.armor2)} {...RIM} strokeWidth="1.6" />
      <circle cx="69" cy="73" r="7.5" fill={G(p.armor2)} {...RIM} strokeWidth="1.6" />
      <circle cx="29" cy="74" r="2" fill={G(p.trim)} />
      <circle cx="71" cy="74" r="2" fill={G(p.trim)} />
      <ellipse cx="27" cy="88" rx="5.5" ry="6" fill={G(p.steel)} {...RIM} strokeWidth="1.4" />
      <ellipse cx="73" cy="88" rx="5.5" ry="6" fill={G(p.steel)} {...RIM} strokeWidth="1.4" />

      {/* оружие и предметы в руках */}
      {type === "p" && (
        <>
          <path d="M75 94 L72 66 L78 66 Z" fill={G(p.steel)} {...RIM} strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="68" y="92" width="14" height="3.6" rx="1.8" fill={G(p.trim)} {...RIM} strokeWidth="1.2" />
        </>
      )}
      {type === "r" && (
        <path d="M8 70 H30 V88 Q30 100 19 104 Q8 100 8 88 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
      )}
      {type === "r" && <path d="M19 74 V100 M10 84 H28" stroke={p.trim} strokeWidth="3" strokeLinecap="round" />}
      {type === "n" && (
        <>
          <path d="M76 100 L80 40" stroke={G(p.leather)} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M80 42 L90 34 L88 48 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M80 42 L90 34 L88 48 Z" fill={p.accent} />
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
          <path d="M76 100 L76 60" stroke={p.leather} strokeWidth="3" strokeLinecap="round" />
          <path d="M76 52 C70 54 70 62 76 66 C82 62 82 54 76 52 Z" fill={G(p.gem)} {...RIM} strokeWidth="1.3" />
        </>
      )}
      {type === "k" && (
        <>
          <path d="M76 100 L76 56" stroke={p.leather} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="76" cy="52" r="5.5" fill={G(p.trim)} {...RIM} strokeWidth="1.3" />
          <circle cx="76" cy="52" r="2" fill={G(p.gem)} />
        </>
      )}

      {/* голова: лицо виднеется из-под шлема */}
      <g className="head tg">
        {type === "q" && <path d="M24 44 Q18 70 30 84 Q34 66 36 52 Z M76 44 Q82 70 70 84 Q66 66 64 52 Z" fill={G(side === "w" ? "#ffd24d" : "#5a2a8a")} {...RIM} strokeWidth="1.5" />}
        <circle cx="50" cy="46" r="20" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
        <circle cx="36" cy="54" r="3.8" fill="#ff9aa8" opacity=".5" />
        <circle cx="64" cy="54" r="3.8" fill="#ff9aa8" opacity=".5" />
        <Eyes mood={mood} lit={lit} />
        <Mouth mood={mood} kind="police" />
        {type === "k" && (
          <path d="M32 56 Q50 90 68 56 Q60 66 50 64 Q40 66 32 56 Z" fill={G(p.fur)} {...RIM} strokeWidth="1.5" />
        )}
        {/* шлем: купол, нащёчники, гребень */}
        <path d="M25 50 C22 14 40 4 50 4 C60 4 78 14 75 50 L67 50 C67 38 59 31 50 31 C41 31 33 38 33 50 Z" fill={G(p.helm)} {...RIM} strokeWidth="1.9" strokeLinejoin="round" />
        <Gloss cx={39} cy={17} rx={9} ry={4.5} o={0.5} />
        <path d="M25 50 C25 56 27 60 31 62 L33 50 Z M75 50 C75 56 73 60 69 62 L67 50 Z" fill={G(p.armor2)} {...RIM} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M33 33 Q50 24 67 33" stroke={p.armor2} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="29" cy="40" r="2.4" fill={G(p.trim)} />
        <circle cx="71" cy="40" r="2.4" fill={G(p.trim)} />

        {type === "p" && <path d="M46 5 L54 5 L55 31 L45 31 Z" fill={G(p.trim)} {...RIM} strokeWidth="1.4" strokeLinejoin="round" />}
        {type === "r" && (
          <>
            <path d="M28 20 L28 2 L38 2 L38 9 L45 9 L45 2 L55 2 L55 9 L62 9 L62 2 L72 2 L72 20 Q50 10 28 20 Z" fill={G(p.steel)} {...RIM} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M31 19 Q50 11 69 19" stroke={p.trim} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        {type === "n" && (
          <>
            <path d="M32 14 L30 -4 L43 8 Z" fill={G(p.helm)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M68 14 L70 -4 L57 8 Z" fill={G(p.helm)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M34 9 L33 0 L40 7 Z M66 9 L67 0 L60 7 Z" fill={p.gem} opacity=".85" />
            <path d="M50 3 C64 -6 82 4 84 28 C78 16 66 14 56 14 Z" fill={G(p.plume)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M47 5 L53 5 L53 31 L47 31 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.2" />
          </>
        )}
        {type === "b" && (
          <>
            <path d="M31 22 Q50 -20 69 22 Q50 14 31 22 Z" fill={G(p.accent)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <Gloss cx={44} cy={6} rx={5} ry={3.5} o={0.45} />
            <path d="M33 22 Q50 16 67 22" stroke={p.trim} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M50 -9 V9 M43 -2 H57" stroke={p.trim} strokeWidth="3.4" strokeLinecap="round" />
          </>
        )}
        {type === "q" && (
          <>
            <path d="M31 14 L30 -6 L40 6 L50 -10 L60 6 L70 -6 L69 14 Z" fill={G(p.trim)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <Gloss cx={41} cy={2} rx={6} ry={2.4} o={0.5} />
            <circle cx="50" cy="3" r="3.2" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <circle cx="39" cy="8" r="2" fill={G(p.accent)} />
            <circle cx="61" cy="8" r="2" fill={G(p.accent)} />
            <rect x="30" y="12" width="40" height="6" rx="2" fill={G(p.trim)} {...RIM} strokeWidth="1.4" />
          </>
        )}
        {type === "k" && (
          <>
            <path d="M29 16 L27 -10 L39 2 L50 -16 L61 2 L73 -10 L71 16 Z" fill={G(p.trim)} {...RIM} strokeWidth="1.9" strokeLinejoin="round" />
            <Gloss cx={40} cy={-2} rx={7} ry={2.6} o={0.5} />
            <path d="M50 -26 V-12 M44 -21 H56" stroke={p.trim} strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="50" cy="1" r="3.6" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <circle cx="37" cy="7" r="2.2" fill={G(p.accent)} />
            <circle cx="63" cy="7" r="2.2" fill={G(p.accent)} />
            <rect x="28" y="12" width="44" height="7" rx="2" fill={G(p.trim)} {...RIM} strokeWidth="1.5" />
          </>
        )}
      </g>
      <ClayDefs colors={[...used]} side={side} />
    </svg>
  );
}

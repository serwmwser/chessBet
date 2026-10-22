"use client";
import Character, { Aura, ClayDefs, Eyes, Gloss, Mouth, grad, OUT, SKIN, type Kind, type Mood, type Side } from "./Character";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

const T = {
  w: { robe: "#ffffff", robe2: "#efe6c6", gold: "#ffcc33", hair: "#f2c94c", beard: "#ffffff", metal: "#e9edf7", gem: "#ff5fa8", horse: "#ffffff", mane: "#ffcc33", muzzle: "#f3ead2" },
  b: { robe: "#32333f", robe2: "#1d1d27", gold: "#e4363f", hair: "#2a2335", beard: "#8a8da0", metal: "#4a4c5c", gem: "#7a2cff", horse: "#32333f", mane: "#e4363f", muzzle: "#4b4d5f" },
};

const PAWNS_W: Kind[] = ["ninja", "police", "lady"];
const PAWNS_B: Kind[] = ["bandit", "ninja", "police", "lady"];
const RIM = { stroke: OUT, strokeOpacity: 0.55 };

/** Любая фигура в «глиняном» мультяшном стиле. variant выбирает персонажа-пешку. animate=false отключает анимацию (для доски с 32 фигурами). */
export default function Piece({ type, side, mood = "idle", size = 110, variant = 0, animate = true }: { type: PieceType; side: Side; mood?: Mood; size?: number; variant?: number; animate?: boolean }) {
  if (type === "p") {
    const list = side === "w" ? PAWNS_W : PAWNS_B;
    return <Character kind={list[variant % list.length]} side={side} mood={mood} size={size} animate={animate} />;
  }
  const p = T[side];
  const used = new Set<string>();
  const G = (c: string) => { used.add(c); return grad(c); };
  const lit = side === "b";
  const face = (
    <>
      <circle cx="27" cy="45" r="5" fill={G(SKIN)} {...RIM} strokeWidth="1.5" />
      <circle cx="73" cy="45" r="5" fill={G(SKIN)} {...RIM} strokeWidth="1.5" />
      <circle cx="50" cy="42" r="23" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
      <Gloss cx={40} cy={28} rx={9} ry={5} o={0.45} />
      <circle cx="35" cy="52" r="4" fill="#ff9aa8" opacity=".5" />
      <circle cx="65" cy="52" r="4" fill="#ff9aa8" opacity=".5" />
      <Eyes mood={mood} lit={false} />
      <Mouth mood={mood} kind="police" />
    </>
  );
  return (
    <svg className={"cc cc-" + side + " " + (animate ? "cc-" + mood : "cc-still")} viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={type} style={{ display: "block", overflow: "visible" }}>
      <Aura side={side} />
      <ellipse cx="50" cy="113" rx="32" ry="5" fill="rgba(0,0,0,.2)" />
      <ellipse cx="50" cy="106" rx="32" ry="9" fill={G(p.robe)} {...RIM} strokeWidth="1.6" />
      <Gloss cx={36} cy={103} rx={12} ry={2.2} rot={-8} o={0.35} />

      {type === "k" && (
        <>
          <path d="M26 106 C28 84 38 72 42 64 L58 64 C62 72 72 84 74 106 Z" fill={G(p.robe)} {...RIM} strokeWidth="1.8" />
          <Gloss cx={38} cy={86} rx={3.5} ry={12} rot={10} o={0.3} />
          <path d="M46 70 L54 70 L56 106 L44 106 Z" fill={G(p.gold)} {...RIM} strokeWidth="1.4" />
          <ellipse cx="50" cy="64" rx="17" ry="6" fill={G(p.robe2)} {...RIM} strokeWidth="1.6" />
          <path d="M30 50 Q30 98 50 100 Q70 98 70 50 Z" fill={G(p.beard)} {...RIM} strokeWidth="1.8" />
          <Gloss cx={40} cy={78} rx={4} ry={13} rot={8} o={0.3} />
          <g className="head tg">
            {face}
            <path d="M34 53 Q42 47 50 52 Q58 47 66 53 Q58 57 50 55 Q42 57 34 53 Z" fill={G(p.beard)} {...RIM} strokeWidth="1.5" />
            <path d="M30 27 L32 8 L41 19 L50 3 L59 19 L68 8 L70 27 Z" fill={G(p.gold)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <Gloss cx={42} cy={16} rx={6} ry={2.4} o={0.45} />
            <circle cx="50" cy="19" r="3.4" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <rect x="29" y="25" width="42" height="7" rx="2" fill={G(p.gold)} {...RIM} strokeWidth="1.5" />
            <path d="M33 38 L45 35 M55 35 L67 38" stroke={p.beard} strokeWidth="4" strokeLinecap="round" />
          </g>
        </>
      )}

      {type === "q" && (
        <>
          <path d="M24 106 C28 90 38 74 42 64 L58 64 C62 74 72 90 76 106 Z" fill={G(p.robe)} {...RIM} strokeWidth="1.8" />
          <Gloss cx={38} cy={88} rx={3.5} ry={13} rot={12} o={0.3} />
          <path d="M30 98 Q50 106 70 98" stroke={p.gold} strokeWidth="5" fill="none" />
          <path d="M42 66 Q50 80 58 66 Z" fill={G(p.gem)} />
          <ellipse cx="50" cy="64" rx="15" ry="5" fill={G(p.gold)} {...RIM} strokeWidth="1.6" />
          <g className="head tg">
            <path d="M24 46 Q20 12 50 12 Q80 12 76 46 Q78 72 68 78 L66 50 Q50 38 34 50 L32 78 Q22 72 24 46 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.8" />
            {face}
            <path d="M28 40 Q34 18 52 22 Q70 20 72 40 Q60 28 50 32 Q40 28 28 40 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.5" />
            <Gloss cx={42} cy={24} rx={8} ry={3} o={0.4} />
            <path d="M34 28 L36 12 L43 21 L50 8 L57 21 L64 12 L66 28 Z" fill={G(p.gold)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="50" cy="19" r="3" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <circle cx="24" cy="58" r="3" fill={G(p.gem)} {...RIM} strokeWidth="1" />
            <circle cx="76" cy="58" r="3" fill={G(p.gem)} {...RIM} strokeWidth="1" />
          </g>
        </>
      )}

      {type === "r" && (
        <>
          <path d="M28 106 L32 66 L68 66 L72 106 Z" fill={G(p.robe)} {...RIM} strokeWidth="1.8" />
          <Gloss cx={40} cy={86} rx={3.5} ry={13} rot={4} o={0.3} />
          <path d="M31 80 H69 M30 92 H70 M42 66 V80 M58 80 V92 M42 92 V106" stroke={p.gold} strokeWidth="2.2" />
          <rect x="26" y="62" width="48" height="8" rx="2" fill={G(p.metal)} {...RIM} strokeWidth="1.6" />
          <g className="head tg">
            {face}
            <path d="M26 36 L26 12 L36 12 L36 20 L44 20 L44 12 L56 12 L56 20 L64 20 L64 12 L74 12 L74 36 Q50 28 26 36 Z" fill={G(p.metal)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <Gloss cx={38} cy={20} rx={6} ry={3} o={0.4} />
            <path d="M32 26 H68" stroke={p.gold} strokeWidth="3" />
            <circle cx="50" cy="28" r="2.6" fill={G(p.gold)} {...RIM} strokeWidth="1" />
          </g>
        </>
      )}

      {type === "b" && (
        <>
          <path d="M28 106 C30 86 38 74 42 64 L58 64 C62 74 70 86 72 106 Z" fill={G(p.robe)} {...RIM} strokeWidth="1.8" />
          <Gloss cx={40} cy={86} rx={3.5} ry={12} rot={10} o={0.3} />
          <path d="M44 66 L56 66 L58 106 L42 106 Z" fill={G(p.gold)} {...RIM} strokeWidth="1.4" />
          <path d="M47 76 H53 M50 73 V84" stroke={p.robe} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="50" cy="64" rx="15" ry="5" fill={G(p.robe2)} {...RIM} strokeWidth="1.6" />
          <g className="head tg">
            {face}
            <path d="M28 34 Q50 -14 72 34 Q50 26 28 34 Z" fill={G(p.robe)} {...RIM} strokeWidth="1.8" strokeLinejoin="round" />
            <Gloss cx={42} cy={12} rx={7} ry={3.5} o={0.4} />
            <path d="M30 31 Q50 25 70 31" stroke={p.gold} strokeWidth="5" fill="none" />
            <path d="M50 2 V18 M44 8 H56" stroke={p.gold} strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </>
      )}

      {type === "n" && (
        <>
          <path d="M30 106 C32 90 38 78 42 66 L58 66 C62 78 68 90 70 106 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.8" />
          <path d="M42 68 L58 68 L60 76 L40 76 Z" fill={G(p.gold)} {...RIM} strokeWidth="1.4" />
          <g className="head tg">
            <path d="M31 30 L28 6 L42 22 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M69 30 L72 6 L58 22 Z" fill={G(p.horse)} {...RIM} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M33 26 L32 12 L39 22 Z M67 26 L68 12 L61 22 Z" fill={p.gem} opacity=".7" />
            <ellipse cx="50" cy="44" rx="22" ry="26" fill={G(p.horse)} {...RIM} strokeWidth="1.8" />
            <Gloss cx={40} cy={30} rx={9} ry={6} o={0.45} />
            <path d="M38 22 Q50 4 62 22 Q50 14 38 22 Z" fill={G(p.mane)} {...RIM} strokeWidth="1.5" />
            <path d="M68 28 Q86 40 78 70 Q74 56 66 50 Z" fill={G(p.mane)} {...RIM} strokeWidth="1.5" />
            <ellipse cx="50" cy="64" rx="15" ry="12" fill={G(p.muzzle)} {...RIM} strokeWidth="1.6" />
            <ellipse cx="44" cy="62" rx="2.2" ry="3" fill={OUT} />
            <ellipse cx="56" cy="62" rx="2.2" ry="3" fill={OUT} />
            <Eyes mood={mood} lit={lit} />
            {mood === "scream" || mood === "cheer" ? (
              <>
                <path d="M40 69 Q50 84 60 69 Z" fill="#7a1f3d" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
                <path d="M44 70 H48 M52 70 H56" stroke="#ffffff" strokeWidth="2.4" />
              </>
            ) : mood === "sad" ? (
              <path d="M44 72 Q50 67 56 72" stroke={OUT} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M43 69 Q50 75 57 69" stroke={OUT} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            )}
          </g>
        </>
      )}
      <ClayDefs colors={[...used]} side={side} />
    </svg>
  );
}

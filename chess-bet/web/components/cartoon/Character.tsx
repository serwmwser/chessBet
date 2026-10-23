"use client";
import { useMemo } from "react";

export type Kind = "ninja" | "police" | "lady" | "bandit";
export type Side = "w" | "b";
export type Mood = "idle" | "sad" | "cheer" | "scream";

export const SKIN = "#ffd9b8";
export const OUT = "#2a2140";

/** Стили и анимации персонажей (подключаются один раз на странице: <style>{CARTOON_CSS}</style>). Класс cc-still у фигуры отключает анимацию. */
export const CARTOON_CSS = `
.cc .tg { transform-box: fill-box; transform-origin: 50% 100%; }
.cc .eyes { transform-origin: 50% 50%; }
.cc .tail { transform-box: fill-box; transform-origin: 0% 50%; }
.cc-idle .head { animation: cc-bob 2.8s ease-in-out infinite; }
.cc-idle .eyes { animation: cc-blink 4s infinite; }
.cc-idle .tail { animation: cc-tail 1.6s ease-in-out infinite; }
.cc-blinkonly .eyes { animation: cc-blink2 3.2s infinite; animation-delay: var(--d, 0s); }
.cc-blinkonly .head { animation: cc-bob 3.6s ease-in-out infinite; animation-delay: var(--d, 0s); }
.cc-sad .head { animation: cc-droop 2.4s ease-in-out infinite; }
.cc-sad .tear { animation: cc-tear 1.6s ease-in infinite; }
.cc-cheer { animation: cc-jump .55s ease-in-out infinite; }
.cc-cheer .tail { animation: cc-tail .5s ease-in-out infinite; }
.cc-scream { animation: cc-shake .12s linear infinite; }
@keyframes cc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes cc-blink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
@keyframes cc-blink2 { 0%,84%,100% { transform: scaleY(1); } 88%,94% { transform: scaleY(.08); } }
@keyframes cc-tail { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(10deg); } }
@keyframes cc-droop { 0%,100% { transform: rotate(0) translateY(0); } 50% { transform: rotate(7deg) translateY(3px); } }
@keyframes cc-tear { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(14px); } }
@keyframes cc-jump { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes cc-shake { 0% { transform: translateX(-2px); } 50% { transform: translateX(2px); } 100% { transform: translateX(-2px); } }
@media (prefers-reduced-motion: reduce) { .cc, .cc * { animation: none !important; } }
`;

// ---------- «глиняный» вид: объёмные радиальные градиенты, мягкие блики, аура стороны ----------
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
/** Заливка-градиент для цвета (6-значный hex); сами градиенты рисует ClayDefs */
export const grad = (hex: string) => `url(#cg${hex.slice(1)})`;
const clayId = (hex: string) => "cg" + hex.slice(1);

export function ClayDefs({ colors, side }: { colors: string[]; side: Side }) {
  return (
    <defs>
      {colors.map((c) => (
        <radialGradient key={c} id={clayId(c)} cx=".36" cy=".28" r=".9">
          <stop offset="0" stopColor={mix(c, "#ffffff", 0.6)} />
          <stop offset=".45" stopColor={mix(c, "#ffffff", 0.1)} />
          <stop offset="1" stopColor={mix(c, "#2a1f3d", 0.38)} />
        </radialGradient>
      ))}
      <radialGradient id={"aura" + side} cx=".5" cy=".5" r=".5">
        {side === "w" ? (
          <>
            <stop offset=".55" stopColor="#fff6c9" stopOpacity=".85" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </>
        ) : (
          <>
            <stop offset=".5" stopColor="#ff2d55" stopOpacity=".6" />
            <stop offset=".8" stopColor="#7a00ff" stopOpacity=".28" />
            <stop offset="1" stopColor="#7a00ff" stopOpacity="0" />
          </>
        )}
      </radialGradient>
      <filter id="cblur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
    </defs>
  );
}

/** Мягкий блик */
export const Gloss = ({ cx, cy, rx, ry, rot = -25, o = 0.4 }: { cx: number; cy: number; rx: number; ry: number; rot?: number; o?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={o} filter="url(#cblur)" transform={`rotate(${rot} ${cx} ${cy})`} />
);

/** Аура вокруг фигуры: белая тёплая у белых, красно-фиолетовая у чёрных (отличает стороны без тяжёлых фильтров) */
export const Aura = ({ side }: { side: Side }) => <ellipse cx="50" cy="64" rx="52" ry="62" fill={`url(#aura${side})`} />;

export const PAL = {
  w: { base: "#fdfaf0", body: "#ffffff", collar: "#ffcc33", belt: "#ffcc33", hat: "#ffffff", brim: "#ece4c8", badge: "#ffcc33", mask: "#ffffff", band: "#ffcc33", hair: "#f2c94c", bow: "#ffffff", stripe: "#ffcc33" },
  b: { base: "#2a2b38", body: "#32333f", collar: "#e4363f", belt: "#e4363f", hat: "#23242f", brim: "#14141b", badge: "#e4363f", mask: "#23242f", band: "#e4363f", hair: "#2a2335", bow: "#7a2cff", stripe: "#e4363f" },
};

export function Eyes({ mood, lit }: { mood: Mood; lit: boolean }) {
  const ink = lit ? "#ffffff" : OUT;
  if (mood === "cheer")
    return (
      <g className="eyes tg">
        <path d="M34 45 Q40 37 46 45" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M54 45 Q60 37 66 45" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </g>
    );
  if (mood === "scream")
    return (
      <g className="eyes tg">
        <ellipse cx="40" cy="42" rx="6.5" ry="8.5" fill="#ffffff" stroke={OUT} strokeWidth="2" />
        <ellipse cx="60" cy="42" rx="6.5" ry="8.5" fill="#ffffff" stroke={OUT} strokeWidth="2" />
        <circle cx="40" cy="42" r="2.2" fill={OUT} />
        <circle cx="60" cy="42" r="2.2" fill={OUT} />
      </g>
    );
  const ry = mood === "sad" ? 4.4 : 5.4;
  return (
    <g className="eyes tg">
      {lit ? (
        <>
          <ellipse cx="40" cy="43" rx="5" ry="4.6" fill="#ffffff" />
          <ellipse cx="60" cy="43" rx="5" ry="4.6" fill="#ffffff" />
          <circle cx="41" cy="43" r="2.2" fill="#e4363f" />
          <circle cx="59" cy="43" r="2.2" fill="#e4363f" />
        </>
      ) : (
        <>
          <ellipse cx="40" cy="43" rx="4.2" ry={ry} fill={OUT} />
          <ellipse cx="60" cy="43" rx="4.2" ry={ry} fill={OUT} />
          <circle cx="41.6" cy="41" r="1.6" fill="#ffffff" />
          <circle cx="61.6" cy="41" r="1.6" fill="#ffffff" />
        </>
      )}
      {mood === "sad" && (
        <>
          <path d="M33 36 L46 31" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M54 31 L67 36" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <circle className="tear" cx="35" cy="50" r="3" fill="#8fd3ff" />
        </>
      )}
    </g>
  );
}

export function Mouth({ mood, kind }: { mood: Mood; kind: Kind }) {
  if (kind === "ninja" && mood === "idle") return null;
  if (mood === "scream") return <ellipse cx="50" cy="58" rx="7" ry="9" fill="#7a1f3d" stroke={OUT} strokeWidth="2.5" />;
  if (mood === "cheer")
    return (
      <>
        <path d="M38 52 Q50 70 62 52 Z" fill="#7a1f3d" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M44 60 Q50 65 56 60 Q50 57 44 60 Z" fill="#ff7a93" />
      </>
    );
  if (mood === "sad") return <path d="M43 59 Q50 52 57 59" stroke={OUT} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (kind === "bandit") return <path d="M41 56 Q52 62 60 52" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />;
  return <path d="M41 55 Q50 62 59 55" stroke={OUT} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

const RIM = { stroke: OUT, strokeOpacity: 0.55 };

/** Мультяшная пешка в «глиняном» стиле. side "w" = белые (светлые, добрые, золотая отделка, тёплая белая аура), "b" = чёрные (тёмные, злые, красная отделка, красно-фиолетовая аура). animate=false отключает анимацию (для доски с 32 фигурами). */
export default function Character({ kind, mood = "idle", size = 120, side, animate = true }: { kind: Kind; mood?: Mood; size?: number; side?: Side; animate?: boolean | "blink" }) {
  const sd: Side = side ?? (kind === "bandit" ? "b" : "w");
  const dl = useMemo(() => "-" + (Math.random() * 4).toFixed(2) + "s", []);
  const p = PAL[sd];
  const lit = sd === "b" && kind === "bandit";
  const used = new Set<string>();
  const G = (c: string) => { used.add(c); return grad(c); };
  return (
    <svg className={"cc cc-" + sd + " " + (animate === "blink" ? "cc-blinkonly" : animate ? "cc-" + mood : "cc-still")} viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={kind} style={{ display: "block", overflow: "visible", ...({ "--d": dl } as object) }}>
      <Aura side={sd} />
      <ellipse cx="50" cy="113" rx="30" ry="5" fill="rgba(0,0,0,.2)" />
      <ellipse cx="50" cy="106" rx="30" ry="9" fill={G(p.base)} {...RIM} strokeWidth="1.6" />
      <Gloss cx={36} cy={103} rx={11} ry={2.2} rot={-8} o={0.35} />
      <path d="M32 106 C34 86 40 74 42 64 L58 64 C60 74 66 86 68 106 Z" fill={G(p.body)} {...RIM} strokeWidth="1.8" />
      <Gloss cx={44} cy={82} rx={3.2} ry={11} rot={8} o={0.3} />
      {kind === "ninja" && <path d="M39 78 H61" stroke={p.belt} strokeWidth="6" strokeLinecap="round" />}
      {kind === "police" && (
        <>
          <circle cx="50" cy="74" r="2.6" fill={G(p.badge)} />
          <circle cx="50" cy="84" r="2.6" fill={G(p.badge)} />
          <circle cx="50" cy="94" r="2.6" fill={G(p.badge)} />
        </>
      )}
      {kind === "lady" && <path d="M42 66 Q50 78 58 66 Z" fill={G(sd === "w" ? "#ffe9a8" : "#7a2cff")} />}
      {kind === "bandit" && <path d="M41 74 H59 M38 84 H62 M35 94 H65" stroke={p.stripe} strokeWidth="4" />}
      <ellipse cx="50" cy="64" rx="15" ry="5" fill={G(p.collar)} {...RIM} strokeWidth="1.6" />

      <g className="head tg">
        {kind === "lady" && (
          <path d="M24 46 Q22 14 50 14 Q78 14 76 46 Q76 70 68 74 L66 50 Q50 38 34 50 L32 74 Q24 70 24 46 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.8" />
        )}
        <circle cx="27" cy="45" r="5" fill={G(SKIN)} {...RIM} strokeWidth="1.5" />
        <circle cx="73" cy="45" r="5" fill={G(SKIN)} {...RIM} strokeWidth="1.5" />
        <circle cx="50" cy="42" r="23" fill={G(SKIN)} {...RIM} strokeWidth="1.8" />
        <Gloss cx={40} cy={28} rx={9} ry={5} o={0.45} />
        {kind !== "ninja" && <circle cx="35" cy="52" r="4" fill="#ff9aa8" opacity=".5" />}
        {kind !== "ninja" && <circle cx="65" cy="52" r="4" fill="#ff9aa8" opacity=".5" />}

        {kind === "ninja" && <path d="M29 46 Q50 41 71 46 L70 60 Q50 71 30 60 Z" fill={G(p.mask)} {...RIM} strokeWidth="1.6" />}
        {kind === "bandit" && <path d="M29 38 Q50 32 71 38 Q73 50 62 49 Q54 46 50 48 Q46 46 38 49 Q27 50 29 38 Z" fill={G("#1c1c26")} />}

        <Eyes mood={mood} lit={lit} />
        <Mouth mood={mood} kind={kind} />

        {kind === "ninja" && (
          <>
            <rect x="28" y="26" width="44" height="9" rx="3" fill={G(p.band)} {...RIM} strokeWidth="1.5" />
            <rect x="43" y="27" width="14" height="7" rx="2" fill={G(sd === "w" ? "#ffffff" : "#7a2cff")} />
            <path className="tail" d="M72 30 L92 23 L85 32 L94 39 L72 35 Z" fill={G(p.band)} {...RIM} strokeWidth="1.2" />
          </>
        )}
        {kind === "police" && (
          <>
            <path d="M29 34 Q50 4 71 34 Z" fill={G(p.hat)} {...RIM} strokeWidth="1.8" />
            <Gloss cx={42} cy={20} rx={7} ry={3.5} o={0.4} />
            <path d="M26 34 Q50 42 74 34 L74 38 Q50 46 26 38 Z" fill={G(p.brim)} {...RIM} strokeWidth="1.5" />
            <circle cx="50" cy="22" r="5" fill={G(p.badge)} {...RIM} strokeWidth="1.2" />
          </>
        )}
        {kind === "lady" && (
          <>
            <path d="M28 40 Q34 18 52 22 Q70 20 72 40 Q60 28 50 32 Q40 28 28 40 Z" fill={G(p.hair)} {...RIM} strokeWidth="1.5" />
            <Gloss cx={42} cy={24} rx={8} ry={3} o={0.4} />
            <ellipse cx="62" cy="18" rx="7" ry="4.5" fill={G(p.bow)} {...RIM} strokeWidth="1.3" transform="rotate(-20 62 18)" />
            <ellipse cx="76" cy="20" rx="7" ry="4.5" fill={G(p.bow)} {...RIM} strokeWidth="1.3" transform="rotate(20 76 20)" />
            <circle cx="69" cy="19" r="3" fill={G(sd === "w" ? "#ffcc33" : "#e4363f")} {...RIM} strokeWidth="1" />
            <path d="M34 38 L31 36 M66 38 L69 36" stroke={OUT} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {kind === "bandit" && (
          <>
            <path d="M27 32 Q50 8 73 32 Q50 28 27 32 Z" fill={G("#5a5d70")} {...RIM} strokeWidth="1.8" />
            <Gloss cx={42} cy={18} rx={8} ry={3} o={0.35} />
            <path d="M52 31 Q74 30 80 36 Q64 38 52 35 Z" fill={G("#4a4c5c")} {...RIM} strokeWidth="1.5" />
          </>
        )}
      </g>
      <ClayDefs colors={[...used]} side={sd} />
    </svg>
  );
}

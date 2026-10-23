"use client";
import { useApp } from "@/lib/ctx";
import { whiteShare } from "@/lib/material";

/** Полоса преимущества по материалу: diff = очки белых минус очки чёрных. Только для бесплатных игр (в играх на USDC подсказок нет). */
export default function AdvantageBar({ diff }: { diff: number }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const w = Math.round(whiteShare(diff) * 10) / 10;
  const label = diff === 0 ? (ru ? "Равенство" : "Equal") : (diff > 0 ? (ru ? "Белые" : "White") : (ru ? "Чёрные" : "Black")) + " +" + Math.abs(diff);
  return (
    <div className="space-y-1" role="img" aria-label={label}>
      <div className="relative h-2.5 rounded-full overflow-hidden border border-black/20 bg-[#1c1c26]" dir="ltr">
        <div className="absolute inset-y-0 left-0 bg-[#f5f5f5] transition-all duration-500" style={{ width: w + "%" }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/70" />
      </div>
      <div className="text-xs text-center font-medium opacity-70">{label}</div>
    </div>
  );
}

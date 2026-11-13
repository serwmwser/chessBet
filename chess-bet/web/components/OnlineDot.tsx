"use client";

/** HiMeet presence: зелёная точка «в сети» (до 5 мин) или «был(а) недавно» (до суток). Точное время не показываем. */
export default function OnlineDot({ presence, ru }: { presence?: number; ru: boolean }) {
  if (presence !== 1 && presence !== 2) return null;
  const on = presence === 2;
  const label = on ? (ru ? "в сети" : "online") : ru ? "был(а) недавно" : "seen recently";
  return (
    <span className={"inline-flex items-center gap-1 text-xs " + (on ? "text-emerald-500 font-semibold" : "opacity-60")} title={label}>
      <span aria-hidden className={"inline-block h-2 w-2 rounded-full " + (on ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.25)]" : "bg-gray-400")} />
      {label}
    </span>
  );
}

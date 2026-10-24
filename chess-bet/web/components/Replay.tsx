"use client";
import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/ctx";

type Frame = { fen: string; last: { from: string; to: string } | null };

/** Просмотр партии: шаги назад/вперёд по уже сыгранным ходам. idx === null — смотрим текущую позицию. */
export function useReplay(san: string[]) {
  const [idx, setIdx] = useState<number | null>(null);
  const key = san.join(" ");

  const frames = useMemo<Frame[]>(() => {
    const c = new Chess();
    const out: Frame[] = [{ fen: c.fen(), last: null }];
    for (const s of key ? key.split(" ") : []) {
      try { const m = c.move(s); out.push({ fen: c.fen(), last: { from: m.from, to: m.to } }); } catch { break; }
    }
    return out;
  }, [key]);

  const total = frames.length - 1;
  useEffect(() => { if (total === 0) setIdx(null); }, [total]);

  const isLive = idx === null || idx >= total;
  const cur = isLive ? total : idx;

  return {
    fen: frames[cur].fen,
    last: frames[cur].last,
    isLive, cur, total,
    first: () => setIdx(0),
    prev: () => setIdx(Math.max(0, cur - 1)),
    next: () => setIdx(cur + 1 >= total ? null : cur + 1),
    toLive: () => setIdx(null),
    goto: (n: number) => setIdx(n >= total ? null : Math.max(0, n)),
  };
}

export function ReplayBar({ r }: { r: ReturnType<typeof useReplay> }) {
  const { t } = useApp();
  const btn = "btn btn-ghost !px-3 !py-2 text-base";
  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      <button className={btn} onClick={r.first} disabled={r.total === 0 || r.cur === 0} aria-label="First move">⏮</button>
      <button className={btn} onClick={r.prev} disabled={r.total === 0 || r.cur === 0} aria-label="Previous move">◀</button>
      <span className="mono text-sm min-w-[84px] text-center opacity-80">
        {r.isLive ? t("live") : `${r.cur} / ${r.total}`}
      </span>
      <button className={btn} onClick={r.next} disabled={r.isLive} aria-label="Next move">▶</button>
      <button className={btn} onClick={r.toLive} disabled={r.isLive} aria-label="Last move">⏭</button>
    </div>
  );
}

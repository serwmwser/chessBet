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

  // автовоспроизведение: партия идёт ход за ходом, как была сыграна
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return undefined;
    if (cur >= total) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setIdx(cur + 1 >= total ? null : cur + 1), 1500 / speed);
    return () => clearTimeout(id);
  }, [playing, cur, total, speed]);

  return {
    fen: frames[cur].fen,
    last: frames[cur].last,
    isLive, cur, total,
    first: () => { setPlaying(false); setIdx(0); },
    prev: () => { setPlaying(false); setIdx(Math.max(0, cur - 1)); },
    next: () => { setPlaying(false); setIdx(cur + 1 >= total ? null : cur + 1); },
    toLive: () => { setPlaying(false); setIdx(null); },
    goto: (n: number) => { setPlaying(false); setIdx(n >= total ? null : Math.max(0, n)); },
    playing, speed,
    togglePlay: () => { if (playing) { setPlaying(false); return; } if (isLive) setIdx(0); setPlaying(true); },
    cycleSpeed: () => setSpeed((v) => (v === 1 ? 2 : v === 2 ? 4 : 1)),
  };
}

export function ReplayBar({ r, auto }: { r: ReturnType<typeof useReplay>; auto?: boolean }) {
  const { t, lang } = useApp();
  const ru = lang === "ru";
  const btn = "btn btn-ghost !px-3 !py-2 text-base";
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
      <button className={btn} onClick={r.first} disabled={r.total === 0 || r.cur === 0} aria-label="First move" title={ru ? "В начало партии" : "To the start"}>⏮</button>
      <button className={btn} onClick={r.prev} disabled={r.total === 0 || r.cur === 0} aria-label="Previous move" title={ru ? "Ход назад" : "Previous move"}>◀</button>
      <span className="mono text-sm min-w-[84px] text-center opacity-80">
        {r.isLive ? t("live") : `${r.cur} / ${r.total}`}
      </span>
      <button className={btn} onClick={r.next} disabled={r.isLive} aria-label="Next move" title={ru ? "Ход вперёд" : "Next move"}>▶</button>
      <button className={btn} onClick={r.toLive} disabled={r.isLive} aria-label="Last move" title={ru ? "В конец партии" : "To the end"}>⏭</button>
      {auto && r.total > 0 && (
        <>
          <button className={btn} onClick={r.togglePlay} aria-label="Play" title={ru ? "Автопросмотр партии" : "Auto-play the game"}>{r.playing ? "⏸" : "▶▶"}</button>
          <button className={btn + " mono"} onClick={r.cycleSpeed} aria-label="Speed" title={ru ? "Скорость просмотра" : "Playback speed"}>{r.speed}×</button>
        </>
      )}
    </div>
  );
}

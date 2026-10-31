"use client";
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "./Avatar";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, "0")}`;
const SPEEDS = [1, 1.5, 2];
let current: HTMLAudioElement | null = null; // одновременно играет только одно голосовое

/** Плеер голосового сообщения: ▶/⏸, полоса прогресса, длительность, скорость 1×/1.5×/2× */
export default function VoiceBubble({ path, sec }: { path: string; sec: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [bad, setBad] = useState(false);

  useEffect(() => () => { const a = audio.current; if (a) { a.pause(); if (current === a) current = null; } }, []);

  const toggle = () => {
    let a = audio.current;
    if (!a) {
      a = new Audio(mediaUrl(path));
      a.preload = "metadata";
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => { setPlaying(false); setCur(0); };
      a.ontimeupdate = () => setCur(a!.currentTime);
      a.onerror = () => { setPlaying(false); setBad(true); };
      audio.current = a;
    }
    if (a.paused) {
      if (current && current !== a) current.pause();
      current = a;
      a.playbackRate = speed;
      a.play().catch(() => setBad(true));
    } else a.pause();
  };
  const nextSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    if (audio.current) audio.current.playbackRate = s;
  };

  const pct = Math.min(100, (cur / Math.max(1, sec)) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[11rem]">
      <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-current">
        {bad ? "!" : playing ? "⏸" : "▶"}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(127,127,127,.35)" }}><div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} /></div>
        <div className="mt-1 text-[11px] opacity-70 tabular-nums">{playing || cur > 0 ? fmt(cur) : "0:00"} / {fmt(sec)}</div>
      </div>
      <button type="button" onClick={nextSpeed} aria-label="Speed" className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-current">{speed}×</button>
    </div>
  );
}

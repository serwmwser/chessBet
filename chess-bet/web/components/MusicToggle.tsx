"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";

// Спокойная музыка создаётся прямо в браузере (без файлов и лицензий): мягкие аккорды Am – F – C – G и редкие нежные ноты.
const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
const PENTA = [69, 72, 74, 76, 79, 81];
const CHORD_SEC = 8;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Engine = { ctx: AudioContext; master: GainNode; timers: number[] };

function tone(ctx: AudioContext, bus: AudioNode, freq: number, type: OscillatorType, t0: number, attack: number, hold: number, release: number, peak: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = (Math.random() - 0.5) * 10;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.linearRampToValueAtTime(0, t0 + attack + hold + release);
  o.connect(g);
  g.connect(bus);
  o.start(t0);
  o.stop(t0 + attack + hold + release + 0.1);
}

function startEngine(): Engine {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  // общий мягкий фильтр, чтобы звук был глухим и тёплым
  const bus = ctx.createBiquadFilter();
  bus.type = "lowpass";
  bus.frequency.value = 1400;
  bus.Q.value = 0.3;
  bus.connect(master);
  // тихое эхо
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = 0.55;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  const dlp = ctx.createBiquadFilter();
  dlp.type = "lowpass";
  dlp.frequency.value = 900;
  bus.connect(delay);
  delay.connect(dlp);
  dlp.connect(fb);
  fb.connect(delay);
  dlp.connect(wet);
  wet.connect(master);
  void ctx.resume();
  master.gain.setTargetAtTime(0.16, ctx.currentTime, 1.2);

  let step = 0;
  const playChord = () => {
    const t0 = ctx.currentTime + 0.05;
    const chord = CHORDS[step % CHORDS.length];
    chord.forEach((n) => tone(ctx, bus, hz(n), "triangle", t0, 2.5, 3, 3.5, 0.05));
    tone(ctx, bus, hz(chord[0] - 12), "sine", t0, 2.5, 3, 3.5, 0.06);
    step++;
  };
  playChord();
  const timers: number[] = [];
  timers.push(window.setInterval(() => { if (ctx.state === "running") playChord(); }, CHORD_SEC * 1000));
  const pluck = () => {
    if (ctx.state === "running") {
      const n = PENTA[Math.floor(Math.random() * PENTA.length)];
      tone(ctx, bus, hz(n), "sine", ctx.currentTime + 0.05, 0.03, 0, 2.8, 0.06);
    }
    timers[1] = window.setTimeout(pluck, 2500 + Math.random() * 3500);
  };
  timers[1] = window.setTimeout(pluck, 3000);
  return { ctx, master, timers };
}

function stopEngine(e: Engine) {
  e.timers.forEach((id) => { clearInterval(id); clearTimeout(id); });
  try { e.master.gain.setTargetAtTime(0, e.ctx.currentTime, 0.3); } catch { /* уже закрыт */ }
  setTimeout(() => { void e.ctx.close().catch(() => {}); }, 1500);
}

/** Кнопка тихой фоновой музыки: по умолчанию выключена, включается нажатием; в фоновой вкладке музыка замолкает. */
export default function MusicToggle() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [on, setOn] = useState(false);
  const eng = useRef<Engine | null>(null);

  const toggle = () => {
    if (eng.current) { stopEngine(eng.current); eng.current = null; setOn(false); return; }
    try { eng.current = startEngine(); setOn(true); } catch { setOn(false); }
  };

  useEffect(() => {
    const onVis = () => {
      const e = eng.current;
      if (!e) return;
      if (document.hidden) void e.ctx.suspend(); else void e.ctx.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (eng.current) { stopEngine(eng.current); eng.current = null; }
    };
  }, []);

  const label = ru ? (on ? "Выключить музыку" : "Включить тихую музыку") : (on ? "Turn music off" : "Turn on calm music");
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={label} title={label}
      className={"w-10 h-10 rounded-xl text-lg " + (on ? "bg-emerald-500/25" : "bg-black/5 dark:bg-white/10 opacity-70")}>
      {on ? "♫" : "♪"}
    </button>
  );
}

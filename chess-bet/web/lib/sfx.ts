"use client";
import { useEffect, useState } from "react";

/** Звуки эмоций фигур, шаха, рокировки, превращения и конца партии: синтез на Web Audio, без звуковых файлов. */

function run(total: number, build: (c: AudioContext, t0: number) => void) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const c = new AC();
    void c.resume();
    build(c, c.currentTime);
    setTimeout(() => c.close(), (total + 0.4) * 1000);
  } catch { /* звук необязателен */ }
}

function note(c: AudioContext, t0: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number, vibHz = 0, vibDepth = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (vibHz) {
    const l = c.createOscillator();
    l.frequency.value = vibHz;
    const lg = c.createGain();
    lg.gain.value = vibDepth;
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t0);
    l.stop(t0 + dur + 0.05);
  }
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** Базовая высота голоса каждой фигуры: пешка пищит, ладья басит */
const BASE: Record<string, number> = { p: 760, n: 620, b: 430, r: 200, q: 540, k: 280 };

/** Голос фигуры: cheer — радостный возглас, scream — испуганный визг (когда фигуру берут), sad — грустный вздох */
export function playVoice(piece: string, mood: "cheer" | "scream" | "sad") {
  const f = BASE[piece] ?? 500;
  if (mood === "cheer") {
    run(0.5, (c, t) => { note(c, t, f, f * 1.5, 0.12, "triangle", 0.2); note(c, t + 0.13, f * 1.3, f * 1.8, 0.16, "triangle", 0.2); });
  } else if (mood === "scream") {
    run(0.6, (c, t) => note(c, t, f * 1.9, f * 0.55, 0.5, "sawtooth", 0.14, 22, f * 0.08));
  } else {
    run(0.9, (c, t) => note(c, t, f, f * 0.55, 0.8, "triangle", 0.18, 5, f * 0.03));
  }
}

/** Шах: тревожная двойная сирена */
export function playCheck() {
  run(0.5, (c, t) => { [988, 740, 988].forEach((fr, i) => note(c, t + i * 0.14, fr, fr, 0.12, "square", 0.07)); });
}

/** Превращение пешки: быстрое восхождение */
export function playPromo() {
  run(0.6, (c, t) => { [523, 659, 784, 1047, 1319].forEach((fr, i) => note(c, t + i * 0.07, fr, fr, 0.14, "triangle", 0.2)); });
}

/** Рокировка: два глухих удара */
export function playCastle() {
  run(0.5, (c, t) => { note(c, t, 160, 60, 0.15, "sine", 0.4); note(c, t + 0.14, 160, 60, 0.15, "sine", 0.4); });
}

/** Победа: короткая фанфара */
export function playWin() {
  run(1.2, (c, t) => { [523.25, 659.25, 783.99].forEach((fr, i) => note(c, t + i * 0.14, fr, fr, 0.16, "triangle", 0.22)); note(c, t + 0.42, 1046.5, 1046.5, 0.6, "triangle", 0.25); });
}

/** Поражение: грустный тромбон */
export function playLose() {
  run(2.3, (c, t) => {
    note(c, t, 392, 370, 0.4, "sawtooth", 0.09);
    note(c, t + 0.4, 370, 349, 0.4, "sawtooth", 0.09);
    note(c, t + 0.8, 349, 311, 0.4, "sawtooth", 0.09);
    note(c, t + 1.2, 311, 233, 0.9, "sawtooth", 0.1, 6, 6);
  });
}

/** true через ms миллисекунд после того, как active стал true (для окна результата: сначала виден мат на доске); сбрасывается при active=false */
export function useEndDelay(active: boolean, ms: number): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!active) { setReady(false); return undefined; }
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [active, ms]);
  return active && ready;
}

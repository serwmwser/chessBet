"use client";
import { useCallback, useEffect, useState } from "react";

// Личные настройки мультяшного режима: какие пешки видит игрок и каким голосом говорят фигуры.
// Хранятся только на этом устройстве. Соперник видит свои настройки, а не ваши.

export const PAWN_NAMES: [string, string][] = [["Ниндзя", "Ninja"], ["Полицейский", "Police"], ["Леди", "Lady"], ["Бандит", "Bandit"]];

export type VoicePack = { id: string; ru: string; en: string; pitch: number; rate: number };
export const VOICE_PACKS: VoicePack[] = [
  { id: "std", ru: "Обычный", en: "Normal", pitch: 1, rate: 1.05 },
  { id: "mouse", ru: "Тонкий (мышонок)", en: "Squeaky (mouse)", pitch: 1.6, rate: 1.15 },
  { id: "giant", ru: "Низкий (великан)", en: "Deep (giant)", pitch: 0.6, rate: 0.9 },
  { id: "robot", ru: "Робот", en: "Robot", pitch: 0.35, rate: 0.85 },
];
export const packOf = (id: string): VoicePack => VOICE_PACKS.find((p) => p.id === id) ?? VOICE_PACKS[0];

export type CartoonPrefs = { pawnW: number; pawnB: number; pack: string };
export const DEFAULT_PREFS: CartoonPrefs = { pawnW: 1, pawnB: 3, pack: "std" };
const KEY = "cb_cprefs";
const EVT = "cb-cprefs";

export function readPrefs(): CartoonPrefs {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    const n = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v < PAWN_NAMES.length ? v : d);
    return { pawnW: n(o.pawnW, DEFAULT_PREFS.pawnW), pawnB: n(o.pawnB, DEFAULT_PREFS.pawnB), pack: packOf(String(o.pack)).id };
  } catch { return DEFAULT_PREFS; }
}

/** Настройки с сохранением; несколько мест на экране видят изменения друг друга */
export function useCartoonPrefs() {
  const [p, setP] = useState<CartoonPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    setP(readPrefs());
    const on = () => setP(readPrefs());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const set = useCallback((patch: Partial<CartoonPrefs>) => {
    const next = { ...readPrefs(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* хранилище недоступно */ }
    setP(next);
    try { window.dispatchEvent(new Event(EVT)); } catch { /* ничего */ }
  }, []);
  return [p, set] as const;
}

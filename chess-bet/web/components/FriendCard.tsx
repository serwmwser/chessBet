"use client";
import { useState } from "react";
import { useApp } from "@/lib/ctx";
import type { Color } from "@/lib/room";

/** Кнопка на главной: бесплатная партия с другом по ссылке (без кошелька и ставок) */
export default function FriendCard({ onStart }: { onStart: (c: Color | "r") => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [c, setC] = useState<Color | "r">("r");
  const opts: [Color | "r", string][] = [["w", ru ? "Белые" : "White"], ["b", ru ? "Чёрные" : "Black"], ["r", ru ? "Случайно" : "Random"]];
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">🤝 {ru ? "Сыграть с другом бесплатно" : "Play a friend for free"}</h2>
      <p className="text-sm opacity-80">
        {ru
          ? "Создайте партию и отправьте другу ссылку. Кошелёк, регистрация и деньги не нужны. Потом можно играть и на USDC."
          : "Create a game and send your friend the link. No wallet, sign-up or money needed. You can play for USDC later."}
      </p>
      <div className="flex gap-2">
        {opts.map(([k, l]) => (
          <button key={k} type="button" className={"chip flex-1 justify-center " + (c === k ? "chip-on" : "")} onClick={() => setC(k)}>{l}</button>
        ))}
      </div>
      <button type="button" className="btn btn-primary w-full" onClick={() => onStart(c)}>{ru ? "Создать партию и получить ссылку" : "Create a game and get the link"}</button>
    </section>
  );
}

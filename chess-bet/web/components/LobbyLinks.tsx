"use client";
import { useApp } from "@/lib/ctx";

/** Главная: быстрый вход в мульт-арену на токены (стоит перед разделом «Создать игру») */
export default function LobbyLinks({ onArena }: { onArena: () => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  return (
    <button
      type="button"
      onClick={onArena}
      className="w-full rounded-2xl px-4 py-3 text-start shadow-glow"
      style={{ background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00" }}
    >
      <div className="text-base font-extrabold">🎭👑 {ru ? "Мульт-арена на токены" : "Cartoon arena for tokens"}</div>
      <div className="text-xs font-medium opacity-80">
        {ru ? "Ставки 25.5–500 USDC · мультяшные фигуры, голоса и NFT партий" : "Stakes 25.5–500 USDC · cartoon pieces, voices and game NFTs"}
      </div>
    </button>
  );
}

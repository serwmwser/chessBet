"use client";
import Roadmap from "@/components/Roadmap";
import { useApp } from "@/lib/ctx";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Публичная страница дорожной карты: видна любому посетителю без входа и кошелька. */
export default function RoadmapPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <a className="text-sm underline" href={BASE + "/"}>← {ru ? "На главную" : "Home"}</a>
      <h1 className="text-2xl font-bold">🗺 {ru ? "Дорожная карта ChessBet" : "ChessBet roadmap"}</h1>
      <p className="text-sm opacity-80">
        {ru ? "Здесь наши планы до III квартала 2027 года." : "Here are our plans until Q3 2027."}
      </p>
      <Roadmap open />
      <p className="text-xs opacity-60">18+ · {ru ? "Ставки связаны с риском проигрыша. Играйте ответственно." : "Stakes carry the risk of losing. Play responsibly."}</p>
    </main>
  );
}

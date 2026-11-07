"use client";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";

type Item = { href: string; ru: string; en: string; icon: string };
const ITEMS: Item[] = [
  { href: ROUTES.home, ru: "Играть", en: "Play", icon: "♞" },
  { href: ROUTES.chess, ru: "Шахматы", en: "Chess", icon: "♟" },
  { href: ROUTES.crypto, ru: "Крипто", en: "Crypto", icon: "🪙" },
  { href: ROUTES.nft, ru: "NFT", en: "NFT", icon: "🎨" },
  { href: ROUTES.tournaments, ru: "Турниры", en: "Tournaments", icon: "🏆" },
  { href: ROUTES.dating, ru: "Знакомства", en: "Dating", icon: "💞" },
  { href: ROUTES.puzzles, ru: "Задачи", en: "Puzzles", icon: "🧩" },
  { href: ROUTES.ads, ru: "Объявления", en: "Classifieds", icon: "🛍" },
  { href: ROUTES.feed, ru: "Лента", en: "Feed", icon: "📰" },
  { href: ROUTES.messages, ru: "Сообщения", en: "Messages", icon: "💬" },
  { href: ROUTES.roadmap, ru: "Карта развития", en: "Roadmap", icon: "🗺" },
  { href: ROUTES.faq, ru: "Вопросы и ответы", en: "FAQ", icon: "❓" },
  { href: ROUTES.about, ru: "О проекте", en: "About", icon: "ℹ️" },
  { href: ROUTES.terms, ru: "Условия", en: "Terms", icon: "📜" },
];

/** Плитки со всеми разделами. force: показывать всегда (вошедший профиль); иначе только при подключённом кошельке */
export default function SectionsGrid({ force }: { force?: boolean }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const account = useActiveAccount();
  if (!force && !account) return null;
  return (
    <section className="card space-y-3" aria-labelledby="sections-h">
      <h2 id="sections-h" className="text-lg font-bold">{ru ? "Все разделы" : "All sections"}</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ITEMS.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:opacity-90" style={{ borderColor: "rgba(212,160,23,.45)", color: "#d4a017" }}>
              <span aria-hidden="true" className="text-lg leading-none">{it.icon}</span>
              <span>{ru ? it.ru : it.en}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

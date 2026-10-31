"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { SESSION_EVENT, tokenFor } from "@/lib/social";
import { useUnread } from "@/lib/dm";

type Item = { href: string; ru: string; en: string; icon: string };
const ITEMS: Item[] = [
  { href: ROUTES.home, ru: "Играть", en: "Play", icon: "♞" },
  { href: ROUTES.nft, ru: "NFT", en: "NFT", icon: "🎨" },
  { href: ROUTES.feed, ru: "Лента", en: "Feed", icon: "📰" },
  { href: ROUTES.messages, ru: "Сообщения", en: "Messages", icon: "✉️" },
  { href: ROUTES.profile, ru: "Профиль", en: "Profile", icon: "👤" },
  // Позже, когда страницы будут готовы: ROUTES.chess, ROUTES.crypto, ROUTES.leaderboard, ROUTES.faq
];

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/** Верхнее меню разделов сайта: прокручивается по горизонтали на телефоне, текущий раздел подсвечен золотом */
export default function SiteNav() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const path = norm(usePathname() || "/");
  const account = useActiveAccount();
  const [token, setToken] = useState("");
  useEffect(() => {
    const r = () => setToken(tokenFor(account?.address));
    r();
    window.addEventListener(SESSION_EVENT, r);
    return () => window.removeEventListener(SESSION_EVENT, r);
  }, [account?.address]);
  const unread = useUnread(token);
  return (
    <nav aria-label={ru ? "Разделы сайта" : "Site sections"} className="mx-auto max-w-3xl px-3 pt-2">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {ITEMS.map((it) => {
          const on = norm(it.href) === path;
          return (
            <li key={it.href} className="shrink-0">
              <a
                href={it.href}
                aria-current={on ? "page" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition"
                style={on
                  ? { background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00", borderColor: "transparent" }
                  : { borderColor: "rgba(212,160,23,.45)", color: "#d4a017" }}
              >
                <span aria-hidden="true">{it.icon}</span>{ru ? it.ru : it.en}
                {it.href === ROUTES.messages && unread > 0 && (
                  <span className="ms-0.5 min-w-[1.2rem] h-[1.2rem] px-1 rounded-full text-[11px] font-bold inline-flex items-center justify-center" style={{ background: "#e0245e", color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

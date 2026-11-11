"use client";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";

type Tile = {
  id: string;
  icon: string;
  href?: string; // ссылка на отдельную страницу
  ru: [string, string];
  en: [string, string];
};

/** Порядок разделов на главной: объявления, знакомства, общение, профиль, заработать, играть (шахматы в конце) */
const TILES: Tile[] = [
  { id: "ads", icon: "🛍", href: ROUTES.ads, ru: ["Объявления", "Купить, продать, найти работу и услуги. Первое объявление бесплатно"], en: ["Classifieds", "Buy, sell, find jobs and services. Your first ad is free"] },
  { id: "dating", icon: "💞", href: ROUTES.dating, ru: ["Знакомства", "Анкеты для взрослых (18+) и общение через шахматы"], en: ["Dating", "Profiles for adults (18+) and chess-based chat"] },
  { id: "messages", icon: "💬", href: ROUTES.messages, ru: ["Общение", "Бесплатные сообщения и звонки с переводом чата, почта HiMeet Mail, лента Rook Club"], en: ["Chat", "Free messages and calls with chat translation, HiMeet Mail, Rook Club feed"] },
  { id: "profile", icon: "👤", href: ROUTES.profile, ru: ["Профиль", "Ваша страница, друзья, партии и объявления"], en: ["Profile", "Your page, friends, games and ads"] },
  { id: "earn", icon: "💰", ru: ["Заработать", "Токен TCH, NFT, приглашения друзей и дорожная карта"], en: ["Earn", "TCH token, NFT, friend invites and the roadmap"] },
  { id: "play", icon: "♞", ru: ["Играть", "Шахматы с ботом, другом или онлайн, задачи и турниры"], en: ["Play", "Chess against a bot, a friend or online, puzzles and tournaments"] },
];

const BORDER = "rgba(255,255,255,.9)";

/** Шесть крупных плиток главной в понятном порядке. Заработать и Играть открывают разделы внутри главной (onEarn, onPlay). */
export default function HomeTiles({ onEarn, onPlay, onCartoon }: { onEarn?: () => void; onPlay?: () => void; onCartoon?: () => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  return (
    <section aria-label={ru ? "Разделы сайта" : "Site sections"}>
      {onCartoon && (
        <button type="button" onClick={onCartoon} className="tile-pop mb-2.5 flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-start text-white shadow-glow" style={{ background: "linear-gradient(90deg,#ff5c93,#a855f7 55%,#3b82f6)" }}>
          <span aria-hidden="true" className="text-4xl leading-none">🎭</span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold">{ru ? "Мультяшные шахматы" : "Cartoon chess"}</span>
            <span className="block text-xs font-medium opacity-90">{ru ? "Весёлые фигуры, яркие доски и голоса. С ботом бесплатно" : "Funny pieces, bright boards and voices. Free against the bot"}</span>
          </span>
        </button>
      )}
      <ul className="grid grid-cols-2 gap-2.5">
        {TILES.map((t, i) => {
          const [h, d] = ru ? t.ru : t.en;
          const body = (
            <>
              <span aria-hidden="true" className="text-3xl leading-none">{t.icon}</span>
              <span className="text-base font-extrabold" style={{ color: "#6d28d9" }}>{h}</span>
              <span className="text-xs opacity-75 leading-snug">{d}</span>
            </>
          );
          const cls = "tile-pop tile-" + (i + 1) + " card flex h-full w-full flex-col items-start gap-1.5 text-start transition hover:opacity-90";
          const style = { borderColor: BORDER } as const;
          return (
            <li key={t.id}>
              {t.href ? (
                <Link href={t.href} className={cls} style={style}>{body}</Link>
              ) : (
                <button type="button" className={cls} style={style} onClick={t.id === "earn" ? onEarn : onPlay}>{body}</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

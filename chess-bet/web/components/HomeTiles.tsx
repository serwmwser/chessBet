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
  { id: "messages", icon: "💬", href: ROUTES.messages, ru: ["Общение", "Бесплатные сообщения и звонки с переводом чата, лента Rook Club"], en: ["Chat", "Free messages and calls with chat translation, Rook Club feed"] },
  { id: "profile", icon: "👤", href: ROUTES.profile, ru: ["Профиль", "Ваша страница, друзья, партии и объявления"], en: ["Profile", "Your page, friends, games and ads"] },
  { id: "earn", icon: "💰", ru: ["Заработать", "Токен TCH, NFT, приглашения друзей и дорожная карта"], en: ["Earn", "TCH token, NFT, friend invites and the roadmap"] },
  { id: "play", icon: "♞", ru: ["Играть", "Шахматы с ботом, другом или онлайн, задачи и турниры"], en: ["Play", "Chess against a bot, a friend or online, puzzles and tournaments"] },
];

const BORDER = "rgba(212,160,23,.45)";

/** Шесть крупных плиток главной в понятном порядке. Заработать и Играть открывают разделы внутри главной (onEarn, onPlay). */
export default function HomeTiles({ onEarn, onPlay }: { onEarn?: () => void; onPlay?: () => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  return (
    <section aria-label={ru ? "Разделы сайта" : "Site sections"}>
      <ul className="grid grid-cols-2 gap-2.5">
        {TILES.map((t) => {
          const [h, d] = ru ? t.ru : t.en;
          const body = (
            <>
              <span aria-hidden="true" className="text-3xl leading-none">{t.icon}</span>
              <span className="text-base font-extrabold" style={{ color: "#d4a017" }}>{h}</span>
              <span className="text-xs opacity-75 leading-snug">{d}</span>
            </>
          );
          const cls = "card flex h-full w-full flex-col items-start gap-1.5 text-start transition hover:opacity-90";
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

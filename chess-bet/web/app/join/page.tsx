"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { captureRef } from "@/lib/ref";
import { ROUTES } from "@/lib/urls";

type Card = { icon: string; href: string; ru: [string, string, string]; en: [string, string, string] };

const CARDS: Card[] = [
  {
    icon: "💬", href: ROUTES.messages,
    ru: ["Бесплатные звонки и сообщения", "Пишите и звоните из профиля любому участнику. В чате включается автоматический перевод, поэтому можно общаться на разных языках.", "Открыть сообщения"],
    en: ["Free calls and messages", "Message and call any member from their profile. Chats have automatic translation, so you can talk across languages.", "Open messages"],
  },
  {
    icon: "🛍", href: ROUTES.ads,
    ru: ["Объявления со всего мира", "Первое объявление бесплатно, за каждого приглашённого друга ещё одно. Покупайте, продавайте, ищите работу и услуги, в том числе шахматные доски, часы и уроки.", "Разместить объявление"],
    en: ["Classifieds from around the world", "Your first ad is free, and every friend you invite gives you another one. Buy, sell, find jobs and services, including chess sets, clocks and lessons.", "Post an ad"],
  },
  {
    icon: "💞", href: ROUTES.dating,
    ru: ["Знакомства через шахматы", "Анкеты для взрослых (18+). Партия, голосовое сообщение или звонок вместо пустой переписки. Есть жалобы и блокировка собеседника.", "Создать анкету"],
    en: ["Dating through chess", "Profiles for adults only (18+). A game, a voice message or a call instead of small talk. Report and block tools are built in.", "Create a profile"],
  },
  {
    icon: "♟", href: ROUTES.chess,
    ru: ["Шахматы бесплатно", "Играйте с ботом или другом, решайте задачи, делитесь партиями. Ставки в USDC необязательны, только для взрослых, и играть можно только теми суммами, потерю которых вы можете себе позволить.", "Сыграть партию"],
    en: ["Chess for free", "Play a bot or a friend, solve puzzles, share your games. USDC stakes are optional and for adults only; only play with amounts you can afford to lose.", "Play a game"],
  },
];

const TXT = {
  ru: {
    title: "Присоединяйтесь к Chess Bet",
    crumb: "Присоединиться",
    intro: "Бесплатный мессенджер со звонками, объявления, знакомства и шахматы в одном месте. Выберите, с чего начать.",
    stepsH: "Как начать за минуту",
    steps: ["Откройте любой раздел ниже.", "Войдите с кошельком (это бесплатно и занимает меньше минуты).", "Пригласите друга по своей ссылке: за каждого пришедшего вы получаете бонус."],
    noteH: "Важно",
    note: "Сайту нужен возраст 18+. Контракт ставок открыт на Polygonscan, но не проходил платный аудит; подробности на странице «Прозрачность».",
    trans: "Прозрачность контракта",
  },
  en: {
    title: "Join Chess Bet",
    crumb: "Join",
    intro: "A free messenger with calls, classifieds, dating and chess in one place. Pick where to start.",
    stepsH: "Get started in a minute",
    steps: ["Open any section below.", "Sign in with a wallet (free, takes under a minute).", "Invite a friend with your link: every friend who joins earns you a bonus."],
    noteH: "Good to know",
    note: "The site is for adults (18+). The stakes contract is open on Polygonscan but has not had a paid audit; see the Transparency page for details.",
    trans: "Contract transparency",
  },
};

export default function JoinPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const t = ru ? TXT.ru : TXT.en;

  // ссылка-приглашение ?ref=… сохраняется и здесь, чтобы друг засчитался пригласившему
  useEffect(() => { captureRef(); }, []);

  return (
    <PageShell title={t.title} intro={t.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{t.crumb}</span>
      </nav>

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const [h, d, b] = ru ? c.ru : c.en;
          return (
            <section key={c.href} className="card flex flex-col gap-2">
              <h2 className="text-lg font-bold"><span aria-hidden="true">{c.icon}</span> {h}</h2>
              <p className="text-sm opacity-85 grow">{d}</p>
              <a href={c.href} className="btn-primary inline-block self-start rounded-xl px-4 py-2 text-sm font-bold">{b}</a>
            </section>
          );
        })}
      </div>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{t.stepsH}</h2>
        <ol className="list-decimal ps-5 space-y-1 text-sm opacity-90">
          {t.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{t.noteH}</h2>
        <p className="text-sm opacity-85">{t.note}</p>
        <a className="underline text-sm" href={`${ROUTES.transparency}`}>{t.trans}</a>
      </section>
    </PageShell>
  );
}

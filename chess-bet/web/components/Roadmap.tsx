"use client";
import { useApp } from "@/lib/ctx";

type Stage = { when: string; title: string; items: string[]; done?: boolean };

const RU: Stage[] = [
  { when: "Уже готово", title: "Основа", done: true, items: [
    "Шахматы онлайн со ставками в USDC в сети Polygon. Деньги хранит смарт-контракт, комиссия 6%",
    "Игра с ботом и мульт-арена со ставками 25.5–500 USDC",
    "Повтор и анализ партий, паузы, установка на телефон",
    "NFT любого хода партии: 1 USDC, роялти 5%, продажа на OpenSea",
    "Бесплатная партия с другом по ссылке, без кошелька и ставок",
    "Реферальная программа «Вечный гамбит»",
    "Наборы мультяшных фигур: «Рыцари» и яркие доски",
  ] },
  { when: "IV кв. 2026", title: "Запуск NFT и укрепление основы", items: [
    "Страница «Мои NFT» и подсказки по продаже на OpenSea",
    "Собственный домен и пересборка Android-приложения без строки браузера",
    "Новая иконка и оформление приложения",
    "Проверка исходников NFT-контракта на Polygonscan",
    "Сохранение партий с ботом, раздел «Мои партии»",
    "Чат сообщества, вопросы и ответы",
  ] },
  { when: "I кв. 2027", title: "Рост и соревнования", items: [
    "Рейтинг игроков (Эло) и таблица лидеров по сезонам",
    "Турниры с призовым фондом в USDC",
    "Друзья и вызов по ссылке",
    "Уведомления о ходе соперника и начале турнира",
    "Больше языков интерфейса",
    "Витрина NFT: лучшие картинки партий",
  ] },
  { when: "II кв. 2027", title: "Подготовка к токену", items: [
    "Очки активности (без денежной стоимости) за игры, турниры и приглашения",
    "Платный независимый аудит смарт-контрактов",
    "Юридическая консультация по токену",
    "Проект токеномики и голосование сообщества по главным параметрам",
  ] },
  { when: "III кв. 2027", title: "Собственный токен (по условиям)", items: [
    "Условия запуска: не менее 100 000 игроков (уникальных кошельков, сыгравших хотя бы одну партию), пройденный аудит, юридическая проверка, токеномика утверждена сообществом",
    "Планируется: скидки на комиссию, вход в турниры, оплата создания NFT, обмен очков активности",
    "Листинг на бирже только после запуска и только там, где это допустимо по закону",
    "Если условие не выполнено, запуск переносится: токен выходит не по дате, а по готовности",
  ] },
];

const EN: Stage[] = [
  { when: "Done", title: "Foundation", done: true, items: [
    "Online chess with USDC stakes on Polygon. Funds are held by a smart contract, 6% fee",
    "Bot games and the cartoon arena with 25.5–500 USDC stakes",
    "Game replay and analysis, pauses, install on your phone",
    "NFT of any move of a game: 1 USDC, 5% royalty, sell on OpenSea",
    "Free game with a friend by link, no wallet or stakes",
    "Referral program: Eternal Gambit",
    "Cartoon piece sets: “Knights” and bright boards",
  ] },
  { when: "Q4 2026", title: "NFT launch and strengthening the base", items: [
    "My NFTs page and tips for selling on OpenSea",
    "Own domain and a rebuilt Android app without the browser bar",
    "New app icon and look",
    "NFT contract source code verified on Polygonscan",
    "Saved bot games, a My games section",
    "Community chat, questions and answers",
  ] },
  { when: "Q1 2027", title: "Growth and competition", items: [
    "Player rating (Elo) and seasonal leaderboards",
    "Tournaments with a USDC prize pool",
    "Friends and challenge by link",
    "Notifications about your opponent's move and tournament start",
    "More interface languages",
    "NFT showcase: the best pictures of games",
  ] },
  { when: "Q2 2027", title: "Preparing for the token", items: [
    "Activity points (no cash value) for games, tournaments and invites",
    "Paid independent audit of the smart contracts",
    "Legal consultation on the token",
    "Draft tokenomics and a community vote on the main parameters",
  ] },
  { when: "Q3 2027", title: "Own token (conditional)", items: [
    "Launch conditions: at least 100,000 players (unique wallets that played at least one game), a passed audit, a legal review and tokenomics approved by the community",
    "Planned uses: fee discounts, tournament entry, paying for NFT creation, exchanging activity points",
    "Exchange listing only after launch and only where the law allows",
    "If a condition is not met, the launch is postponed: the token comes when it is ready, not by a date",
  ] },
];

/** Дорожная карта приложения до III квартала 2027 для сообщества игроков */
export default function Roadmap({ open }: { open?: boolean } = {}) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const stages = ru ? RU : EN;
  return (
    <details className="card group" open={open}>
      <summary className="cursor-pointer list-none flex items-center justify-between text-lg font-bold">
        <span>🗺 {ru ? "Дорожная карта" : "Roadmap"}</span>
        <span className="opacity-50 transition group-open:rotate-180" aria-hidden>▾</span>
      </summary>
      <p className="mt-2 text-xs opacity-70">
        {ru ? "Сроки ориентировочные: этап выходит, когда готов и проверен." : "Dates are approximate: a stage ships when it is ready and tested."}
      </p>
      <ol className="mt-3 space-y-3">
        {stages.map((s) => (
          <li key={s.when} className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm">{s.done ? "✅ " : ""}{s.title}</span>
              <span className="chip text-xs shrink-0">{s.when}</span>
            </div>
            <ul className="text-sm space-y-1 opacity-90">
              {s.items.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>{s.done ? "✔" : "•"}</span><span>{x}</span></li>)}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs opacity-60">
        {ru
          ? "Это план, а не обещание сроков или дохода. Токены и NFT могут потерять стоимость. Ставки связаны с риском проигрыша: играйте только на те деньги, которые не жалко потерять."
          : "This is a plan, not a promise of dates or income. Tokens and NFTs can lose value. Stakes carry the risk of losing: play only with money you can afford to lose."}
      </p>
    </details>
  );
}

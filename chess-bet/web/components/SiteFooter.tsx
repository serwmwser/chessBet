"use client";
import { BET_MAX, DEFAULT_FEE_BPS, ESCROW_ADDRESS, shortAddr } from "@/lib/config";
import { NFT_ADDRESS } from "@/lib/nft";
import { useApp } from "@/lib/ctx";
import { TG_BOT_URL } from "@/lib/telegram";
import ProductHuntCard from "./ProductHuntCard";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const scan = (a: string) => `https://polygonscan.com/address/${a}`;

export default function SiteFooter() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const win = 100 - DEFAULT_FEE_BPS / 100;
  const facts: [string, string][] = [
    [`${win}%`, ru ? "банка получает победитель" : "of the pot goes to the winner"],
    [`0.5–${BET_MAX / 1e6}`, ru ? "USDC: диапазон ставок" : "USDC stake range"],
    ["Polygon", ru ? "сеть и низкие комиссии" : "network, low fees"],
    ["18+", ru ? "только для взрослых" : "adults only"],
  ];
  const links: [string, string, boolean][] = [
    [ru ? "Шахматы онлайн бесплатно" : "Play chess online free", `${BASE}/chess/`, false],
    [ru ? "Крипто шахматы на USDC" : "Crypto chess for USDC", `${BASE}/crypto/`, false],
    [ru ? "Присоединиться" : "Join HiMeet", `${BASE}/join/`, false],
    [ru ? "Вопросы и ответы" : "FAQ", `${BASE}/faq/`, false],
    [ru ? "О нас" : "About us", `${BASE}/about/`, false],
    [ru ? "Знакомства" : "Dating", `${BASE}/dating/`, false],
    [ru ? "Шахматные задачи" : "Chess puzzles", `${BASE}/puzzles/`, false],
    [ru ? "Мультяшные шахматы" : "Cartoon chess", `${BASE}/cartoon/`, false],
    [ru ? "Языковой обмен" : "Language exchange", `${BASE}/language-exchange/`, false],
    [ru ? "Найти друзей" : "Find friends", `${BASE}/find-friends/`, false],
    [ru ? "Скачать для Android (APK)" : "Download for Android (APK)", `${BASE}/android/`, false],
    [ru ? "Доска объявлений" : "Classifieds", `${BASE}/ads/`, false],
    [ru ? "Лента Rook Club" : "Rook Club feed", `${BASE}/feed/`, false],
    [ru ? "Условия использования" : "Terms of use", `${BASE}/terms/`, false],
    [ru ? "Возраст 18+ и ответственная игра" : "Age 18+ and responsible play", `${BASE}/age/`, false],
    [ru ? "Дорожная карта" : "Roadmap", `${BASE}/roadmap/`, false],
    [ru ? "Токен TCH" : "TCH token", `${BASE}/token/`, false],
    [ru ? "Белые книги" : "Whitepapers", `${BASE}/whitepaper/`, false],
    [ru ? "Прозрачность контракта" : "Contract transparency", `${BASE}/transparency/`, false],
    [ru ? "HiMeet в Telegram" : "HiMeet on Telegram", TG_BOT_URL, true],
  ];

  return (
    <footer className="space-y-4">
      <section className="card lobby-info space-y-3" aria-label={ru ? "Почему нам можно доверять" : "Why trust HiMeet"}>
        <h2 className="font-extrabold" style={{ color: "#d4a017" }}>🛡 {ru ? "Прозрачные правила" : "Transparent rules"}</h2>
        <div className="grid grid-cols-2 gap-2 text-center">
          {facts.map(([n, t]) => (
            <div key={t} className="rounded-2xl bg-black/5 dark:bg-white/5 py-2 px-1">
              <div className="mono text-lg font-bold" style={{ color: "#d4a017" }}>{n}</div>
              <div className="text-xs opacity-70">{t}</div>
            </div>
          ))}
        </div>
        <ul className="list-disc ps-5 space-y-1 text-sm opacity-85">
          <li>{ru ? "Ставки хранит смарт-контракт, а не мы. Выигрыш вы забираете сами кнопкой «Забрать»." : "Stakes are held by a smart contract, not by us. You claim winnings yourself with one button."}</li>
          <li>{ru ? "Ничья, отмена или зависшая игра: ставка возвращается полностью, без комиссии." : "Draw, cancel or a stuck game: the stake is refunded in full, no fee."}</li>
          <li>{ru ? "Результат зависит от вашего мастерства, но выигрыш не гарантирован." : "Your result depends on your skill, but winning is not guaranteed."}</li>
        </ul>
        <div className="text-xs space-y-1">
          {ESCROW_ADDRESS && <div>{ru ? "Контракт ставок: " : "Stakes contract: "}<a className="underline mono" dir="ltr" href={scan(ESCROW_ADDRESS)} target="_blank" rel="noopener noreferrer">{shortAddr(ESCROW_ADDRESS)}</a> Polygonscan</div>}
          {NFT_ADDRESS && <div>{ru ? "Контракт NFT: " : "NFT contract: "}<a className="underline mono" dir="ltr" href={scan(NFT_ADDRESS)} target="_blank" rel="noopener noreferrer">{shortAddr(NFT_ADDRESS)}</a> Polygonscan</div>}
        </div>
      </section>

      {/* КНОПКА SOLIDITY (отображается на каждой странице) */}
      <div className="flex justify-center my-2">
        <a 
          href={`${BASE}/dev.html`} 
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all rounded-xl shadow-lg hover:shadow-xl hover:scale-105"
          style={{ background: "linear-gradient(135deg, #8b5cff, #6d3df0)" }}
        >
          {ru ? "🛠 Разработка Solidity" : "🛠 Solidity Dev Services"}
        </a>
      </div>

      <nav className="card text-sm" aria-label={ru ? "Ссылки" : "Links"}>
        <ul className="grid gap-1.5">
          {links.map(([t, h, ext]) => (
            <li key={h}><a className="underline opacity-85" href={h} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{t}</a></li>
          ))}
        </ul>
      </nav>
      <ProductHuntCard />
      <p className="text-xs opacity-60 text-center pb-2">© {new Date().getFullYear()} HiMeet · {ru ? "Все права защищены." : "All rights reserved."} · 18+ · {ru ? "Играйте ответственно." : "Play responsibly."}</p>
    </footer>
  );
}

"use client";
import { BET_MAX, DEFAULT_FEE_BPS, ESCROW_ADDRESS, shortAddr } from "@/lib/config";
import { NFT_ADDRESS } from "@/lib/nft";
import { useApp } from "@/lib/ctx";
import { TG_BOT_URL } from "@/lib/telegram";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const scan = (a: string) => `https://polygonscan.com/address/${a}`;

/** Подвал главной: блок доверия с настоящими фактами и ссылки на все страницы */
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
    [ru ? "Условия использования" : "Terms of use", `${BASE}/terms/`, false],
    [ru ? "Возраст 18+ и ответственная игра" : "Age 18+ and responsible play", `${BASE}/age/`, false],
    [ru ? "Дорожная карта" : "Roadmap", `${BASE}/roadmap/`, false],
    [ru ? "Chess Bet в Telegram" : "Chess Bet on Telegram", TG_BOT_URL, true],
    [ru ? "Скачать для Android (APK)" : "Download for Android (APK)", `${BASE}/Chess_Bet.apk`, false],
  ];
  return (
    <footer className="space-y-3">
      <section className="card lobby-info space-y-3" aria-label={ru ? "Почему нам можно доверять" : "Why trust Chess Bet"}>
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
      <nav className="card text-sm" aria-label={ru ? "Ссылки" : "Links"}>
        <ul className="grid gap-1.5">
          {links.map(([t, h, ext]) => (
            <li key={h}><a className="underline opacity-85" href={h} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{t}</a></li>
          ))}
        </ul>
      </nav>
      <p className="text-xs opacity-60 text-center pb-2">© {new Date().getFullYear()} Chess Bet · 18+ · {ru ? "Играйте ответственно." : "Play responsibly."}</p>
    </footer>
  );
}

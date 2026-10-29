"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchRef, RefStats } from "@/lib/api";
import { useEscrow } from "@/lib/tx";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { useApp } from "@/lib/ctx";
import { chain, client } from "@/lib/config";
import { REF_ENABLED, TIERS, perGame, refLink, tierOf } from "@/lib/ref";
import Share from "@/components/Share";
import { wallets } from "@/components/Header";

type D = {
  badge: string; h1: string; lead: string; soon: string;
  linkT: string; linkSub: string; connect: string; copy: string; copied: string; micro: string;
  statT: string; st: string[]; none: string;
  howT: string; howP: string; ex: string[]; howN: string;
  ladT: string; cols: string[]; names: string[]; x2: string;
  calcT: string; bet: string; fr: string; gm: string; lvl: string; day: string; mon: string; pf: string; calcN: string;
  msgT: string; m1: string; m2: string; cpm: string;
  faqT: string; faq: [string, string][];
  feedT: string; feedE: string;
  cta: string; ctaSub: string; disc: string[]; pay: string;
};

const RU: D = {
  badge: "ВЕЧНЫЙ ГАМБИТ", h1: "Играют они — зарабатываешь ТЫ",
  lead: "Поделись ссылкой и получай USDC в сети Polygon с каждой платной партии приглашённого друга. Пожизненно.",
  soon: "Программа запускается: ссылка уже сохраняется, выплаты включатся после запуска контракта.",
  linkT: "Твоя Вечная Ссылка", linkSub: "Доход привязан к твоему кошельку. Войди, чтобы активировать ссылку.",
  connect: "Войти и получить ссылку", copy: "Скопировать ссылку", copied: "Скопировано ✓", micro: "Все выплаты идут на подключённый кошелёк.",
  statT: "Твоя империя", st: ["Приглашено друзей", "Сыграно ими партий", "Выплачено, USDC"], none: "Пока нет данных — поделись ссылкой.",
  howT: "Откуда берутся USDC", howP: "Победитель забирает 90% банка, 10% — комиссия приложения. Часть комиссии получаешь ты.",
  ex: ["Партия 10$ (по 5$ с игрока)", "Банк: 10.00$", "Победитель: 9.40$ (90%)", "Комиссия: 0.60$ (10%)"],
  howN: "Твоя доля считается от комиссии с партии твоего друга (его половина комиссии) и зависит от твоего уровня.",
  ladT: "Лестница дохода", cols: ["Уровень", "Друзей", "% от комиссии", "С 1 игры друга (ставка 5$)"], names: ["СТАРТ", "ЛИДЕР", "ЛЕГЕНДА"],
  x2: "×2 БОНУС: пригласил ОБОИХ игроков партии — получаешь вдвое больше.",
  calcT: "Калькулятор (пример)", bet: "Ставка игрока, $", fr: "Друзей", gm: "Игр в день у друга", lvl: "Твой уровень", day: "в день", mon: "в месяц", pf: "с одного друга в день",
  calcN: "Иллюстрация по формуле, а не обещание дохода: реальный доход зависит от активности друзей.",
  msgT: "Готовые сообщения", m1: "♟ Играю в шахматы на USDC: победитель забирает 90% банка! Можно тренироваться с ботом бесплатно. Заходи по моей ссылке 👉", m2: "🔥 Приглашай игроков и получай долю с комиссии их партий пожизненно. Бери мою ссылку 👉", cpm: "Копировать сообщение",
  faqT: "Вопросы", faq: [
    ["Когда приходят деньги?", "Доля начисляется автоматически после окончания партии друга в сети Polygon."],
    ["Какой кошелёк нужен?", "Любой с USDC в сети Polygon: MetaMask, Trust Wallet, Rabby."],
    ["Когда засчитается друг?", "После его первой платной партии."],
    ["Уровень растёт сам?", "Да: 21 друг — ЛИДЕР, 101 — ЛЕГЕНДА."],
  ],
  feedT: "Лента начислений", feedE: "Здесь появятся реальные начисления по твоим друзьям.",
  cta: "Скопировать ссылку", ctaSub: "Хватит просто играть — пора зарабатывать.",
  disc: [
    "Доход не гарантирован: он зависит от того, сколько ваших друзей играют на деньги и как часто.",
    "Друг засчитывается после его первой платной партии. Бесплатные партии с другом, игры с ботом и создание NFT выплат не дают.",
    "Доля выплачивается из комиссии приложения в USDC (сеть Polygon) на ваш кошелёк при завершении партии друга. Если перевод не прошёл, сумма ждёт на этой странице кнопки «Забрать»; для неё нужен небольшой запас POL на комиссию сети.",
    "Ставки связаны с риском проигрыша. Приглашайте только совершеннолетних и тех, кому игра на деньги разрешена законом. Спам и обман запрещены.",
    "Условия программы, уровни и проценты могут меняться, о важных изменениях сообщим в приложении. Программа может быть недоступна в некоторых странах. Налоги со своего дохода вы платите сами.",
  ], pay: "Забрать",
};
const EN: D = {
  badge: "ETERNAL GAMBIT", h1: "They play — YOU earn",
  lead: "Share your link and earn USDC on Polygon from every paid game of your invited friends. For life.",
  soon: "The program is launching: your link is already tracked, payouts start once the contract goes live.",
  linkT: "Your Eternal Link", linkSub: "Earnings are tied to your wallet. Sign in to activate the link.",
  connect: "Sign in to get your link", copy: "Copy link", copied: "Copied ✓", micro: "All payouts go to your connected wallet.",
  statT: "Your empire", st: ["Friends invited", "Games they played", "Paid out, USDC"], none: "No data yet — share your link.",
  howT: "Where the USDC comes from", howP: "The winner takes 90% of the pot, 10% is the app fee. You receive part of that fee.",
  ex: ["Game of $10 ($5 each)", "Pot: $10.00", "Winner: $9.40 (90%)", "Fee: $0.60 (10%)"],
  howN: "Your share is taken from the fee of your friend’s game (his half of the fee) and depends on your level.",
  ladT: "Income ladder", cols: ["Level", "Friends", "% of fee", "Per friend game ($5 bet)"], names: ["START", "LEADER", "LEGEND"],
  x2: "×2 BONUS: invited BOTH players of a game — you get double.",
  calcT: "Calculator (example)", bet: "Player bet, $", fr: "Friends", gm: "Games a day per friend", lvl: "Your level", day: "per day", mon: "per month", pf: "per friend per day",
  calcN: "Illustration by formula, not an income promise: real earnings depend on your friends’ activity.",
  msgT: "Ready-made messages", m1: "♟ I play chess for USDC: the winner takes 90% of the pot! You can practice with the bot for free. Join via my link 👉", m2: "🔥 Invite players and earn a share of the fee from their games for life. Take my link 👉", cpm: "Copy message",
  faqT: "FAQ", faq: [
    ["When do I get paid?", "Your share is credited automatically after your friend’s game ends, on Polygon."],
    ["Which wallet?", "Any wallet with USDC on Polygon: MetaMask, Trust Wallet, Rabby."],
    ["When does a friend count?", "After their first paid game."],
    ["Does my level grow by itself?", "Yes: 21 friends — LEADER, 101 — LEGEND."],
  ],
  feedT: "Earnings feed", feedE: "Real earnings from your friends will appear here.",
  cta: "Copy link", ctaSub: "Stop just playing — start earning.",
  disc: [
    "Income is not guaranteed: it depends on how many of your friends play for money and how often.",
    "A friend counts after their first paid game. Free games with a friend, bot games and creating NFTs do not earn payouts.",
    "Your share is paid from the app's fee in USDC (Polygon network) to your wallet when your friend's game ends. If a transfer fails, the amount waits on this page for the Claim button; you need a small reserve of POL for the network fee.",
    "Stakes carry the risk of losing. Invite only adults and people for whom playing for money is legal. Spam and deception are forbidden.",
    "Program terms, levels and percentages may change, and we will announce important changes in the app. The program may be unavailable in some countries. You pay taxes on your own income.",
  ], pay: "Claim",
};
const tierIdx = (pct: number) => (pct >= 30 ? 2 : pct >= 20 ? 1 : 0);
const L: Record<string, D> = { ru: RU, en: EN };

function Num({ l, v, set }: { l: string; v: number; set: (n: number) => void }) {
  return (
    <label className="block text-xs opacity-70">{l}
      <input type="number" min={0} value={v} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-base" />
    </label>
  );
}

export default function Earn() {
  const { lang, dark } = useApp();
  const x = L[lang] ?? EN;
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const [bet, setBet] = useState(5);
  const [fr, setFr] = useState(50);
  const [gm, setGm] = useState(10);
  const [done, setDone] = useState("");
  const [rs, setRs] = useState<RefStats | null>(null);
  const esc = useEscrow();
  const addr = account?.address;
  const load = useCallback(() => { if (addr && REF_ENABLED) fetchRef(addr).then(setRs).catch(() => {}); }, [addr]);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);
  const usd = (v: string) => (Number(v) / 1e6).toFixed(2);
  const owed = Number(rs?.owed ?? 0);

  const link = account ? refLink(account.address) : "";
  const login = () => { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "Chess Bet" }); };
  const copy = async (s: string, k: string) => {
    try { await navigator.clipboard.writeText(s); setDone(k); setTimeout(() => setDone(""), 1800); }
    catch { window.prompt("", s); }
  };
  const tier = tierOf(fr);
  const ti = TIERS.indexOf(tier as (typeof TIERS)[number]);
  const day = fr * gm * perGame(bet, tier.pct);
  const gold = "text-amber-300";

  return (
    <div className="space-y-4">
      <div className="card text-center space-y-2">
        <div className={`text-xs tracking-widest font-bold ${gold}`}>{x.badge}</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{x.h1}</h1>
        <p className="opacity-80 text-sm">{x.lead}</p>
        {!REF_ENABLED && <p className="text-xs rounded-xl bg-amber-400/10 border border-amber-300/30 px-3 py-2">{x.soon}</p>}
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">{x.linkT}</h2>
        {account ? (
          <>
            <div className="break-all rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm">{link}</div>
            <button className="btn btn-primary w-full" onClick={() => copy(link, "a")}>{done === "a" ? x.copied : x.copy}</button>
            <Share url={link} text={x.m1} />
            <p className="text-xs opacity-60">{x.micro}</p>
          </>
        ) : (
          <>
            <p className="text-sm opacity-80">{x.linkSub}</p>
            <button className="btn btn-primary w-full" onClick={login}>{x.connect}</button>
          </>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">{x.statT}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {x.st.map((s) => (
            <div key={s} className="rounded-xl bg-white/5 p-3"><div className={`text-xl font-extrabold ${gold}`}>{rs ? [rs.friends, rs.games, usd(rs.earned)][x.st.indexOf(s)] : "—"}</div><div className="text-[11px] opacity-70">{s}</div></div>
          ))}
        </div>
        {rs ? <p className="text-xs opacity-70">{x.lvl}: {x.names[tierIdx(rs.pct)]} {rs.pct}%</p> : <p className="text-xs opacity-60">{x.none}</p>}
        {owed > 0 && <button className="btn btn-primary w-full" onClick={() => esc.claimRef().then(load).catch(() => {})}>{x.pay} {usd(rs!.owed)} USDC</button>}
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">{x.howT}</h2>
        <p className="text-sm opacity-80">{x.howP}</p>
        <ul className="text-sm space-y-1">{x.ex.map((e) => <li key={e}>• {e}</li>)}</ul>
        <p className="text-xs opacity-60">{x.howN}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">🪜 {x.ladT}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left opacity-60 text-xs">{x.cols.map((c) => <th key={c} className="pe-2 py-1">{c}</th>)}</tr></thead>
            <tbody>
              {TIERS.map((t, i) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="py-2 pe-2 font-semibold">{i + 1}. {x.names[i]}</td>
                  <td className="pe-2">{t.from}{i === 2 ? "+" : `–${TIERS[i + 1].from - 1}`}</td>
                  <td className="pe-2">{t.pct}%</td>
                  <td className={gold}>{perGame(5, t.pct).toFixed(2)} USDC</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">🔥 {x.x2}</p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">💰 {x.calcT}</h2>
        <div className="grid grid-cols-3 gap-2"><Num l={x.bet} v={bet} set={setBet} /><Num l={x.fr} v={fr} set={setFr} /><Num l={x.gm} v={gm} set={setGm} /></div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {TIERS.map((t, i) => (
            <div key={t.id} className={`rounded-xl p-2 border ${i === ti ? "border-amber-300 bg-amber-300/10" : "border-white/10"}`}>
              <div className="opacity-70">{x.names[i]}</div><b className="text-base">{t.pct}%</b><div>{perGame(bet, t.pct).toFixed(2)}$</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-brand-500/30 to-brand-violet/30 p-4 text-center">
          <div className="text-xs opacity-70">{x.lvl}: {x.names[ti]} {tier.pct}%</div>
          <div className={`text-2xl font-extrabold ${gold}`}>{day.toFixed(2)}$ {x.day}</div>
          <div className="font-bold">{(day * 30).toFixed(2)}$ {x.mon}</div>
          <div className="text-xs opacity-70 mt-1">{(gm * perGame(bet, tier.pct)).toFixed(2)}$ {x.pf}</div>
        </div>
        <p className="text-xs opacity-60">{x.calcN}</p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">{x.msgT}</h2>
        {[x.m1, x.m2].map((m, i) => {
          const s = `${m} ${link || "…"}`;
          return (
            <div key={i} className="rounded-xl border border-dashed border-white/20 p-3 space-y-2">
              <p className="text-sm opacity-90">{s}</p>
              <button className="chip chip-on" onClick={() => (link ? copy(s, "m" + i) : login())}>{done === "m" + i ? x.copied : x.cpm}</button>
            </div>
          );
        })}
      </div>

      <div className="card space-y-1">
        <h2 className="font-bold">{x.feedT}</h2>
        <p className="text-sm opacity-70">{x.feedE}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">{x.faqT}</h2>
        {x.faq.map(([q, a]) => (
          <details key={q} className="rounded-xl bg-white/5 px-3 py-2"><summary className="cursor-pointer text-sm font-semibold">{q}</summary><p className="text-sm opacity-80 mt-1">{a}</p></details>
        ))}
      </div>

      <div className="card text-center space-y-2">
        <p className="font-bold">{x.ctaSub}</p>
        <button className="btn btn-primary w-full" onClick={() => (link ? copy(link, "z") : login())}>{done === "z" ? x.copied : account ? x.cta : x.connect}</button>
        <ul className="text-[11px] opacity-60 space-y-1 list-disc ps-4">{x.disc.map((d) => <li key={d}>{d}</li>)}</ul>
      </div>
    </div>
  );
}

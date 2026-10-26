"use client";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { REF_ENABLED, refLink } from "@/lib/ref";
import { wallets } from "./Header";
import Share from "./Share";

/** Блок на главной: объясняет реферальную программу «Вечный гамбит» и даёт ссылку для приглашений */
export default function RefBanner({ onEarn }: { onEarn: () => void }) {
  const { lang, dark } = useApp();
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const ru = lang === "ru";
  if (!REF_ENABLED) return null;
  const login = () => { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "Chess Bet" }); };
  const steps = ru
    ? ["Поделитесь своей ссылкой с другом", "Друг входит по ней и играет на USDC", "Вы получаете долю комиссии с каждой его платной партии. Пожизненно"]
    : ["Share your link with a friend", "Your friend joins through it and plays for USDC", "You get a share of the fee from each of their paid games. For life"];
  return (
    <section className="card space-y-3" style={{ border: "1px solid #d4a017" }}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold">🤝 {ru ? "Приглашай друзей и получай USDC" : "Invite friends and earn USDC"}</h2>
        <button type="button" className="chip shrink-0" onClick={onEarn}>{ru ? "Подробнее" : "Details"}</button>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 items-start text-sm">
            <span className="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-violet text-white text-xs font-bold">{i + 1}</span>
            <span className="opacity-90">{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs opacity-75">
        {ru
          ? "Ваша доля: 10% комиссии с партии друга, с 21 друга 20%, со 101 друга 30%. Друг засчитывается после его первой платной партии. Выплаты приходят на ваш кошелёк."
          : "Your share: 10% of the fee of a friend's game, 20% from 21 friends, 30% from 101 friends. A friend counts after their first paid game. Payouts go to your wallet."}
      </p>
      {account ? (
        <Share url={refLink(account.address)} text={ru ? "Играй со мной в шахматы на USDC:" : "Play chess for USDC with me:"} />
      ) : (
        <button type="button" className="btn btn-primary w-full" onClick={login}>{ru ? "Войти и получить ссылку" : "Sign in to get your link"}</button>
      )}
      <p className="text-[11px] opacity-55">
        {ru ? "Доход не гарантирован и зависит от того, сколько друзей играют на деньги. Ставки связаны с риском проигрыша." : "Income is not guaranteed and depends on how many friends play for money. Stakes carry the risk of losing."}
      </p>
    </section>
  );
}

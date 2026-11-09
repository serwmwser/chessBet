"use client";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { LANGS, Lang } from "@/lib/i18n";
import MusicToggle from "./MusicToggle";
import { inTelegram } from "@/lib/telegram";

const allWallets = [
  inAppWallet({ auth: { options: ["email", "google", "apple", "telegram", "passkey"] } }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("com.trustwallet.app"),
  createWallet("walletConnect"),
];
// Внутри Telegram нет расширений кошельков, а ссылки вида metamask:// окно Telegram не открывает (ошибка ERR_UNKNOWN_URL_SCHEME): там только вход по почте
export const wallets = inTelegram() ? [inAppWallet({ auth: { options: ["email"] } })] : allWallets;

export default function Header() {
  const { lang, setLang, dark, toggleDark } = useApp();
  const ru = lang === "ru";
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto max-w-3xl flex items-center gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight me-auto">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-violet text-white text-xl">👋</span>
          <span className="leading-tight">
            <span className="block">HiMeet</span>
            <span className="hidden sm:block text-[11px] font-medium opacity-70 max-w-[16rem]">{ru ? "Общение, объявления, знакомства и шахматы" : "Chat, Classifieds, Dating & Chess"}</span>
          </span>
        </div>
        <select
          aria-label="Language"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="rounded-xl bg-black/5 dark:bg-white/10 px-2 py-2 text-sm outline-none max-w-[72px] sm:max-w-[110px]"
        >
          {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} className="text-slate-900">{v}</option>)}
        </select>
        <button onClick={toggleDark} aria-label="Theme" className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 text-lg">{dark ? "☀" : "☾"}</button>
        <span className="hidden min-[400px]:block"><MusicToggle /></span>
        <ConnectButton
          client={client}
          chain={chain}
          wallets={wallets}
          autoConnect={{ timeout: 5000 }}
          theme={dark ? "dark" : "light"}
          connectButton={{ style: { borderRadius: 14, height: 40, minWidth: 0, padding: "0 14px", fontSize: 14 } }}
          detailsButton={{ style: { borderRadius: 14, height: 40, minWidth: 0, padding: "0 10px", fontSize: 13 } }}
          connectModal={{ size: "compact", title: "HiMeet" }}
        />
      </div>
    </header>
  );
}

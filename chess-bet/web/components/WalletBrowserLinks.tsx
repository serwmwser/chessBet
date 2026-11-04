"use client";
// Подсказка для телефона: если сайт открыт в обычном браузере, предлагаем открыть его внутри приложения кошелька.
// В браузере кошелька подключение и вход работают без переходов туда-сюда. Адрес страницы (в том числе ?ref=) сохраняется.
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { inTelegram } from "@/lib/telegram";

type Eth = { ethereum?: unknown };

export default function WalletBrowserLinks() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [href, setHref] = useState("");

  useEffect(() => {
    try {
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const inWallet = !!(window as unknown as Eth).ethereum; // внутри браузера кошелька провайдер уже есть
      if (mobile && !inWallet && !inTelegram()) setHref(location.href); // в Telegram эти ссылки не нужны
    } catch { /* без подсказки */ }
  }, []);

  if (!href) return null;
  const enc = encodeURIComponent(href);
  const links: [string, string][] = [
    ["Bitget Wallet", "https://bkcode.vip?action=dapp&url=" + enc],
    ["MetaMask", "https://metamask.app.link/dapp/" + href.replace(/^https?:\/\//, "")],
    ["Trust Wallet", "https://link.trustwallet.com/open_url?coin_id=966&url=" + enc],
    ["Coinbase Wallet", "https://go.cb-w.com/dapp?cb_url=" + enc],
  ];
  return (
    <div className="space-y-2 text-sm">
      <p className="opacity-80"><b>{ru ? "Надёжнее открыть сайт внутри приложения кошелька." : "Safer: open the site inside your wallet app."}</b> {ru ? "На Android ответ кошелька иногда не возвращается в обычный браузер, а внутри кошелька вход проходит без переходов." : "On Android the wallet's reply sometimes does not return to a regular browser; inside the wallet app sign-in works without switching."}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map(([name, url]) => (
          <a key={name} className="btn btn-primary !py-2" href={url}>{ru ? "Открыть в " : "Open in "}{name}</a>
        ))}
      </div>
    </div>
  );
}

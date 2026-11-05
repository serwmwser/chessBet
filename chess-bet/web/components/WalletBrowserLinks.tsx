"use client";
// Запасной путь для телефона: если вход завис, сайт можно открыть внутри приложения кошелька (мелкие ссылки, не кнопки).
// В браузере кошелька подключение и вход проходят без переходов. Адрес страницы (в том числе ?ref=) сохраняется.
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
      if (mobile && !inWallet && !inTelegram()) setHref(location.href);
    } catch { /* без подсказки */ }
  }, []);

  if (!href) return null;
  const enc = encodeURIComponent(href);
  const links: [string, string][] = [
    ["Bitget", "https://bkcode.vip?action=dapp&url=" + (/[&#]/.test(href) ? href.split(/[?#]/)[0] : href)],
    ["MetaMask", "https://metamask.app.link/dapp/" + href.replace(/^https?:\/\//, "")],
    ["Trust Wallet", "https://link.trustwallet.com/open_url?coin_id=966&url=" + enc],
    ["Coinbase Wallet", "https://go.cb-w.com/dapp?cb_url=" + enc],
  ];
  return (
    <p className="text-xs opacity-70">
      {ru ? "Не получается? Откройте сайт внутри приложения кошелька: " : "Not working? Open the site inside your wallet app: "}
      {links.map(([name, url], k) => (
        <span key={name}>{k > 0 && " · "}<a className="underline" href={url}>{name}</a></span>
      ))}
    </p>
  );
}

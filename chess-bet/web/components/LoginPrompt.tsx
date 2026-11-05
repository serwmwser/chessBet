"use client";
import { useEffect, useState } from "react";
import { useActiveWallet, useConnectModal } from "thirdweb/react";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { AUTO_OFF, errText, useSocial } from "@/lib/social";
import { wallets } from "./Header";
import { useAuthLog } from "@/lib/authlog";
import { needsTap } from "@/lib/signmode";
import WalletBrowserLinks from "./WalletBrowserLinks";

/** Единый блок входа вместо отдельных кнопок «Войти».
 *  Кошелёк не подключён — одна кнопка «Подключить кошелёк»; после подключения вход (бесплатная подпись) идёт автоматически.
 *  Кнопка «Подписать вход» появляется, только если подпись отклонили или она не пришла за 8 секунд. Когда вход выполнен, блок скрыт. */
export default function LoginPrompt({ text }: { text?: string }) {
  const { lang, dark, toast } = useApp();
  const { addr, token, busy, signIn } = useSocial();
  const { connect } = useConnectModal();
  const ru = lang === "ru";
  const [retry, setRetry] = useState(false);
  const log = useAuthLog();
  const wallet = useActiveWallet();
  const tap = needsTap(wallet?.id);

  useEffect(() => {
    if (!addr || token) { setRetry(false); return; }
    const check = () => { try { if (sessionStorage.getItem(AUTO_OFF)) setRetry(true); } catch { /* без хранилища */ } };
    check();
    const t = setTimeout(() => setRetry(true), 8000);
    const i = setInterval(check, 1000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [addr, token]);

  if (token) return null;

  if (!addr) {
    return (
      <section className="card space-y-3 text-center">
        <p className="text-sm">{text || (ru ? "Чтобы продолжить, подключите кошелёк. Вход произойдёт автоматически: подпись бесплатна, деньги не списываются." : "Connect your wallet to continue. Sign-in is automatic: the signature is free and no money is spent.")}</p>
        <button type="button" className="btn btn-primary" onClick={() => { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "Chess Bet" }); }}>
          {ru ? "Подключить кошелёк" : "Connect wallet"}
        </button>
        <p className="text-xs opacity-70">{ru ? "При входе кошелёк попросит подтвердить два действия: 1) подключение к сайту, 2) подпись входа. Подпись бесплатна, деньги не списываются." : "When you sign in, your wallet will ask you to confirm two things: 1) connecting to the site, 2) the sign-in signature. The signature is free and no money is spent."}</p>
        <WalletBrowserLinks />
      </section>
    );
  }

  return (
    <section className="card space-y-3 text-center">
      <p className="text-sm">
        {tap
          ? (ru ? "Нажмите кнопку ниже: откроется кошелёк. Подтвердите там бесплатную подпись и вернитесь на сайт." : "Press the button below: your wallet will open. Confirm the free signature there and come back.")
          : retry
          ? (ru ? "Подпись входа не получена. Нажмите кнопку и подтвердите бесплатное сообщение в кошельке." : "Sign-in signature not received. Press the button and confirm the free message in your wallet.")
          : (ru ? "Подтвердите вход в кошельке: бесплатное сообщение, деньги не списываются…" : "Confirm sign-in in your wallet: a free message, no money is spent…")}
      </p>
      {(retry || tap) && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { void signIn().catch((e) => toast(errText(e, ru), "err")); }}>
          {busy ? (ru ? "Ждём подпись в кошельке…" : "Waiting for your signature…") : ru ? "Подписать вход" : "Sign in"}
        </button>
      )}
      {log.length > 0 && <pre className="text-left text-[11px] leading-4 opacity-60 whitespace-pre-wrap">{log.slice(-8).join("\n")}</pre>}
      <WalletBrowserLinks />
    </section>
  );
}

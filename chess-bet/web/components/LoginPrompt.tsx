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

/** Единый блок входа: одна белая кнопка.
 *  Кошелёк не подключён: «Подключить кошелёк». После подключения вход (бесплатная подпись) идёт автоматически;
 *  на телефоне вне браузера кошелька Android открывает кошелёк только по нажатию, поэтому та же кнопка меняется на «Войти».
 *  Когда вход выполнен, блок скрыт. */
export default function LoginPrompt({ text }: { text?: string }) {
  const { lang, dark, toast } = useApp();
  const { addr, token, busy, signIn } = useSocial();
  const { connect } = useConnectModal();
  const wallet = useActiveWallet();
  const log = useAuthLog();
  const ru = lang === "ru";
  const tap = needsTap(wallet?.id);
  const [slow, setSlow] = useState(false); // вход не завершился за 20 с
  const [off, setOff] = useState(false); // подпись отклонена или автоматический вход остановлен

  useEffect(() => {
    if (!addr || token) { setSlow(false); setOff(false); return; }
    try { setOff(!!sessionStorage.getItem(AUTO_OFF)); } catch { /* без хранилища */ }
    const t = setTimeout(() => setSlow(true), 20000);
    return () => clearTimeout(t);
  }, [addr, token]);

  if (token) return null;

  const click = async () => {
    if (!addr) {
      try { await connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "HiMeet" }); } catch { /* окно закрыли */ }
      return;
    }
    try { await signIn(); } catch (e) { toast(errText(e, ru), "err"); }
  };

  const showButton = !addr || tap || slow || off;
  const label = !addr
    ? (ru ? "Подключить кошелёк" : "Connect wallet")
    : busy
      ? (ru ? "Ждём подпись в кошельке…" : "Waiting for your signature…")
      : tap || off || slow
        ? (ru ? "Войти" : "Sign in")
        : "";

  return (
    <section className="card space-y-3 text-center">
      {text && <p className="text-sm">{text}</p>}
      {addr && !showButton && <p className="text-sm opacity-80">{ru ? "Подтвердите вход в кошельке (подпись бесплатна)…" : "Confirm sign-in in your wallet (the signature is free)…"}</p>}
      {addr && showButton && (tap || off) && !busy && (
        <p className="text-sm opacity-80">{ru ? "Нажмите «Войти»: откроется кошелёк. Подтвердите там бесплатную подпись и вернитесь на сайт." : "Press “Sign in”: your wallet will open. Confirm the free signature there and come back."}</p>
      )}
      {showButton && (
        <button type="button" disabled={busy} onClick={() => void click()}
          className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black shadow disabled:opacity-60">
          {label}
        </button>
      )}
      {!addr && <p className="text-xs opacity-70">{ru ? "При входе кошелёк попросит подтвердить два действия: 1) подключение к сайту, 2) подпись входа. Подпись бесплатна, деньги не списываются." : "When you sign in, your wallet will ask you to confirm two things: 1) connecting to the site, 2) the sign-in signature. The signature is free and no money is spent."}</p>}
      {addr && slow && log.length > 0 && <pre className="text-left text-[11px] leading-4 opacity-60 whitespace-pre-wrap">{log.slice(-8).join("\n")}</pre>}
      {slow && <WalletBrowserLinks />}
    </section>
  );
}

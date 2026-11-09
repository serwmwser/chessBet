"use client";
// Кнопка «Позвонить» на странице профиля. Гостям показывает «Войдите, чтобы позвонить» (открывает подключение кошелька). Скрыта в своём профиле.
import { useEffect, useState } from "react";
import { useConnectModal } from "thirdweb/react";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { callOnline, callUser, useCallState } from "@/lib/calls";
import { wallets } from "./Header";

export default function CallButton({ name, className = "" }: { name: string; className?: string }) {
  const { lang, dark, toast } = useApp();
  const { addr, token, me, signIn } = useSocial();
  const { connect } = useConnectModal();
  const ru = lang === "ru";
  const call = useCallState();
  const [st, setSt] = useState<{ online: boolean; busy: boolean } | null>(null);

  const mine = !!me?.name && me.name.toLowerCase() === name.toLowerCase();

  // узнаём, в сети ли человек (обновляем раз в 20 секунд, пока вкладка открыта)
  useEffect(() => {
    if (!token || mine || !name) return;
    let on = true;
    const load = () => { if (!document.hidden) callOnline(token, name).then((r) => { if (on) setSt(r); }); };
    load();
    const t = setInterval(load, 20000);
    return () => { on = false; clearInterval(t); };
  }, [token, name, mine]);

  if (!name || mine) return null;

  // гость: кошелёк не подключён — открываем подключение; подключён, но нет входа — просим подпись
  if (!token) {
    const login = () => {
      if (!addr) { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "HiMeet" }); return; }
      void signIn().catch(() => toast(ru ? "Не удалось войти. Подпишите сообщение в кошельке" : "Could not sign in. Sign the message in your wallet", "err"));
    };
    return (
      <button type="button" className={"btn btn-ghost " + className} onClick={login} title={ru ? "Звонки доступны после входа на сайт" : "Calls are available after signing in"}>
        📞 {ru ? "Войдите, чтобы позвонить" : "Sign in to call"}
      </button>
    );
  }

  const inCall = call.status !== "idle";
  const disabled = inCall || !st || !st.online || st.busy;
  const label = !st ? (ru ? "Позвонить" : "Call")
    : !st.online ? (ru ? "Не в сети" : "Offline")
    : st.busy ? (ru ? "Разговаривает" : "On a call")
    : (ru ? "Позвонить" : "Call");

  return (
    <button
      type="button"
      className={"btn btn-ghost " + className}
      disabled={disabled}
      title={ru ? "Голосовой звонок" : "Voice call"}
      onClick={() => {
        if (call.status === "off") { toast(ru ? "Звонки подключаются, попробуйте через пару секунд" : "Calls are connecting, try again in a moment", "info"); return; }
        void callUser(name);
      }}
    >
      📞 {label}
    </button>
  );
}

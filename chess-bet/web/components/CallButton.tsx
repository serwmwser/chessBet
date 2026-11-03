"use client";
// Кнопка «Позвонить» на странице профиля. Скрыта для гостей и для своего профиля.
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { callOnline, callUser, useCallState } from "@/lib/calls";

export default function CallButton({ name, className = "" }: { name: string; className?: string }) {
  const { lang, toast } = useApp();
  const { token, me } = useSocial();
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

  if (!token || mine || !name) return null;

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

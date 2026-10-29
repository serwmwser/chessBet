"use client";
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { API_URL } from "@/lib/config";
import { useApp } from "@/lib/ctx";

type Status = { enabled: boolean; linked: boolean };

/** Карточка «Уведомления в Telegram»: игрок подписывает сообщение кошельком (бесплатно), открывает бота и получает «ваш ход» */
export default function TgNotify() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const account = useActiveAccount();
  const me = account?.address;
  const [st, setSt] = useState<Status | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!me) { setSt(null); return; }
    try { const r = await fetch(`${API_URL}/tg/status?addr=${me}`, { cache: "no-store" }); setSt(await r.json()); } catch { setSt(null); }
  }, [me]);
  useEffect(() => { refresh(); }, [refresh]);
  // после открытия бота ждём, пока привязка появится
  useEffect(() => {
    if (!link) return;
    const i = setInterval(refresh, 3000);
    return () => clearInterval(i);
  }, [link, refresh]);
  useEffect(() => { if (st?.linked) setLink(""); }, [st?.linked]);

  const act = async (action: "link" | "unlink") => {
    if (!account || !me) return;
    setBusy(true);
    try {
      const c = await (await fetch(`${API_URL}/tg/challenge?addr=${me}&action=${action}`, { cache: "no-store" })).json();
      if (!c.ok) throw new Error(c.error || "error");
      const sig = await account.signMessage({ message: c.message });
      const r = await (await fetch(`${API_URL}/tg/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addr: me, action, nonce: c.nonce, sig }) })).json();
      if (!r.ok) throw new Error(r.error || "error");
      if (action === "link") setLink(r.url as string);
      else { toast(ru ? "Уведомления отключены" : "Notifications are off", "ok"); await refresh(); }
    } catch (e) { toast(((e as Error).message || "error").slice(0, 120), "err"); }
    finally { setBusy(false); }
  };

  if (!me || !st || !st.enabled) return null;
  return (
    <section className="card space-y-2" style={{ border: "1px solid #2aabee" }}>
      <h2 className="text-lg font-bold">✈️ {ru ? "Уведомления в Telegram" : "Telegram notifications"}</h2>
      <p className="text-sm opacity-80">
        {ru ? "Бот напишет, когда соперник сделал ход, а вас нет в партии, и когда кто-то принял вашу игру. Подпись кошельком бесплатна и не тратит деньги." : "The bot messages you when your opponent has moved and you are not in the game, and when someone joins your game. Signing with your wallet is free and spends no money."}
      </p>
      {st.linked ? (
        <>
          <div className="text-sm font-semibold text-emerald-500">✅ {ru ? "Уведомления включены" : "Notifications are on"}</div>
          <button type="button" className="btn btn-ghost !py-2" disabled={busy} onClick={() => act("unlink")}>{ru ? "Отключить" : "Turn off"}</button>
        </>
      ) : link ? (
        <>
          <a href={link} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-3 rounded-xl font-extrabold text-white text-base" style={{ background: "#2aabee", boxShadow: "0 4px 0 rgba(0,0,0,.25)" }}>✈️ {ru ? "Открыть бота и нажать «Запустить»" : "Open the bot and press Start"}</a>
          <p className="text-xs opacity-70">{ru ? "Ссылка действует 10 минут. Когда привязка сработает, здесь появится «Уведомления включены»." : "The link works for 10 minutes. When it is linked, this card will say Notifications are on."}</p>
        </>
      ) : (
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={() => act("link")}>{busy ? "…" : ru ? "Включить уведомления" : "Turn on notifications"}</button>
      )}
    </section>
  );
}

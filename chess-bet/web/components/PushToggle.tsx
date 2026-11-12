"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";
import { useSocial } from "@/lib/social";

/** HiMeet push: кнопка «Уведомления о звонках и сообщениях» в своём профиле */
export default function PushToggle() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const { token } = useSocial();
  const [st, setSt] = useState<PushState | "">("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void pushState().then(setSt); }, []);
  if (!token || st === "") return null;

  const toggle = async () => {
    setBusy(true);
    try { setSt(st === "on" ? await disablePush(token) : await enablePush(token)); }
    catch { toast(ru ? "Не удалось включить уведомления. Попробуйте позже." : "Could not turn on notifications. Try again later.", "err"); }
    finally { setBusy(false); }
  };

  return (
    <section className="card space-y-2">
      <h3 className="font-bold">🔔 {ru ? "Уведомления о звонках и сообщениях" : "Call and message notifications"}</h3>
      {st === "unsupported" && <p className="text-sm opacity-80">{ru ? "Этот браузер не поддерживает уведомления. На iPhone сначала добавьте сайт «На экран Домой» и откройте его оттуда." : "This browser does not support notifications. On iPhone, first add the site to your Home Screen and open it from there."}</p>}
      {st === "denied" && <p className="text-sm opacity-80">{ru ? "Уведомления запрещены в настройках браузера. Разрешите их для этого сайта и вернитесь сюда." : "Notifications are blocked in your browser settings. Allow them for this site and come back."}</p>}
      {(st === "off" || st === "on") && (
        <>
          <p className="text-sm opacity-80">{st === "on" ? (ru ? "Включено: вы услышите звонок и увидите сообщение, даже если сайт закрыт." : "On: you will get calls and messages even when the site is closed.") : (ru ? "Включите, чтобы не пропускать звонки и сообщения, когда сайт закрыт." : "Turn on to never miss calls and messages when the site is closed.")}</p>
          <button type="button" className={st === "on" ? "btn btn-ghost" : "btn btn-primary"} disabled={busy} onClick={toggle}>
            {st === "on" ? (ru ? "Выключить уведомления" : "Turn off notifications") : (ru ? "Включить уведомления" : "Turn on notifications")}
          </button>
        </>
      )}
    </section>
  );
}

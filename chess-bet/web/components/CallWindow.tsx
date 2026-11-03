"use client";
// Глобальное окно звонков: включает приём звонков для вошедшего пользователя и показывает входящий/текущий звонок.
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { acceptCall, callError, clearCallError, declineCall, fmtSecs, hangup, startCalls, stopCalls, toggleMute, useCallState } from "@/lib/calls";
import Avatar from "./Avatar";

export default function CallWindow() {
  const { lang, toast } = useApp();
  const { token } = useSocial();
  const ru = lang === "ru";
  const c = useCallState();
  const [secs, setSecs] = useState(0);
  const base = useRef({ at: 0, secs: 0 });
  const lastEnded = useRef(0);

  // приём звонков включён, пока пользователь вошёл на сайт
  useEffect(() => {
    startCalls(token || "");
    return () => { if (!token) stopCalls(); };
  }, [token]);

  // таймер: считаем сами каждую секунду, сверяемся с сервером
  useEffect(() => {
    base.current = { at: Date.now(), secs: c.secs };
    setSecs(c.secs);
  }, [c.secs]);
  useEffect(() => {
    if (c.status !== "active") return;
    const t = setInterval(() => setSecs(base.current.secs + Math.floor((Date.now() - base.current.at) / 1000)), 1000);
    return () => clearInterval(t);
  }, [c.status]);

  // ошибки
  useEffect(() => {
    if (!c.error) return;
    toast(callError(c.error, ru), c.error === "other_tab" ? "info" : "err");
    clearCallError();
  }, [c.error, ru, toast]);

  // итог звонка
  useEffect(() => {
    if (!c.ended || c.ended.at === lastEnded.current) return;
    lastEnded.current = c.ended.at;
    if (c.ended.reason === "hangup" && c.ended.secs > 0) toast((ru ? "Звонок завершён · " : "Call ended · ") + fmtSecs(c.ended.secs), "info");
    else toast(callError(c.ended.reason, ru), "info");
  }, [c.ended, ru, toast]);

  if (!token || !c.peer || (c.status !== "incoming" && c.status !== "calling" && c.status !== "connecting" && c.status !== "active")) return null;

  const label =
    c.status === "incoming" ? (ru ? "Входящий звонок" : "Incoming call") :
    c.status === "calling" ? (ru ? "Вызываем…" : "Calling…") :
    c.status === "connecting" ? (ru ? "Соединяем…" : "Connecting…") :
    fmtSecs(secs);

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 pointer-events-none" role="dialog" aria-live="assertive" aria-label={label}>
      <div className="card pointer-events-auto w-full max-w-sm !p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className={c.status === "incoming" ? "animate-pulse" : ""}><Avatar name={c.peer.name} src={c.peer.avatar} size={56} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">@{c.peer.name}</div>
            <div className={"text-sm " + (c.status === "active" ? "tabular-nums text-emerald-600 font-semibold" : "opacity-70")}>{label}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {c.status === "incoming" ? (
            <>
              <button type="button" className="btn btn-primary flex-1" onClick={() => void acceptCall()}>📞 {ru ? "Принять" : "Accept"}</button>
              <button type="button" className="btn btn-danger flex-1" onClick={declineCall}>{ru ? "Отклонить" : "Decline"}</button>
            </>
          ) : (
            <>
              {c.status === "active" && (
                <button type="button" className={"btn flex-1 " + (c.muted ? "btn-primary" : "btn-ghost")} onClick={toggleMute}>
                  {c.muted ? "🔇 " + (ru ? "Включить микрофон" : "Unmute") : "🎙 " + (ru ? "Микрофон" : "Mute")}
                </button>
              )}
              <button type="button" className="btn btn-danger flex-1" onClick={hangup}>
                {c.status === "calling" ? (ru ? "Отмена" : "Cancel") : (ru ? "Завершить" : "Hang up")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

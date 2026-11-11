"use client";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useApp } from "@/lib/ctx";
import { refLink } from "@/lib/ref";
import { ROUTES } from "@/lib/urls";
import { getToken } from "@/lib/session";
import { SESSION_EVENT } from "@/lib/social";
import Share from "./Share";

/** HiMeet welcome: после первого входа один раз просим пригласить друга (ссылка с вашим кодом). */
export default function WelcomeInvite() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const account = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(false);
  const addr = account ? account.address.toLowerCase() : "";

  useEffect(() => {
    if (!addr) { setOpen(false); return; }
    const key = "hm_welcome_" + addr;
    const check = () => {
      try { if (localStorage.getItem(key)) return; } catch { /* без хранилища */ }
      if (getToken(addr)) setOpen(true);
    };
    check();
    window.addEventListener(SESSION_EVENT, check);
    return () => window.removeEventListener(SESSION_EVENT, check);
  }, [addr]);

  const close = () => {
    try { localStorage.setItem("hm_welcome_" + addr, "1"); } catch { /* без хранилища */ }
    setOpen(false);
    try { if (!localStorage.getItem("hm_next_" + addr)) setNext(true); } catch { setNext(true); }
  };
  const closeNext = () => {
    try { localStorage.setItem("hm_next_" + addr, "1"); } catch { /* без хранилища */ }
    setNext(false);
  };
  if (next && !open && account) {
    const todo: [string, string, string][] = ru
      ? [["🗣", "Выберите языки", `${ROUTES.profile}?edit=1`], ["🌍", "Найдите собеседника", `${ROUTES.profile}?tab=people`], ["💬", "Напишите первое сообщение", `${ROUTES.profile}?tab=chat`]]
      : [["🗣", "Choose your languages", `${ROUTES.profile}?edit=1`], ["🌍", "Find someone to talk to", `${ROUTES.profile}?tab=people`], ["💬", "Send your first message", `${ROUTES.profile}?tab=chat`]];
    return (
      <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(60,20,80,.45)" }} role="dialog" aria-modal="true" aria-label="HiMeet">
        <div className="card w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <div className="text-4xl" aria-hidden="true">🚀</div>
            <h2 className="text-xl font-extrabold">{ru ? "Что дальше?" : "What next?"}</h2>
            <p className="text-sm opacity-80">{ru ? "Три шага, и вы уже общаетесь с людьми по всему миру." : "Three steps and you are chatting with people around the world."}</p>
          </div>
          <ol className="space-y-2">
            {todo.map(([icon, label, href], i) => (
              <li key={href}>
                <a href={href} onClick={closeNext} className="flex items-center gap-3 rounded-2xl border px-3 py-3 font-bold transition hover:opacity-90">
                  <span className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-violet text-white text-sm">{i + 1}</span>
                  <span aria-hidden="true" className="text-xl">{icon}</span>
                  <span className="flex-1">{label}</span>
                  <span aria-hidden="true" className="opacity-50">›</span>
                </a>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-ghost w-full" onClick={closeNext}>{ru ? "Позже" : "Later"}</button>
        </div>
      </div>
    );
  }
  if (!open || !account) return null;

  const text = ru
    ? "Привет! Я в HiMeet: бесплатный чат и звонки с автопереводом. Заходи по моей ссылке:"
    : "Hi! I'm on HiMeet: free chat and calls with automatic translation. Join me here:";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(60,20,80,.45)" }} role="dialog" aria-modal="true" aria-label="HiMeet">
      <div className="card w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <div className="text-4xl" aria-hidden="true">👋</div>
          <h2 className="text-xl font-extrabold">{ru ? "Добро пожаловать в HiMeet!" : "Welcome to HiMeet!"}</h2>
          <p className="text-sm opacity-80">
            {ru ? "Общаться веселее с друзьями. Добавьте друга: чат сам переведёт ваши сообщения на язык собеседника." : "Chatting is more fun with friends. Add a friend: the chat translates your messages into their language."}
          </p>
        </div>
        <ol className="space-y-1.5 text-sm">
          {(ru
            ? ["Отправьте другу свою ссылку", "Друг входит по ней, без кошелька, по почте или Google", "Пишите и звоните бесплатно"]
            : ["Send your link to a friend", "Your friend joins with email or Google, no wallet needed", "Chat and call for free"]
          ).map((s, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-violet text-white text-xs font-bold">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <Share url={refLink(account.address)} text={text} />
        <button type="button" className="btn btn-ghost w-full" onClick={close}>{ru ? "Позже" : "Later"}</button>
      </div>
    </div>
  );
}

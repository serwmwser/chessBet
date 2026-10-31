"use client";
import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import DmThread from "./DmThread";
import { useApp } from "@/lib/ctx";
import { dmList, type DmChat } from "@/lib/dm";
import { errText } from "@/lib/social";
import { parseVoice } from "@/lib/voice";
import { takeShareDraft } from "@/lib/shareNets";

const NICK = /^[a-z0-9_]{3,20}$/i;

/** Раздел «Чат» в профиле. peer = ник хозяина чужого профиля (сразу открывается переписка с ним).
 *  Без peer (свой профиль) показывает список переписок и поле «ник → Написать». initial = ник, который открыть сразу. */
export default function ChatPanel({ token, addr, busy, signIn, peer, initial }: {
  token: string; addr?: string; busy?: boolean; signIn: () => Promise<unknown>; peer?: string; initial?: string;
}) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [open, setOpen] = useState((initial || "").replace(/^@/, "").toLowerCase());
  const [chats, setChats] = useState<DmChat[] | null>(null);
  const [nick, setNick] = useState("");
  const [draft, setDraft] = useState(() => takeShareDraft()); // ссылка, которой делятся через «В Rook Club»
  const listMode = !peer;

  const refresh = useCallback(() => {
    if (!token || !listMode) return;
    dmList(token).then(setChats).catch(() => setChats((a) => a || []));
  }, [token, listMode]);
  useEffect(() => { setChats(null); refresh(); }, [refresh]);
  useEffect(() => {
    if (!listMode || open || !token) return;
    const i = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15_000);
    return () => clearInterval(i);
  }, [listMode, open, token, refresh]);

  const start = () => {
    const v = nick.trim().replace(/^@/, "");
    if (!NICK.test(v)) { toast(ru ? "Введите ник: 3–20 символов, латиница, цифры или _" : "Enter a nickname: 3–20 letters, digits or _", "err"); return; }
    setOpen(v.toLowerCase()); setNick("");
  };

  if (!token) {
    return (
      <section className="card space-y-3 text-center">
        <p>{ru ? "Чтобы писать сообщения, подключите кошелёк и войдите (подпись бесплатна)." : "To send messages, connect your wallet and sign in (the signature is free)."}</p>
        <button type="button" className="btn btn-primary" disabled={busy || !addr} onClick={() => signIn().catch((e) => toast(errText(e, ru), "err"))}>
          {addr ? (ru ? "Войти" : "Sign in") : ru ? "Сначала подключите кошелёк" : "Connect your wallet first"}
        </button>
      </section>
    );
  }

  if (peer) return <DmThread name={peer} token={token} draft={draft} />;
  if (open) return <DmThread name={open} token={token} draft={draft} onBack={() => { setOpen(""); setDraft(""); refresh(); }} onChanged={refresh} />;

  return (
    <div className="space-y-3">
      {draft && (
        <section className="card text-sm space-y-1" style={{ borderColor: "#f5b301" }}>
          <b>{ru ? "Кому отправить ссылку?" : "Who should get the link?"}</b>
          <p className="opacity-70 break-all">{draft}</p>
          <p className="opacity-70">{ru ? "Выберите переписку ниже или введите ник. Текст появится в поле сообщения, останется нажать «Отправить»." : "Pick a conversation below or enter a nickname. The text will appear in the message box, then press Send."}</p>
          <button type="button" className="underline opacity-70" onClick={() => setDraft("")}>{ru ? "Отмена" : "Cancel"}</button>
        </section>
      )}
      <section className="card flex gap-2">
        <input value={nick} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") start(); }}
          placeholder={ru ? "Ник игрока, например @magnus" : "Player nickname, e.g. @magnus"} aria-label={ru ? "Ник игрока" : "Player nickname"}
          maxLength={21} className="flex-1 rounded-xl border px-3 py-2 bg-transparent outline-none text-sm" />
        <button type="button" className="btn btn-primary !py-2" onClick={start}>{ru ? "Написать" : "Message"}</button>
      </section>
      <div className="space-y-2">
        {chats === null && <p className="text-center opacity-60">…</p>}
        {chats && chats.length === 0 && (
          <p className="card text-center opacity-70">
            {ru ? "Переписок пока нет. Откройте профиль игрока и зайдите во вкладку «Чат» или введите ник выше." : "No conversations yet. Open a player's profile and use the Chat tab, or enter a nickname above."}
          </p>
        )}
        {chats?.map((c) => (
          <button type="button" key={c.name} onClick={() => setOpen(c.name)} className="card w-full text-start flex items-center gap-3 !py-3 hover:opacity-90">
            <Avatar name={c.name} src={c.avatar} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b className="truncate">@{c.name}</b>
                <span className="ms-auto text-[11px] opacity-60 shrink-0">{new Date(c.last.created).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" })}</span>
              </div>
              <p className={`truncate text-sm ${c.unread ? "font-semibold" : "opacity-70"}`}>{c.last.mine ? (ru ? "Вы: " : "You: ") : ""}{parseVoice(c.last.text) ? (ru ? "🎤 Голосовое сообщение" : "🎤 Voice message") : c.last.text}</p>
            </div>
            {c.unread > 0 && (
              <span className="shrink-0 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: "#f5b301", color: "#2b1a00" }}>{c.unread > 99 ? "99+" : c.unread}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

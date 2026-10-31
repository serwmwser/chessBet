"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar from "@/components/Avatar";
import DmThread from "@/components/DmThread";
import { useApp } from "@/lib/ctx";
import { BASE } from "@/lib/urls";
import { dmList, type DmChat } from "@/lib/dm";
import { parseVoice } from "@/lib/voice";
import { errText, useSocial } from "@/lib/social";

const HERE = `${BASE}/messages/`;
const withUrl = (name: string) => `${HERE}?with=${encodeURIComponent(name)}`;
const NICK = /^[a-z0-9_]{3,20}$/i;

function Inbox() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const router = useRouter();
  const sp = useSearchParams();
  const s = useSocial();
  const peer = (sp.get("with") || "").replace(/^@/, "").trim();
  const [chats, setChats] = useState<DmChat[] | null>(null);
  const [nick, setNick] = useState("");

  const refresh = useCallback(() => {
    if (!s.token) return;
    dmList(s.token).then(setChats).catch(() => setChats((a) => a || []));
  }, [s.token]);
  useEffect(() => { setChats(null); refresh(); }, [refresh]);
  useEffect(() => {
    if (peer || !s.token) return;
    const i = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15_000);
    return () => clearInterval(i);
  }, [peer, s.token, refresh]);

  const start = () => {
    const v = nick.trim().replace(/^@/, "");
    if (!NICK.test(v)) { toast(ru ? "Введите ник: 3–20 символов, латиница, цифры или _" : "Enter a nickname: 3–20 letters, digits or _", "err"); return; }
    router.push(withUrl(v.toLowerCase()));
  };

  return (
    <PageShell
      title={ru ? "Сообщения" : "Messages"}
      intro={ru ? "Личные переписки участников Rook Club." : "Private conversations between Rook Club members."}
    >
      {!s.token ? (
        <section className="card space-y-3 text-center">
          <p>{ru ? "Чтобы писать сообщения, подключите кошелёк и войдите (подпись бесплатна)." : "To send messages, connect your wallet and sign in (the signature is free)."}</p>
          <button type="button" className="btn btn-primary" disabled={s.busy || !s.addr} onClick={() => s.signIn().catch((e) => toast(errText(e, ru), "err"))}>
            {s.addr ? (ru ? "Войти" : "Sign in") : ru ? "Сначала подключите кошелёк" : "Connect your wallet first"}
          </button>
        </section>
      ) : peer ? (
        <DmThread name={peer} token={s.token} onBack={() => router.push(HERE)} onChanged={refresh} />
      ) : (
        <>
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
                {ru ? "Переписок пока нет. Откройте профиль игрока и нажмите «Написать» или введите ник выше." : "No conversations yet. Open a player's profile and press Message, or enter a nickname above."}
              </p>
            )}
            {chats?.map((c) => (
              <Link key={c.name} href={withUrl(c.name)} className="card flex items-center gap-3 !py-3 hover:opacity-90">
                <Avatar name={c.name} src={c.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b className="truncate">@{c.name}</b>
                    <span className="ms-auto text-[11px] opacity-60 shrink-0">
                      {new Date(c.last.created).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className={`truncate text-sm ${c.unread ? "font-semibold" : "opacity-70"}`}>{c.last.mine ? (ru ? "Вы: " : "You: ") : ""}{parseVoice(c.last.text) ? (ru ? "🎤 Голосовое сообщение" : "🎤 Voice message") : c.last.text}</p>
                </div>
                {c.unread > 0 && (
                  <span className="shrink-0 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: "#f5b301", color: "#2b1a00" }}>
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Inbox />
    </Suspense>
  );
}

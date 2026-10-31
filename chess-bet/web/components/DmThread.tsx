"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { profileUrl } from "@/lib/urls";
import { dmBlock, dmDelete, dmErr, dmReport, dmSend, dmThread, type DmMsg, type DmThread as Thread } from "@/lib/dm";
import Avatar from "./Avatar";
import VoiceBubble from "./VoiceBubble";
import VoiceRecorder from "./VoiceRecorder";
import { parseVoice } from "@/lib/voice";

const MAX = 1000;
const merge = (a: DmMsg[], b: DmMsg[]) => {
  const seen = new Set(a.map((m) => m.id));
  return [...a, ...b.filter((m) => !seen.has(m.id))].sort((x, y) => x.id - y.id);
};

/** Окно переписки с одним игроком: сообщения обновляются каждые 5 секунд, пока вкладка открыта */
export default function DmThread({ name, token, onBack, onChanged, draft }: { name: string; token: string; onBack?: () => void; onChanged?: () => void; draft?: string }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [info, setInfo] = useState<Pick<Thread, "peer" | "blockedByMe" | "canSend"> | null>(null);
  const [msgs, setMsgs] = useState<DmMsg[]>([]);
  const [more, setMore] = useState(false);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState((draft || "").slice(0, MAX));
  const [busy, setBusy] = useState(false);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // прокручивать вниз, только если читатель уже внизу

  const apply = useCallback((t: Thread, replace: boolean) => {
    setInfo({ peer: t.peer, blockedByMe: t.blockedByMe, canSend: t.canSend });
    setMsgs((a) => { const m = replace ? t.messages : merge(a, t.messages); last.current = m.length ? m[m.length - 1].id : 0; return m; });
  }, []);

  useEffect(() => {
    setInfo(null); setMsgs([]); setMissing(false); last.current = 0; stick.current = true;
    if (!token) return;
    let alive = true;
    dmThread(token, name).then((t) => { if (alive) { apply(t, true); setMore(t.more); onChanged?.(); } }).catch(() => { if (alive) setMissing(true); });
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      dmThread(token, name, { after: last.current }).then((t) => { if (alive) { apply(t, false); if (t.messages.length) onChanged?.(); } }).catch(() => {});
    };
    const i = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(i); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, token]);

  useEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  const older = async () => {
    if (!msgs.length) return;
    try {
      const t = await dmThread(token, name, { before: msgs[0].id });
      stick.current = false;
      setMsgs((a) => merge(t.messages, a)); setMore(t.more);
    } catch (e) { toast(dmErr(e, ru), "err"); }
  };
  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const m = await dmSend(token, name, v);
      stick.current = true;
      setMsgs((a) => { const x = merge(a, [m]); last.current = x[x.length - 1].id; return x; });
      setText(""); onChanged?.();
    } catch (e) { toast(dmErr(e, ru), "err"); }
    finally { setBusy(false); }
  };
  const sendVoice = async (v: string) => {
    try {
      const m = await dmSend(token, name, v);
      stick.current = true;
      setMsgs((a) => { const x = merge(a, [m]); last.current = x[x.length - 1].id; return x; });
      onChanged?.();
    } catch (e) { toast(dmErr(e, ru), "err"); }
  };
  const del = async (id: number) => {
    if (!window.confirm(ru ? "Удалить сообщение у обоих?" : "Delete this message for both?")) return;
    try { await dmDelete(token, id); setMsgs((a) => a.filter((m) => m.id !== id)); } catch (e) { toast(dmErr(e, ru), "err"); }
  };
  const report = async (id: number) => {
    if (!window.confirm(ru ? "Пожаловаться на это сообщение?" : "Report this message?")) return;
    try { await dmReport(token, id); toast(ru ? "Жалоба отправлена" : "Report sent", "ok"); } catch (e) { toast(dmErr(e, ru), "err"); }
  };
  const block = async () => {
    if (!info) return;
    const on = !info.blockedByMe;
    if (on && !window.confirm(ru ? "Заблокировать игрока? Вы не сможете писать друг другу." : "Block this player? You will not be able to message each other.")) return;
    try { const b = await dmBlock(token, name, on); setInfo({ ...info, blockedByMe: b, canSend: !b && info.canSend }); } catch (e) { toast(dmErr(e, ru), "err"); }
  };

  if (!token) return <section className="card text-center opacity-80">{ru ? "Войдите, чтобы писать сообщения." : "Sign in to send messages."}</section>;
  if (missing) return <section className="card text-center">{ru ? "Такого игрока нет." : "This player does not exist."}</section>;
  if (!info) return <section className="card text-center opacity-70">…</section>;

  const time = (t: number) => new Date(t).toLocaleTimeString(ru ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" });
  return (
    <section className="card !p-0 overflow-hidden flex flex-col" style={{ minHeight: "60vh" }}>
      <header className="flex items-center gap-3 px-3 py-2 border-b border-black/10 dark:border-white/10">
        {onBack && <button type="button" onClick={onBack} aria-label={ru ? "Назад" : "Back"} className="text-xl px-1">←</button>}
        <Link href={profileUrl(info.peer.name)} className="flex items-center gap-2 min-w-0 me-auto">
          <Avatar name={info.peer.name} src={info.peer.avatar} size={36} />
          <b className="truncate">@{info.peer.name}</b>
        </Link>
        <button type="button" onClick={block} className="text-xs opacity-70 hover:opacity-100">{info.blockedByMe ? (ru ? "Разблокировать" : "Unblock") : ru ? "Заблокировать" : "Block"}</button>
      </header>

      <p className="text-[11px] px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300">
        {ru ? "Никому не сообщайте секретную фразу кошелька и не переходите по подозрительным ссылкам. Сообщения хранятся на сервере и не шифруются." : "Never share your wallet's secret phrase and do not open suspicious links. Messages are stored on the server and are not encrypted."}
      </p>

      <div ref={box} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: "55vh" }}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
        {more && <button type="button" className="btn btn-ghost w-full !py-1.5 text-xs" onClick={older}>{ru ? "Показать ранее" : "Show earlier"}</button>}
        {msgs.length === 0 && <p className="text-center text-sm opacity-60 py-6">{ru ? "Сообщений пока нет. Напишите первым!" : "No messages yet. Say hello!"}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap"
              style={m.mine ? { background: "linear-gradient(90deg,#fde68a,#f5b301)", color: "#2b1a00" } : { background: "rgba(127,127,127,.16)" }}>
              {(() => { const v = parseVoice(m.text); return v ? <VoiceBubble path={v.path} sec={v.sec} /> : m.text; })()}
              <div className="mt-1 flex items-center gap-2 text-[10px] opacity-60">
                <span>{time(m.created)}{m.mine && m.read ? " ✓✓" : ""}</span>
                {m.mine ? <button type="button" onClick={() => del(m.id)} className="underline">{ru ? "удалить" : "delete"}</button>
                  : <button type="button" onClick={() => report(m.id)} className="underline">{ru ? "пожаловаться" : "report"}</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {info.canSend ? (
        <div className="flex items-end gap-2 p-2 border-t border-black/10 dark:border-white/10">
          <textarea value={text} rows={2} maxLength={MAX} onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={ru ? "Сообщение…" : "Message…"} aria-label={ru ? "Текст сообщения" : "Message text"}
            className="flex-1 rounded-xl border px-3 py-2 bg-transparent outline-none resize-none text-sm" />
          <VoiceRecorder token={token} onVoice={sendVoice} />
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] opacity-50">{MAX - text.length}</span>
            <button type="button" className="btn btn-primary !py-2" disabled={busy || !text.trim()} onClick={send}>{busy ? "…" : ru ? "Отправить" : "Send"}</button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm opacity-70 p-3 border-t border-black/10 dark:border-white/10">
          {info.blockedByMe ? (ru ? "Вы заблокировали этого игрока. Разблокируйте, чтобы написать." : "You blocked this player. Unblock to write.") : ru ? "Этот игрок не принимает ваши сообщения." : "This player does not accept your messages."}
        </p>
      )}
    </section>
  );
}

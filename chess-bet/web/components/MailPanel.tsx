"use client";
import { useCallback, useEffect, useState } from "react";
import LoginPrompt from "./LoginPrompt";
import Avatar from "./Avatar";
import AttachButton from "./AttachButton";
import FileBubble from "./FileBubble";
import { parseFile, splitFiles, stripFiles } from "@/lib/attach";
import { useApp } from "@/lib/ctx";
import { mailAddr, mailErr, mailGet, mailList, mailPurge, mailSend, mailStar, mailTrash, type MailBox, type MailItem } from "@/lib/mail";

type View = "list" | "read" | "compose";

/** Раздел «Почта» в профиле: HiMeet Mail. Письма ходят только между пользователями сайта.
 *  myName = ник владельца профиля (для показа адреса ник@himeet), initialTo = кому сразу написать. */
export default function MailPanel({ token, myName, initialTo }: { token: string; myName?: string; initialTo?: string }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [view, setView] = useState<View>(initialTo ? "compose" : "list");
  const [box, setBox] = useState<MailBox>("in");
  const [items, setItems] = useState<MailItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [cur, setCur] = useState<MailItem | null>(null);
  const [to, setTo] = useState((initialTo || "").replace(/^@/, ""));
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [atts, setAtts] = useState<string[]>([]); // вложения нового письма

  const load = useCallback(() => {
    if (!token) return;
    setItems(null);
    mailList(token, box).then((r) => { setItems(r.items); setMore(r.more); }).catch((e) => { setItems([]); toast(mailErr(e, ru), "err"); });
  }, [token, box, ru, toast]);
  useEffect(() => { if (view === "list") load(); }, [view, load]);

  if (!token) {
    return <LoginPrompt text={ru ? "Чтобы пользоваться почтой, подключите кошелёк (подпись бесплатна)." : "To use mail, connect your wallet (the signature is free)."} />;
  }

  const boxes: { id: MailBox; ru: string; en: string }[] = [
    { id: "in", ru: "Входящие", en: "Inbox" }, { id: "out", ru: "Отправленные", en: "Sent" },
    { id: "star", ru: "★ Избранное", en: "★ Starred" }, { id: "trash", ru: "Корзина", en: "Trash" },
  ];
  const fmt = (t: number) => {
    const d = new Date(t);
    const today = new Date().toDateString() === d.toDateString();
    return today ? d.toLocaleTimeString(ru ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
  };

  const open = async (m: MailItem) => {
    try { setCur(await mailGet(token, m.id)); setView("read"); }
    catch (e) { toast(mailErr(e, ru), "err"); }
  };
  const act = async (fn: () => Promise<unknown>, back = true) => {
    try { await fn(); if (back) { setView("list"); setCur(null); } }
    catch (e) { toast(mailErr(e, ru), "err"); }
  };
  const compose = (toName = "", subj = "") => { setTo(toName); setSubject(subj); setBody(""); setAtts([]); setView("compose"); };
  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await mailSend(token, to, subject, [body.trim(), ...atts].filter(Boolean).join("\n"));
      toast(ru ? "Письмо отправлено" : "Message sent", "ok");
      setBody(""); setSubject(""); setTo(""); setAtts([]); setBox("out"); setView("list");
    } catch (e) { toast(mailErr(e, ru), "err"); }
    finally { setBusy(false); }
  };

  // ---------- письмо
  if (view === "read" && cur) {
    const other = cur.mine ? cur.to : cur.from;
    const re = /^re:/i.test(cur.subject) ? cur.subject : `Re: ${cur.subject}`;
    return (
      <div className="space-y-3">
        <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={() => { setView("list"); setCur(null); }}>← {ru ? "Назад" : "Back"}</button>
        <article className="card space-y-3">
          <h2 className="text-lg font-bold break-words">{cur.subject || (ru ? "(без темы)" : "(no subject)")}</h2>
          <div className="flex items-center gap-3 text-sm">
            <Avatar name={other.name} src={other.avatar} size={36} />
            <div className="min-w-0">
              <div className="truncate"><b>{cur.mine ? (ru ? "Кому: " : "To: ") : (ru ? "От: " : "From: ")}</b>{mailAddr(other.name)}</div>
              <div className="text-xs opacity-60">{new Date(cur.created).toLocaleString(ru ? "ru-RU" : "en-US")}</div>
            </div>
          </div>
          {(() => { const sp = splitFiles(cur.body || ""); return (
            <>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{sp.text}</div>
              {sp.files.length > 0 && <div className="flex flex-wrap gap-3 pt-1">{sp.files.map((f, i) => <div key={f.path + i} className="rounded-xl border p-2 text-sm"><FileBubble f={f} ru={ru} /></div>)}</div>}
            </>
          ); })()}
        </article>
        <div className="flex flex-wrap gap-2">
          {!cur.mine && <button type="button" className="btn btn-primary !py-2" onClick={() => compose(other.name, re)}>{ru ? "Ответить" : "Reply"}</button>}
          <button type="button" className="btn btn-ghost !py-2" onClick={() => act(async () => { await mailStar(token, cur.id, !cur.star); setCur({ ...cur, star: !cur.star }); }, false)}>{cur.star ? "★" : "☆"} {ru ? "Избранное" : "Star"}</button>
          {cur.trash ? (
            <>
              <button type="button" className="btn btn-ghost !py-2" onClick={() => act(() => mailTrash(token, cur.id, false))}>{ru ? "Восстановить" : "Restore"}</button>
              <button type="button" className="btn btn-ghost !py-2" onClick={() => { if (confirm(ru ? "Удалить письмо навсегда?" : "Delete this message forever?")) void act(() => mailPurge(token, cur.id)); }}>{ru ? "Удалить навсегда" : "Delete forever"}</button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost !py-2" onClick={() => act(() => mailTrash(token, cur.id, true))}>🗑 {ru ? "В корзину" : "Trash"}</button>
          )}
        </div>
      </div>
    );
  }

  // ---------- новое письмо
  if (view === "compose") {
    return (
      <div className="space-y-3">
        <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={() => setView("list")}>← {ru ? "Назад" : "Back"}</button>
        <section className="card space-y-2">
          <h2 className="font-bold">{ru ? "Новое письмо" : "New message"}</h2>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={ru ? "Кому: ник или ник@himeet" : "To: name or name@himeet"} aria-label={ru ? "Кому" : "To"} maxLength={40} className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none text-sm" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={ru ? "Тема" : "Subject"} aria-label={ru ? "Тема" : "Subject"} maxLength={120} className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={ru ? "Текст письма" : "Message"} aria-label={ru ? "Текст письма" : "Message"} maxLength={9500} rows={9} className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none text-sm" />
          {atts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {atts.map((m, i) => { const f = parseFile(m); return f ? (
                <span key={m + i} className="chip flex items-center gap-1.5">{f.image ? "🖼" : "📄"} {f.image ? (ru ? "Фото" : "Photo") : "PDF"} · {f.kb} {ru ? "КБ" : "KB"}
                  <button type="button" aria-label={ru ? "Убрать вложение" : "Remove attachment"} onClick={() => setAtts((a) => a.filter((_, j) => j !== i))}>✕</button>
                </span>
              ) : null; })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-primary !py-2" disabled={busy || !to.trim() || (!body.trim() && !atts.length)} onClick={send}>{busy ? "…" : ru ? "Отправить" : "Send"}</button>
            <AttachButton token={token} disabled={atts.length >= 3} onFile={(m) => setAtts((a) => [...a, m].slice(0, 3))} />
            <span className="text-xs opacity-60 ms-auto">{body.length}/9500</span>
          </div>
          <p className="text-xs opacity-60">{ru ? "Письма доставляются только пользователям HiMeet. В обычную почту они не уходят." : "Messages are delivered only to HiMeet users. They are not sent to regular email."}</p>
        </section>
      </div>
    );
  }

  // ---------- список
  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 text-sm">
          <div className="opacity-70">{ru ? "Ваш адрес HiMeet Mail" : "Your HiMeet Mail address"}</div>
          <b className="break-all">{myName ? mailAddr(myName) : "—"}</b>
        </div>
        {myName && <button type="button" className="btn btn-ghost !py-2 !px-3 text-sm" onClick={() => { void navigator.clipboard?.writeText(mailAddr(myName)).then(() => toast(ru ? "Адрес скопирован" : "Address copied", "ok")).catch(() => {}); }}>{ru ? "Копировать" : "Copy"}</button>}
        <button type="button" className="btn btn-primary !py-2" onClick={() => compose()}>✉️ {ru ? "Написать" : "Write"}</button>
      </section>
      <div className="flex flex-wrap gap-2">
        {boxes.map((b) => (
          <button key={b.id} type="button" className={"chip " + (box === b.id ? "chip-on" : "")} onClick={() => setBox(b.id)}>{ru ? b.ru : b.en}</button>
        ))}
      </div>
      <div className="space-y-2">
        {items === null && <p className="text-center opacity-60">…</p>}
        {items && items.length === 0 && <p className="card text-center opacity-70">{ru ? "Здесь пока пусто." : "Nothing here yet."}</p>}
        {items?.map((m) => {
          const other = m.mine ? m.to : m.from;
          const unread = !m.mine && !m.read;
          return (
            <button type="button" key={m.id} onClick={() => open(m)} className="card w-full text-start flex items-center gap-3 !py-3 hover:opacity-90">
              <Avatar name={other.name} src={other.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={"truncate " + (unread ? "font-bold" : "")}>{m.mine ? (ru ? "Кому: " : "To: ") : ""}@{other.name}</span>
                  {m.star && <span style={{ color: "#f5b301" }}>★</span>}
                  <span className="ms-auto text-[11px] opacity-60 shrink-0">{fmt(m.created)}</span>
                </div>
                <p className={"truncate text-sm " + (unread ? "font-semibold" : "")}>{m.subject || (ru ? "(без темы)" : "(no subject)")}</p>
                <p className="truncate text-xs opacity-60">{stripFiles(m.preview || "")}</p>
              </div>
              {unread && <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: "#f5b301" }} />}
            </button>
          );
        })}
        {more && items && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => { const last = items[items.length - 1]; mailList(token, box, last.id).then((r) => { setItems([...items, ...r.items]); setMore(r.more); }).catch((e) => toast(mailErr(e, ru), "err")); }}>{ru ? "Показать ещё" : "Show more"}</button>
        )}
      </div>
    </div>
  );
}

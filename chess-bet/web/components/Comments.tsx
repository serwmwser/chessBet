"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { profileUrl } from "@/lib/urls";
import { addComment, commentErr, deleteComment, getComments, reportComment, type SComment } from "@/lib/comments";
import Avatar from "./Avatar";

const MAX = 300;
const ago = (t: number, ru: boolean) => {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return ru ? `${s} с` : `${s}s`;
  if (s < 3600) return ru ? `${Math.floor(s / 60)} мин` : `${Math.floor(s / 60)}m`;
  if (s < 86400) return ru ? `${Math.floor(s / 3600)} ч` : `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return ru ? `${Math.floor(s / 86400)} д` : `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
};

/** Комментарии под постом: читают все, пишут вошедшие. onCount сообщает новое число комментариев */
export default function Comments({ postId, token, signIn, onCount }: { postId: number; token: string; signIn: () => Promise<string>; onCount?: (n: number) => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [list, setList] = useState<SComment[]>([]);
  const [more, setMore] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const setN = useCallback((n: number) => { setCount(n); onCount?.(n); }, [onCount]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setList([]);
    getComments(postId, token).then((p) => { if (alive) { setList(p.comments); setMore(p.more); setN(p.count); } })
      .catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, token]);

  const loadMore = async () => {
    if (!list.length) return;
    setLoading(true);
    try {
      const p = await getComments(postId, token, list[list.length - 1].id);
      setList((a) => [...a, ...p.comments.filter((c) => !a.some((x) => x.id === c.id))]);
      setMore(p.more); setN(p.count);
    } catch (e) { toast(commentErr(e, ru), "err"); }
    finally { setLoading(false); }
  };

  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const t = token || (await signIn());
      const r = await addComment(t, postId, v);
      setList((a) => (a.some((x) => x.id === r.comment.id) ? a : [...a, r.comment]));
      setN(r.count); setText("");
    } catch (e) { toast(commentErr(e, ru), "err"); }
    finally { setBusy(false); }
  };
  const del = async (id: number) => {
    if (!window.confirm(ru ? "Удалить комментарий?" : "Delete this comment?")) return;
    try { const r = await deleteComment(token, id); setList((a) => a.filter((c) => c.id !== id)); setN(r.count); }
    catch (e) { toast(commentErr(e, ru), "err"); }
  };
  const report = async (id: number) => {
    if (!window.confirm(ru ? "Пожаловаться на комментарий?" : "Report this comment?")) return;
    try { await reportComment(token, id); toast(ru ? "Жалоба отправлена" : "Report sent", "ok"); }
    catch (e) { toast(commentErr(e, ru), "err"); }
  };

  return (
    <section className="card space-y-3" aria-label={ru ? "Комментарии" : "Comments"}>
      <h2 className="font-bold">💬 {ru ? "Комментарии" : "Comments"}{count > 0 ? ` (${count})` : ""}</h2>

      <div className="flex items-end gap-2">
        <textarea value={text} rows={2} maxLength={MAX} onChange={(e) => setText(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={token ? (ru ? "Напишите комментарий…" : "Write a comment…") : ru ? "Войдите, чтобы комментировать" : "Sign in to comment"}
          aria-label={ru ? "Текст комментария" : "Comment text"}
          className="flex-1 rounded-xl border px-3 py-2 bg-transparent outline-none resize-none text-sm" />
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] opacity-50">{MAX - text.length}</span>
          <button type="button" className="btn btn-primary !py-2" disabled={busy || !text.trim()} onClick={send}>
            {busy ? "…" : token ? (ru ? "Отправить" : "Send") : ru ? "Войти и отправить" : "Sign in & send"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Link href={profileUrl(c.user.name)} aria-label={`@${c.user.name}`}><Avatar name={c.user.name} src={c.user.avatar} size={32} /></Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Link href={profileUrl(c.user.name)} className="font-semibold truncate">@{c.user.name}</Link>
                <span className="text-xs opacity-60">{ago(c.created, ru)}</span>
                <span className="ms-auto flex gap-3 text-xs opacity-60">
                  {c.canDelete && <button type="button" onClick={() => del(c.id)} className="hover:opacity-100 underline">{ru ? "удалить" : "delete"}</button>}
                  {!c.mine && token && <button type="button" onClick={() => report(c.id)} className="hover:opacity-100 underline">{ru ? "пожаловаться" : "report"}</button>}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          </div>
        ))}
        {loading && <p className="text-center opacity-60">…</p>}
        {!loading && list.length === 0 && <p className="text-center text-sm opacity-60">{ru ? "Пока нет комментариев. Напишите первым!" : "No comments yet. Be the first!"}</p>}
        {more && !loading && <button type="button" className="btn btn-ghost w-full !py-1.5 text-sm" onClick={loadMore}>{ru ? "Показать ещё" : "Load more"}</button>}
      </div>
    </section>
  );
}

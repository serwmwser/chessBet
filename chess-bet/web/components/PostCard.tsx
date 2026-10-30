"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { absoluteUrl, postUrl, profileUrl } from "@/lib/urls";
import { editPost, errText, like, removePost, type SPost } from "@/lib/social";
import Avatar, { mediaUrl } from "./Avatar";

const ago = (t: number, ru: boolean) => {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return ru ? `${s} с` : `${s}s`;
  if (s < 3600) return ru ? `${Math.floor(s / 60)} мин` : `${Math.floor(s / 60)}m`;
  if (s < 86400) return ru ? `${Math.floor(s / 3600)} ч` : `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return ru ? `${Math.floor(s / 86400)} д` : `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
};

/** Карточка поста: автор, текст, фото, время, лайк, «Поделиться», «Изменить» и «Удалить» (у своих постов) */
export default function PostCard({ post, token, myName, onGone }: { post: SPost; token: string; myName?: string; onGone?: (id: number) => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [liked, setLiked] = useState(post.liked);
  const [n, setN] = useState(post.likes);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(post.text);
  const [edited, setEdited] = useState(post.edited > 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const mine = !!myName && myName.toLowerCase() === post.user.name.toLowerCase();
  const link = absoluteUrl(postUrl(post.id));
  const shareText = (text ? text.slice(0, 100) + (text.length > 100 ? "…" : "") + " — " : "") + "Rook Club";

  const toggleLike = async () => {
    if (!token) { toast(errText(new Error("auth"), ru), "err"); return; }
    if (busy) return;
    setBusy(true);
    const on = !liked;
    setLiked(on); setN((x) => x + (on ? 1 : -1)); // сразу показываем результат
    try { const r = await like(token, post.id, on); setLiked(r.liked); setN(r.likes); }
    catch (e) { setLiked(!on); setN((x) => x + (on ? -1 : 1)); toast(errText(e, ru), "err"); }
    finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(ru ? "Удалить этот пост?" : "Delete this post?")) return;
    try { await removePost(token, post.id); onGone?.(post.id); } catch (e) { toast(errText(e, ru), "err"); }
  };
  const startEdit = () => { setDraft(text); setEditing(true); };
  const saveEdit = async () => {
    setBusy(true);
    try {
      const p = await editPost(token, post.id, draft.trim());
      setText(p.text); setEdited(p.edited > 0); setEditing(false);
      toast(ru ? "Пост сохранён" : "Post saved", "ok");
    } catch (e) { toast(errText(e, ru), "err"); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast(ru ? "Ссылка скопирована" : "Link copied", "ok"); }
    catch { window.prompt(ru ? "Скопируйте ссылку:" : "Copy the link:", link); }
    setMenu(false);
  };
  const native = async () => {
    try { await navigator.share({ title: "Rook Club", text: shareText, url: link }); } catch { /* закрыли окно */ }
    setMenu(false);
  };
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const item = "block w-full text-start px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <article className="card flex gap-3">
      <Link href={profileUrl(post.user.name)} aria-label={post.user.name}><Avatar name={post.user.name} src={post.user.avatar} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-sm">
          <Link href={profileUrl(post.user.name)} className="font-bold truncate hover:underline">@{post.user.name}</Link>
          <Link href={postUrl(post.id)} className="opacity-60 shrink-0 hover:underline">· {ago(post.created, ru)}</Link>
          {edited && <span className="opacity-50 text-xs shrink-0">{ru ? "изменено" : "edited"}</span>}
        </div>

        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 500))} rows={4} maxLength={500} autoFocus
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none" aria-label={ru ? "Текст поста" : "Post text"} />
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60">{500 - draft.length}</span>
              <button type="button" className="btn btn-ghost !py-1.5 ms-auto" onClick={() => setEditing(false)}>{ru ? "Отмена" : "Cancel"}</button>
              <button type="button" className="btn btn-primary !py-1.5" disabled={busy} onClick={saveEdit}>{busy ? "…" : ru ? "Сохранить" : "Save"}</button>
            </div>
          </div>
        ) : (
          text && <p className="mt-1 whitespace-pre-wrap break-words">{text}</p>
        )}

        {post.media.length > 0 && (
          <div className={`mt-2 grid gap-1 ${post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {post.media.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={mediaUrl(m)} alt="" loading="lazy" className="w-full rounded-xl object-cover max-h-96" />
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-4 text-sm relative">
          <button type="button" onClick={toggleLike} aria-pressed={liked} className="flex items-center gap-1" style={{ color: liked ? "#e0245e" : undefined, opacity: liked ? 1 : 0.7 }}>
            <span aria-hidden>{liked ? "♥" : "♡"}</span> {n > 0 ? n : ""}
            <span className="sr-only">{ru ? "Нравится" : "Like"}</span>
          </button>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="opacity-70 hover:opacity-100">↗ {ru ? "Поделиться" : "Share"}</button>
          {mine && !editing && <button type="button" onClick={startEdit} className="opacity-70 hover:opacity-100">✎ {ru ? "Изменить" : "Edit"}</button>}
          {mine && <button type="button" onClick={del} className="ms-auto text-xs opacity-60 hover:opacity-100">{ru ? "Удалить" : "Delete"}</button>}
          {menu && (
            <div className="absolute z-20 start-0 top-7 min-w-[12rem] rounded-xl border shadow-lg bg-white dark:bg-ink-800 overflow-hidden">
              <a className={item} target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`} onClick={() => setMenu(false)}>✈️ Telegram</a>
              <a className={item} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}`} onClick={() => setMenu(false)}>𝕏 X (Twitter)</a>
              <button type="button" className={item} onClick={copy}>🔗 {ru ? "Копировать ссылку" : "Copy link"}</button>
              {canNative && <button type="button" className={item} onClick={native}>⋯ {ru ? "Ещё…" : "More…"}</button>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

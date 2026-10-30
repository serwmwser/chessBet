"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { profileUrl } from "@/lib/urls";
import { errText, like, removePost, type SPost } from "@/lib/social";
import Avatar, { mediaUrl } from "./Avatar";

const ago = (t: number, ru: boolean) => {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return ru ? `${s} с` : `${s}s`;
  if (s < 3600) return ru ? `${Math.floor(s / 60)} мин` : `${Math.floor(s / 60)}m`;
  if (s < 86400) return ru ? `${Math.floor(s / 3600)} ч` : `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return ru ? `${Math.floor(s / 86400)} д` : `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
};

/** Карточка поста: автор, текст, фото, время, лайк и удаление своего поста */
export default function PostCard({ post, token, myName, onGone }: { post: SPost; token: string; myName?: string; onGone?: (id: number) => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [liked, setLiked] = useState(post.liked);
  const [n, setN] = useState(post.likes);
  const [busy, setBusy] = useState(false);
  const mine = !!myName && myName.toLowerCase() === post.user.name.toLowerCase();

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

  return (
    <article className="card flex gap-3">
      <Link href={profileUrl(post.user.name)} aria-label={post.user.name}><Avatar name={post.user.name} src={post.user.avatar} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-sm">
          <Link href={profileUrl(post.user.name)} className="font-bold truncate hover:underline">@{post.user.name}</Link>
          <span className="opacity-60 shrink-0">· {ago(post.created, ru)}</span>
          {mine && <button type="button" onClick={del} className="ml-auto text-xs opacity-60 hover:opacity-100">{ru ? "Удалить" : "Delete"}</button>}
        </div>
        {post.text && <p className="mt-1 whitespace-pre-wrap break-words">{post.text}</p>}
        {post.media.length > 0 && (
          <div className={`mt-2 grid gap-1 ${post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {post.media.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={mediaUrl(m)} alt="" loading="lazy" className="w-full rounded-xl object-cover max-h-96" />
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <button type="button" onClick={toggleLike} aria-pressed={liked} className="flex items-center gap-1" style={{ color: liked ? "#e0245e" : undefined, opacity: liked ? 1 : 0.7 }}>
            <span aria-hidden>{liked ? "♥" : "♡"}</span> {n > 0 ? n : ""}
            <span className="sr-only">{ru ? "Нравится" : "Like"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

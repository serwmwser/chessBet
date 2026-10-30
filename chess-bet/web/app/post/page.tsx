"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import PostCard from "@/components/PostCard";
import { useApp } from "@/lib/ctx";
import { getPost, useSocial, type SPost } from "@/lib/social";
import { profileUrl, ROUTES } from "@/lib/urls";

function One() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const id = sp_id(useSearchParams().get("id"));
  const s = useSocial();
  const [post, setPost] = useState<SPost | null>(null);
  const [state, setState] = useState<"load" | "ok" | "none">("load");
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!id) { setState("none"); return; }
    setState("load");
    getPost(id, s.token).then((p) => { setPost(p); setState("ok"); }).catch(() => setState("none"));
  }, [id, s.token]);

  if (state === "load") return <section className="card text-center opacity-70">…</section>;
  if (state === "none" || !post || gone) {
    return (
      <section className="card text-center space-y-3">
        <p>{gone ? (ru ? "Пост удалён." : "The post was deleted.") : ru ? "Такого поста нет или он удалён." : "This post does not exist or was deleted."}</p>
        <Link href={ROUTES.feed} className="btn btn-primary inline-block">{ru ? "В ленту" : "Go to the feed"}</Link>
      </section>
    );
  }
  return (
    <>
      <PostCard key={post.id} post={post} token={s.token} myName={s.me?.name} onGone={() => setGone(true)} />
      <div className="flex gap-2 flex-wrap">
        <Link href={profileUrl(post.user.name)} className="btn btn-ghost !py-2">👤 @{post.user.name}</Link>
        <Link href={ROUTES.feed} className="btn btn-ghost !py-2">📰 {ru ? "Лента" : "Feed"}</Link>
      </div>
    </>
  );
}
const sp_id = (v: string | null) => (v && /^\d{1,12}$/.test(v) ? v : "");

export default function PostPage() {
  const { lang } = useApp();
  return (
    <PageShell title={lang === "ru" ? "Пост" : "Post"} intro={lang === "ru" ? "Rook Club: сообщество любителей шахмат, крипты и NFT." : "Rook Club: the community for chess, crypto and NFT fans."}>
      <Suspense fallback={<section className="card text-center opacity-70">…</section>}>
        <One />
      </Suspense>
    </PageShell>
  );
}

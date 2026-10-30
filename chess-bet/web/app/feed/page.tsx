"use client";
import { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import { useApp } from "@/lib/ctx";
import { errText, getAll, getFeed, useSocial, type SPost } from "@/lib/social";

type Tab = "all" | "following";

export default function FeedPage() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const s = useSocial();
  const [tab, setTab] = useState<Tab>("all");
  const [posts, setPosts] = useState<SPost[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState(false);
  const needLogin = tab === "following" && !s.token;

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const before = reset || !posts.length ? 0 : posts[posts.length - 1].id;
      const page = tab === "following" ? await getFeed(s.token, before) : await getAll(before, s.token);
      setPosts((a) => (reset ? page : [...a, ...page]));
      setMore(page.length >= 20);
    } catch { if (reset) setPosts([]); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, s.token, posts]);
  useEffect(() => { setPosts([]); setMore(false); if (!needLogin) load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, s.token]);

  return (
    <PageShell
      title={ru ? "Лента" : "Feed"}
      intro={ru ? "Rook Club: свежие посты любителей шахмат, крипты и NFT и посты тех, на кого вы подписаны." : "Rook Club: the latest posts from chess, crypto and NFT fans, and from the people you follow."}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTab("all")} aria-pressed={tab === "all"} className={tab === "all" ? "btn btn-primary !py-2" : "btn btn-ghost !py-2"}>{ru ? "Все" : "Latest"}</button>
        <button type="button" onClick={() => setTab("following")} aria-pressed={tab === "following"} className={tab === "following" ? "btn btn-primary !py-2" : "btn btn-ghost !py-2"}>{ru ? "Подписки" : "Following"}</button>
        <button type="button" className="btn btn-primary !py-2 ms-auto" onClick={() => setComposer((v) => !v)}>Post</button>
      </div>

      {composer && (
        <PostComposer me={s.me} token={s.token} signIn={s.signIn} onClose={() => setComposer(false)} onPosted={(p) => setPosts((a) => [p, ...a])} />
      )}

      {needLogin ? (
        <section className="card space-y-3 text-center">
          <p>{ru ? "Чтобы видеть посты тех, на кого вы подписаны, подключите кошелёк и войдите (подпись бесплатна)." : "To see posts from people you follow, connect your wallet and sign in (the signature is free)."}</p>
          <button type="button" className="btn btn-primary" disabled={s.busy || !s.addr} onClick={() => s.signIn().catch((e) => toast(errText(e, ru), "err"))}>
            {s.addr ? (ru ? "Войти" : "Sign in") : ru ? "Сначала подключите кошелёк" : "Connect your wallet first"}
          </button>
        </section>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} token={s.token} myName={s.me?.name} onGone={(id) => setPosts((a) => a.filter((x) => x.id !== id))} />
          ))}
          {!loading && posts.length === 0 && (
            <p className="card text-center opacity-70">
              {tab === "following" ? (ru ? "Пока пусто. Подпишитесь на кого-нибудь на вкладке «Все»: откройте профиль автора и нажмите «Читать»." : "Nothing here yet. Follow someone from the Latest tab: open an author's profile and press Follow.") : ru ? "Пока нет постов. Напишите первый!" : "No posts yet. Write the first one!"}
            </p>
          )}
          {loading && <p className="text-center opacity-60">…</p>}
          {more && !loading && <button type="button" className="btn btn-ghost w-full" onClick={() => load(false)}>{ru ? "Показать ещё" : "Load more"}</button>}
        </div>
      )}
    </PageShell>
  );
}

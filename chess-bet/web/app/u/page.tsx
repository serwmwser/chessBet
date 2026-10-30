"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar, { mediaUrl } from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import PostComposer, { uploadImage } from "@/components/PostComposer";
import { useApp } from "@/lib/ctx";
import { shortAddr } from "@/lib/config";
import { profileUrl } from "@/lib/urls";
import { errText, follow, getFeed, getPosts, getUser, saveProfile, useSocial, type SPost, type SUser } from "@/lib/social";

type Tab = "posts" | "media" | "feed";

function Profile() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const router = useRouter();
  const sp = useSearchParams();
  const s = useSocial();
  const asked = (sp.get("name") || "").toLowerCase();
  const target = asked || s.me?.name || "";

  const [u, setU] = useState<SUser | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<SPost[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState(false);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", bio: "", country: "", link: "", avatar: "", banner: "" });

  useEffect(() => {
    setMissing(false);
    if (!target) { setU(null); return; }
    getUser(target, s.token).then(setU).catch(() => { setU(null); setMissing(true); });
  }, [target, s.token]);

  const load = useCallback(async (reset: boolean) => {
    if (!target) return;
    setLoading(true);
    try {
      const before = reset || !posts.length ? 0 : posts[posts.length - 1].id;
      const page = tab === "feed" ? await getFeed(s.token, before) : await getPosts(target, before, s.token);
      setPosts((a) => (reset ? page : [...a, ...page]));
      setMore(page.length >= 20);
    } catch { if (reset) setPosts([]); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, tab, s.token, posts]);
  useEffect(() => { setPosts([]); setMore(false); if (target && (tab !== "feed" || s.token)) load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [target, tab, s.token]);

  const doFollow = async () => {
    if (!u) return;
    try { const t = s.token || (await s.signIn()); setU(await follow(t, u.name, !u.follows)); } catch (e) { toast(errText(e, ru), "err"); }
  };
  const startEdit = () => { if (!u) return; setF({ name: u.name, bio: u.bio, country: u.country, link: u.link, avatar: u.avatar, banner: u.banner }); setEdit(true); };
  const upImg = async (k: "avatar" | "banner", file?: File) => {
    if (!file) return;
    try { const p = await uploadImage(s.token, file); setF((x) => ({ ...x, [k]: p })); }
    catch (e) { toast((e as Error).message === "bad_image" ? (ru ? "Нужна картинка JPG, PNG или WebP" : "Use a JPG, PNG or WebP image") : errText(e, ru), "err"); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const nu = await saveProfile(s.token, { ...f, name: f.name.trim().toLowerCase() });
      s.setMe(nu); setU(nu); setEdit(false);
      toast(ru ? "Профиль сохранён" : "Profile saved", "ok");
      if (nu.name !== target) router.replace(profileUrl(nu.name));
    } catch (e) { toast(errText(e, ru), "err"); }
    finally { setBusy(false); }
  };

  // нет ника в адресе и не вошли
  if (!target) {
    const login = async () => { setErr(""); try { await s.signIn(); } catch (e) { const m = errText(e, ru); setErr(m); toast(m, "err"); } };
    return (
      <section className="card space-y-3 text-center">
        {s.addr ? (
          <>
            <p className="font-semibold text-emerald-500">✅ {ru ? "Кошелёк подключён" : "Wallet connected"}: {shortAddr(s.addr)}</p>
            <p className="text-sm opacity-80">{ru ? "Осталось войти: нажмите кнопку и подпишите бесплатное сообщение в кошельке. Деньги не списываются." : "One more step: press the button and sign a free message in your wallet. No money is spent."}</p>
          </>
        ) : (
          <p>{ru ? "Подключите кошелёк кнопкой в шапке сайта, затем нажмите «Войти»." : "Connect your wallet with the button in the header, then press Sign in."}</p>
        )}
        <button type="button" className="btn btn-primary" disabled={s.busy || !s.addr} onClick={login}>
          {s.busy ? (ru ? "Ждём подпись в кошельке…" : "Waiting for your signature…") : ru ? "Войти" : "Sign in"}
        </button>
        {err && <p className="text-sm text-red-500" role="alert">{err}</p>}
      </section>
    );
  }
  if (missing) return <section className="card text-center">{ru ? "Такого профиля нет." : "This profile does not exist."}</section>;
  if (!u) return <section className="card text-center opacity-70">…</section>;

  const shown = tab === "media" ? posts.filter((p) => p.media.length) : posts;
  const tabs: [Tab, string][] = [["posts", ru ? "Посты" : "Posts"], ["media", ru ? "Медиа" : "Media"], ...(u.me ? ([["feed", ru ? "Лента" : "Feed"]] as [Tab, string][]) : [])];
  const banner = u.banner ? mediaUrl(u.banner) : "";

  return (
    <>
      <section className="card !p-0 overflow-hidden">
        <div className="h-32 sm:h-44" style={{ background: banner ? `center/cover url(${banner})` : "linear-gradient(120deg,#3b2a05,#c8962e 60%,#f5d36b)" }} />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-10">
            <div className="rounded-full p-1" style={{ background: "var(--bg, #fff)" }}><Avatar name={u.name} src={u.avatar} size={80} /></div>
            <div className="flex gap-2 pb-1">
              {u.me ? (
                <>
                  <button type="button" className="btn btn-ghost !py-2" onClick={startEdit}>{ru ? "Редактировать" : "Edit profile"}</button>
                  <button type="button" className="btn btn-primary !py-2" onClick={() => setComposer((v) => !v)}>Post</button>
                </>
              ) : (
                <button type="button" className={u.follows ? "btn btn-ghost !py-2" : "btn btn-primary !py-2"} onClick={doFollow}>
                  {u.follows ? (ru ? "Вы читаете" : "Following") : ru ? "Читать" : "Follow"}
                </button>
              )}
            </div>
          </div>
          <h2 className="mt-2 text-xl font-extrabold">@{u.name}</h2>
          {u.bio && <p className="mt-1 whitespace-pre-wrap break-words">{u.bio}</p>}
          <p className="mt-2 text-sm opacity-70 flex flex-wrap gap-x-4 gap-y-1">
            {u.country && <span>📍 {u.country}</span>}
            {u.link && <a href={u.link} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline break-all">🔗 {u.link.replace(/^https:\/\//, "")}</a>}
            <span>📅 {ru ? "С " : "Joined "}{new Date(u.joined).toLocaleDateString(ru ? "ru-RU" : "en-US", { month: "long", year: "numeric" })}</span>
          </p>
          <p className="mt-2 text-sm"><b>{u.following}</b> {ru ? "Подписки" : "Following"} · <b>{u.followers}</b> {ru ? "Подписчики" : "Followers"} · <b>{u.posts}</b> {ru ? "Постов" : "Posts"}</p>
        </div>
      </section>

      {edit && (
        <section className="card space-y-3">
          <h3 className="font-bold">{ru ? "Редактировать профиль" : "Edit profile"}</h3>
          <label className="block text-sm">{ru ? "Ник (латиница, цифры, _)" : "Name (letters, digits, _)"}
            <input className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent" value={f.name} maxLength={20} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="block text-sm">{ru ? "О себе" : "Bio"}
            <textarea className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent" rows={3} maxLength={160} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">{ru ? "Страна" : "Country"}
              <input className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent" value={f.country} maxLength={40} onChange={(e) => setF({ ...f, country: e.target.value })} />
            </label>
            <label className="block text-sm">{ru ? "Ссылка (https://…)" : "Link (https://…)"}
              <input className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent" value={f.link} maxLength={120} onChange={(e) => setF({ ...f, link: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">{ru ? "Аватар" : "Avatar"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" onChange={(e) => upImg("avatar", e.target.files?.[0])} />
              {f.avatar && <span className="text-xs text-emerald-500">✔ {ru ? "загружено" : "uploaded"}</span>}
            </label>
            <label className="block">{ru ? "Баннер" : "Banner"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" onChange={(e) => upImg("banner", e.target.files?.[0])} />
              {f.banner && <span className="text-xs text-emerald-500">✔ {ru ? "загружено" : "uploaded"}</span>}
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn btn-ghost !py-2" onClick={() => setEdit(false)}>{ru ? "Отмена" : "Cancel"}</button>
            <button type="button" className="btn btn-primary !py-2" disabled={busy} onClick={save}>{busy ? "…" : ru ? "Сохранить" : "Save"}</button>
          </div>
        </section>
      )}

      {u.me && composer && (
        <PostComposer me={s.me} token={s.token} signIn={s.signIn} onClose={() => setComposer(false)}
          onPosted={(p) => { setPosts((a) => (tab === "feed" || tab === "posts" || p.media.length ? [p, ...a] : a)); setU((x) => (x ? { ...x, posts: x.posts + 1 } : x)); }} />
      )}

      <nav className="flex gap-2" aria-label={ru ? "Разделы профиля" : "Profile sections"}>
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={tab === k ? "btn btn-primary !py-2" : "btn btn-ghost !py-2"}>{label}</button>
        ))}
      </nav>

      <div className="space-y-3">
        {shown.map((p) => (
          <PostCard key={p.id} post={p} token={s.token} myName={s.me?.name} onGone={(id) => { setPosts((a) => a.filter((x) => x.id !== id)); setU((x) => (x ? { ...x, posts: Math.max(0, x.posts - 1) } : x)); }} />
        ))}
        {!loading && shown.length === 0 && (
          <p className="card text-center opacity-70">
            {tab === "feed" ? (ru ? "Здесь появятся посты тех, на кого вы подписаны." : "Posts from people you follow will show up here.") : ru ? "Пока нет постов." : "No posts yet."}
          </p>
        )}
        {loading && <p className="text-center opacity-60">…</p>}
        {more && !loading && <button type="button" className="btn btn-ghost w-full" onClick={() => load(false)}>{ru ? "Показать ещё" : "Load more"}</button>}
      </div>
    </>
  );
}

export default function ProfilePage() {
  const { lang } = useApp();
  return (
    <PageShell title={lang === "ru" ? "Профиль" : "Profile"} intro={lang === "ru" ? "Rook Club — клуб любителей шахмат, крипты и NFT: посты, фото, подписчики." : "Rook Club: a community for chess, crypto and NFT fans. Posts, photos and followers."}>
      <Suspense fallback={<section className="card text-center opacity-70">…</section>}>
        <Profile />
      </Suspense>
    </PageShell>
  );
}

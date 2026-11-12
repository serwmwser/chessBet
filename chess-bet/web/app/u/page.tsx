"use client";
import LoginPrompt from "@/components/LoginPrompt";
import SectionsGrid from "@/components/SectionsGrid";
import { Suspense, useCallback, useEffect, useRef, useState, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar, { mediaUrl } from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import ChatPanel from "@/components/ChatPanel";
import MailPanel from "@/components/MailPanel";
import TchPanel from "@/components/TchPanel";
import PeopleSearch from "@/components/PeopleSearch";
import ReportButton from "@/components/ReportButton";
import CallButton from "@/components/CallButton";
import DailyQuests, { PlayerBadges } from "@/components/DailyQuests";
import { useUnread } from "@/lib/dm";
import { useMailUnread } from "@/lib/mail";
import ShareMenu from "@/components/ShareMenu";
import PostComposer, { uploadImage } from "@/components/PostComposer";
import { useApp } from "@/lib/ctx";
import { shortAddr } from "@/lib/config";
import { absoluteUrl, profileUrl } from "@/lib/urls";
import { errText, follow, getFeed, getPosts, getUser, LANGS, saveProfile, useSocial, type SPost, type SUser } from "@/lib/social";

type Tab = "posts" | "media" | "feed" | "chat" | "mail" | "tch" | "people";

function Profile() {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const router = useRouter();
  const sp = useSearchParams();
  const s = useSocial();
  const unread = useUnread(s.token);
  const mailUnread = useMailUnread(s.token);
  const asked = (sp.get("name") || "").toLowerCase();
  const target = asked || s.me?.name || "";

  const [u, setU] = useState<SUser | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>(sp.get("tab") === "chat" ? "chat" : sp.get("tab") === "mail" ? "mail" : sp.get("tab") === "tch" ? "tch" : sp.get("tab") === "people" ? "people" : "posts");
  const [posts, setPosts] = useState<SPost[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState(false);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", bio: "", country: "", link: "", avatar: "", banner: "", langs: [] as string[] }); // HiMeet langs

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
  useEffect(() => { setPosts([]); setMore(false); if (target && tab !== "chat" && tab !== "mail" && tab !== "tch" && tab !== "people" && (tab !== "feed" || s.token)) load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [target, tab, s.token]);

  const doFollow = async () => {
    if (!u) return;
    try { const t = s.token || (await s.signIn()); setU(await follow(t, u.name, !u.follows)); } catch (e) { toast(errText(e, ru), "err"); }
  };
  const startEdit = () => { if (!u) return; setF({ name: u.name, bio: u.bio, country: u.country, link: u.link, avatar: u.avatar, banner: u.banner, langs: u.langs ?? [] }); setEdit(true); };
  const autoEdit = useRef(false); // ссылка /u/?edit=1 из кабинета сразу открывает редактор
  useEffect(() => { if (u?.me && sp.get("edit") === "1" && !autoEdit.current) { autoEdit.current = true; startEdit(); } }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  const upImg = async (k: "avatar" | "banner", file?: File) => {
    if (!file) return;
    try { const t = s.token || (await s.signIn()); const p = await uploadImage(t, file); setF((x) => ({ ...x, [k]: p })); }
    catch (e) { toast((e as Error).message === "bad_image" ? (ru ? "Нужна картинка JPG, PNG или WebP" : "Use a JPG, PNG or WebP image") : errText(e, ru), "err"); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const t = s.token || (await s.signIn());
      const nu = await saveProfile(t, { ...f, name: f.name.trim().toLowerCase() });
      s.setMe(nu); setU(nu); setEdit(false);
      toast(ru ? "Профиль сохранён" : "Profile saved", "ok");
      if (nu.name !== target) router.replace(profileUrl(nu.name));
    } catch (e) { toast(errText(e, ru), "err"); }
    finally { setBusy(false); }
  };

  // нет ника в адресе и не вошли
  if (!target) {
    return <><LoginPrompt text={ru ? "Войдите, чтобы открыть свой профиль: подключите кошелёк, вход выполнится автоматически." : "Connect your wallet to open your profile: sign-in happens automatically."} /><SectionsGrid /></>;
  }
  if (missing) return <section className="card text-center">{ru ? "Такого профиля нет." : "This profile does not exist."}</section>;
  if (!u) return <section className="card text-center opacity-70">…</section>;

  const shown = tab === "media" ? posts.filter((p) => p.media.length) : posts;
  const tabs: [Tab, string][] = [["posts", ru ? "Посты" : "Posts"], ["media", ru ? "Медиа" : "Media"], ...(u.me ? ([["feed", ru ? "Лента" : "Feed"]] as [Tab, string][]) : []), ["chat", ru ? "💬 Чат" : "💬 Chat"], ...(u.me ? ([["mail", ru ? "📧 Почта" : "📧 Mail"], ["tch", "🪙 TCH"], ["people", ru ? "🌍 Люди" : "🌍 People"]] as [Tab, string][]) : [])];
  const banner = u.banner ? mediaUrl(u.banner) : "";

  return (
    <>
      <section className="card !p-0 overflow-hidden">
        <div className="h-32 sm:h-44" style={{ background: banner ? `center/cover url(${banner})` : "linear-gradient(120deg,#3b2a05,#c8962e 60%,#f5d36b)" }} />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-10">
            <div className="rounded-full p-1" style={{ background: "var(--bg, #fff)" }}><Avatar name={u.name} src={u.avatar} size={80} /></div>
            <div className="flex flex-wrap justify-end gap-2 pb-1">
              <ShareMenu url={absoluteUrl(profileUrl(u.name))} text={`@${u.name} — Rook Club`} label={ru ? "Поделиться профилем" : "Share profile"} className="btn btn-ghost !py-2" />
              {u.me ? (
                <>
                  <button type="button" className="btn btn-ghost !py-2" onClick={startEdit}>{ru ? "Редактировать" : "Edit profile"}</button>
                  <button type="button" className="btn btn-primary !py-2" onClick={() => setComposer((v) => !v)}>Post</button>
                  <button type="button" className="btn btn-ghost !py-2" onClick={s.signOut}>{ru ? "Выйти" : "Sign out"}</button>
                </>
              ) : (
                <>
                  <button type="button" className={u.follows ? "btn btn-ghost !py-2" : "btn btn-primary !py-2"} onClick={doFollow}>
                    {u.follows ? (ru ? "Вы читаете" : "Following") : ru ? "Читать" : "Follow"}
                  </button>
                  <button type="button" className="btn btn-primary !py-2" onClick={() => { setTab("chat"); setEdit(false); setTimeout(() => document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }}>✉ {ru ? "Написать" : "Message"}</button>
                  <CallButton name={u.name} className="!py-2" />
                  <ReportButton kind="user" name={u.name} token={s.token} className="btn btn-ghost !py-2 text-sm" />
                </>
              )}
            </div>
          </div>
          <h2 className="mt-2 text-xl font-extrabold">@{u.name}</h2>
          {u.bio && <p className="mt-1 whitespace-pre-wrap break-words">{u.bio}</p>}
          <p className="mt-2 text-sm opacity-70 flex flex-wrap gap-x-4 gap-y-1">
            {u.country && <span>📍 {u.country}</span>}
            {!!u.langs?.length && <span>🗣 {u.langs.map((c) => LANGS.find((l) => l[0] === c)?.[ru ? 1 : 2] ?? c).join(", ")}</span>}
            {u.link && <a href={u.link} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline break-all">🔗 {u.link.replace(/^https:\/\//, "")}</a>}
            <span>📅 {ru ? "С " : "Joined "}{new Date(u.joined).toLocaleDateString(ru ? "ru-RU" : "en-US", { month: "long", year: "numeric" })}</span>
          </p>
          <p className="mt-2 text-sm"><b>{u.following}</b> {ru ? "Подписки" : "Following"} · <b>{u.followers}</b> {ru ? "Подписчики" : "Followers"} · <b>{u.posts}</b> {ru ? "Постов" : "Posts"}</p>
        </div>
      </section>

      {!edit && (u.me ? <DailyQuests token={s.token} signIn={s.signIn} /> : <PlayerBadges name={u.name} />)}
      {!edit && u.me && <SectionsGrid force />}

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
          <div className="text-sm">
            <div>{ru ? "Языки, на которых вы общаетесь" : "Languages you speak"}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {LANGS.map(([code, nameRu, nameEn]) => {
                const on = f.langs.includes(code);
                return (
                  <button key={code} type="button" className={"chip " + (on ? "chip-on" : "")} aria-pressed={on}
                    onClick={() => setF({ ...f, langs: on ? f.langs.filter((x) => x !== code) : f.langs.length >= 8 ? f.langs : [...f.langs, code] })}>
                    {ru ? nameRu : nameEn}
                  </button>
                );
              })}
            </div>
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

      <nav id="profile-tabs" className="flex flex-wrap gap-2 scroll-mt-4" aria-label={ru ? "Разделы профиля" : "Profile sections"}>
        {tabs.map(([k, label], i) => (
          <Fragment key={k}>{/* HiMeet tabs */}{i > 0 && tabs[i - 1][0] === "chat" && <span aria-hidden="true" className="basis-full h-0 sm:hidden" />}
          <button type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={tab === k ? "btn btn-primary !py-2" : "btn btn-ghost !py-2"}>{label}{k === "chat" && u.me && unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}{k === "mail" && mailUnread > 0 ? ` (${mailUnread > 99 ? "99+" : mailUnread})` : ""}</button></Fragment>
        ))}
      </nav>

      {tab === "people" && u.me ? (
        <PeopleSearch me={s.me?.name} />
      ) : tab === "tch" && u.me ? (
        <TchPanel token={s.token} />
      ) : tab === "mail" && u.me ? (
        <MailPanel token={s.token} myName={s.me?.name} initialTo={sp.get("to") || ""} />
      ) : tab === "chat" ? (
        <ChatPanel token={s.token} addr={s.addr} busy={s.busy} signIn={s.signIn} peer={u.me ? undefined : u.name} initial={u.me ? sp.get("with") || "" : ""} />
      ) : (
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
      )}
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

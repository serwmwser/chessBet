"use client";
import LoginPrompt from "@/components/LoginPrompt";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import DatingCard from "@/components/DatingCard";
import DatingProfileForm from "@/components/DatingProfileForm";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { ROUTES } from "@/lib/urls";
import { browseDating, datingError, getMyDating, matchesDating, type DCard, type Filters, type MyProfile } from "@/lib/dating";
import { EN, RU } from "./content";

type Tab = "feed" | "matches" | "me";
const DEFAULT_FILTERS: Filters = { gender: "", min: 18, max: 99, country: "", level: 0 };

export default function DatingPage() {
  const { lang, toast } = useApp();
  const { token, me, signIn } = useSocial();
  const ru = lang === "ru";
  const c = ru ? RU : EN;

  const [tab, setTab] = useState<Tab>("feed");
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<DCard[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [matches, setMatches] = useState<DCard[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(false);

  // своя анкета
  useEffect(() => {
    if (!token) { setProfile(null); setLoaded(false); return; }
    getMyDating(token).then((r) => { setProfile(r.profile); setLoaded(true); if (!r.profile) setTab("me"); }).catch(() => setLoaded(true));
  }, [token]);

  const load = useCallback(async (f: Filters, offset: number) => {
    setLoading(true);
    try {
      const r = await browseDating(token, f, offset);
      setItems((a) => (offset ? [...a, ...r.items] : r.items));
      setNext(r.next); setTotal(r.total);
    } catch (e) { toast(datingError((e as Error).message, ru), "err"); }
    setLoading(false);
  }, [token, ru, toast]);

  useEffect(() => { if (token && profile?.enabled && tab === "feed") void load(filters, 0); }, [token, profile?.enabled, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !profile || tab !== "matches") return;
    matchesDating(token).then((r) => { setMatches(r.items); setPending(r.pending); }).catch(() => {});
  }, [token, profile, tab]);

  const inp = "w-full rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-emerald-500";
  const chip = (on: boolean) => `chip ${on ? "chip-on" : ""}`;
  const tabs: [Tab, string][] = [["feed", ru ? "Лента" : "Feed"], ["matches", ru ? "Совпадения" : "Matches"], ["me", ru ? "Моя анкета" : "My profile"]];

  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{c.crumb}</span>
      </nav>

      {!token && <LoginPrompt text={ru ? "Чтобы смотреть анкеты и создать свою, подключите кошелёк. Знакомства доступны только пользователям 18+." : "Connect your wallet to browse profiles and create yours. Dating is available to users 18+ only."} />}

      {token && !me && (
        <section className="card space-y-2">
          <p className="text-sm">{ru ? "Сначала создайте профиль в Rook Club (ник и фото): к нему привязывается анкета." : "First create your Rook Club profile (nickname and avatar): your dating profile is attached to it."}</p>
          <Link href={ROUTES.feed} className="btn btn-primary !py-2 w-full sm:w-auto">{ru ? "Создать профиль" : "Create profile"}</Link>
        </section>
      )}

      {token && me && loaded && (
        <>
          <div role="tablist" className="flex gap-2 flex-wrap">
            {tabs.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={chip(tab === k)} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === "feed" && (
            !profile?.enabled ? (
              <section className="card text-sm">{profile ? (ru ? "Ваша анкета скрыта. Включите показ во вкладке «Моя анкета», чтобы смотреть ленту." : "Your profile is hidden. Turn on feed visibility in My profile to browse.") : (ru ? "Сначала заполните анкету." : "Fill in your profile first.")}</section>
            ) : (
              <>
                <section className="card grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={ru ? "Фильтры" : "Filters"}>
                  <label className="text-xs flex flex-col gap-1">{ru ? "Кого показывать" : "Show"}
                    <select className={inp} value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value as Filters["gender"] })}>
                      <option value="">{ru ? "Подходящих мне" : "My preference"}</option>
                      <option value="f">{ru ? "Женщин" : "Women"}</option>
                      <option value="m">{ru ? "Мужчин" : "Men"}</option>
                    </select>
                  </label>
                  <label className="text-xs flex flex-col gap-1">{ru ? "Возраст от" : "Age from"}
                    <input className={inp} inputMode="numeric" value={filters.min} onChange={(e) => setFilters({ ...filters, min: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 18 })} />
                  </label>
                  <label className="text-xs flex flex-col gap-1">{ru ? "до" : "to"}
                    <input className={inp} inputMode="numeric" value={filters.max} onChange={(e) => setFilters({ ...filters, max: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 99 })} />
                  </label>
                  <label className="text-xs flex flex-col gap-1">{ru ? "Уровень от" : "Level from"}
                    <input className={inp} inputMode="numeric" value={filters.level || ""} placeholder="1" onChange={(e) => setFilters({ ...filters, level: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0 })} />
                  </label>
                  <label className="text-xs flex flex-col gap-1 col-span-2 sm:col-span-3">{ru ? "Страна / город" : "Country / city"}
                    <input className={inp} value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value.slice(0, 40) })} />
                  </label>
                  <div className="flex items-end gap-2">
                    <button type="button" className="btn btn-primary !py-2 grow" disabled={loading} onClick={() => void load(filters, 0)}>{ru ? "Найти" : "Search"}</button>
                    <button type="button" className="btn btn-ghost !py-2" onClick={() => { setFilters(DEFAULT_FILTERS); void load(DEFAULT_FILTERS, 0); }} aria-label={ru ? "Сбросить" : "Reset"}>↺</button>
                  </div>
                </section>

                {!loading && items.length === 0 && <section className="card text-sm text-center opacity-80">{ru ? "Пока никого не нашли. Измените фильтры или загляните позже." : "Nobody found yet. Change the filters or check back later."}</section>}
                {total > 0 && <p className="text-xs opacity-60">{ru ? `Найдено анкет: ${total}` : `Profiles found: ${total}`}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((x) => <DatingCard key={x.name} card={x} token={token} />)}
                </div>
                {next !== null && <button type="button" className="btn btn-ghost w-full" disabled={loading} onClick={() => void load(filters, next)}>{loading ? "…" : ru ? "Показать ещё" : "Show more"}</button>}
              </>
            )
          )}

          {tab === "matches" && (
            <>
              {pending > 0 && <section className="card text-sm">💛 {ru ? `Вам поставили лайк: ${pending}. Загляните в ленту — карточки с такой пометкой ждут ответа.` : `${pending} people liked you. Look for the badge in the feed.`}</section>}
              {matches.length === 0 ? <section className="card text-sm text-center opacity-80">{ru ? "Совпадений пока нет. Ставьте лайки в ленте!" : "No matches yet. Send some likes in the feed!"}</section> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matches.map((x) => <DatingCard key={x.name} card={x} token={token} />)}
                </div>
              )}
            </>
          )}

          {tab === "me" && (
            <DatingProfileForm token={token} initial={profile}
              onSaved={(p) => { setProfile(p); setTab("feed"); }}
              onDeleted={() => { setProfile(null); setItems([]); setMatches([]); }} />
          )}
        </>
      )}

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{c.why.h}</h2>
        {c.why.p.map((p) => <p key={p} className="text-sm opacity-90">{p}</p>)}
      </section>

      <section className="space-y-3" aria-label={c.stepsH}>
        <h2 className="text-lg font-bold text-center">{c.stepsH}</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.steps.map(([h, p], i) => (
            <li key={h} className="card flex gap-3">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-600" aria-hidden>{i + 1}</span>
              <div><h3 className="font-semibold">{h}</h3><p className="text-sm opacity-85">{p}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-2" aria-label={c.safetyH}>
        <h2 className="text-lg font-bold">🛡 {c.safetyH}</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">{c.safety.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="text-xs opacity-70"><Link href={ROUTES.terms} className="underline">{ru ? "Условия использования" : "Terms of use"}</Link> · <Link href={ROUTES.age} className="underline">{ru ? "Возраст 18+" : "Age 18+"}</Link></p>
      </section>

      <section className="space-y-2" aria-label={c.faqH}>
        <h2 className="text-lg font-bold text-center">{c.faqH}</h2>
        {c.faq.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="font-semibold cursor-pointer">{q}</summary>
            <p className="text-sm opacity-85 mt-2">{a}</p>
          </details>
        ))}
      </section>
    </PageShell>
  );
}

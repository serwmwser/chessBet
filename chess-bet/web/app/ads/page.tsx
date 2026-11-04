"use client";
import LoginPrompt from "@/components/LoginPrompt";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "thirdweb/react";
import PageShell from "@/components/PageShell";
import AdCard from "@/components/AdCard";
import AdForm from "@/components/AdForm";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { ROUTES } from "@/lib/urls";
import { KINDS, KIND_LABEL, adPlaces, adsError, adsQuery, deleteAd, fmtPrice, listAds, myAds, renewAd, type Ad, type AdFilters, type Kind, type Place } from "@/lib/classifieds";
import { wallets } from "@/components/Header";
import { EN, RU } from "./content";

type Tab = "list" | "new" | "mine";
const EMPTY: AdFilters = { kind: "", country: "", city: "", q: "" };

export default function AdsPage() {
  const { lang, dark, toast } = useApp();
  const { addr, token, me, signIn } = useSocial();
  const { connect } = useConnectModal();
  const ru = lang === "ru";
  const c = ru ? RU : EN;

  const [tab, setTab] = useState<Tab>("list");
  const [filters, setFilters] = useState<AdFilters>(EMPTY);
  const [places, setPlaces] = useState<Place[]>([]);
  const [items, setItems] = useState<Ad[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState<Ad[]>([]);
  const [edit, setEdit] = useState<Ad | null>(null);
  const first = useRef(true);

  const load = useCallback(async (f: AdFilters, page: number) => {
    setLoading(true);
    try {
      const r = await listAds(f, page, token);
      setItems((a) => (page ? [...a, ...r.items] : r.items));
      setNext(r.next);
    } catch (e) { toast(adsError((e as Error).message, ru), "err"); }
    setLoading(false); setLoaded(true);
  }, [token, ru, toast]);

  const loadMine = useCallback(() => {
    if (!token) return;
    myAds(token).then(setMine).catch((e) => toast(adsError((e as Error).message, ru), "err"));
  }, [token, ru, toast]);

  // фильтры из адреса: /ads/?kind=rent&country=poland&city=warsaw
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const k = q.get("kind") || "";
    const f: AdFilters = { kind: (KINDS as string[]).includes(k) ? (k as Kind) : "", country: q.get("country") || "", city: q.get("city") || "", q: q.get("q") || "" };
    setFilters(f);
    void load(f, 0);
    adPlaces().then(setPlaces).catch(() => {});
    first.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (tab === "mine") loadMine(); }, [tab, loadMine]);

  const apply = (f: AdFilters) => {
    setFilters(f);
    try { window.history.replaceState(null, "", window.location.pathname + adsQuery(f)); } catch { /* без истории */ }
    void load(f, 0);
  };

  const login = () => {
    if (!addr) { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "Chess Bet" }); return; }
    void signIn().catch(() => toast(ru ? "Не удалось войти. Подпишите сообщение в кошельке" : "Could not sign in. Sign the message in your wallet", "err"));
  };

  const cities = places.find((p) => p.slug === filters.country.toLowerCase())?.cities ?? [];
  const inp = "w-full rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 ring-emerald-500";
  const chip = (on: boolean) => `chip ${on ? "chip-on" : ""}`;
  const tabs: [Tab, string][] = [["list", ru ? "Объявления" : "Ads"], ["new", ru ? "Подать объявление" : "Post an ad"], ["mine", ru ? "Мои объявления" : "My ads"]];

  const guest = <LoginPrompt text={ru ? "Чтобы подавать объявления и писать продавцам, подключите кошелёк (подпись бесплатна)." : "Connect your wallet to post ads and message sellers (signing is free)."} />;
  const needProfile = (
    <section className="card space-y-2">
      <p className="text-sm">{ru ? "Сначала создайте профиль в Rook Club (ник и фото): объявления подаются от его имени." : "First create your Rook Club profile (nickname and avatar): ads are posted under it."}</p>
      <Link href={ROUTES.feed} className="btn btn-primary !py-2 w-full sm:w-auto">{ru ? "Создать профиль" : "Create profile"}</Link>
    </section>
  );

  const doRenew = async (a: Ad) => {
    try { await renewAd(token, a.id); toast(ru ? "Объявление продлено на 30 дней" : "Ad renewed for 30 days", "ok"); loadMine(); }
    catch (e) { toast(adsError((e as Error).message, ru), "err"); }
  };
  const doDelete = async (a: Ad) => {
    if (!window.confirm(ru ? "Удалить объявление?" : "Delete this ad?")) return;
    try { await deleteAd(token, a.id); setMine((x) => x.filter((y) => y.id !== a.id)); toast(ru ? "Объявление удалено" : "Ad deleted", "ok"); }
    catch (e) { toast(adsError((e as Error).message, ru), "err"); }
  };
  const status = (a: Ad) => a.status === "hidden" ? (ru ? "Скрыто модерацией" : "Hidden by moderation") : a.expired ? (ru ? "Срок истёк" : "Expired") : (ru ? "Активно до " : "Active until ") + new Date(a.expires).toLocaleDateString(ru ? "ru-RU" : "en-US");

  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{c.crumb}</span>
      </nav>

      <div role="tablist" className="flex gap-2 flex-wrap">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={chip(tab === k)} onClick={() => { setTab(k); setEdit(null); }}>{l}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div className="flex flex-wrap gap-2" aria-label={c.kindsH}>
            <button type="button" className={chip(filters.kind === "")} onClick={() => apply({ ...filters, kind: "" })}>{ru ? "Все" : "All"}</button>
            {KINDS.map((k) => <button key={k} type="button" className={chip(filters.kind === k)} onClick={() => apply({ ...filters, kind: k })}>{KIND_LABEL[k][ru ? 0 : 1]}</button>)}
          </div>
          <section className="card grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={ru ? "Фильтры" : "Filters"}>
            <label className="text-xs flex flex-col gap-1">{ru ? "Страна" : "Country"}
              <select className={inp} value={filters.country.toLowerCase()} onChange={(e) => apply({ ...filters, country: e.target.value, city: "" })}>
                <option value="">{ru ? "Все страны" : "All countries"}</option>
                {places.map((p) => <option key={p.slug} value={p.slug}>{p.country} ({p.count})</option>)}
              </select>
            </label>
            <label className="text-xs flex flex-col gap-1">{ru ? "Город" : "City"}
              <select className={inp} value={filters.city.toLowerCase()} disabled={!cities.length} onChange={(e) => apply({ ...filters, city: e.target.value })}>
                <option value="">{ru ? "Все города" : "All cities"}</option>
                {cities.map((x) => <option key={x.slug} value={x.slug}>{x.city} ({x.count})</option>)}
              </select>
            </label>
            <label className="text-xs flex flex-col gap-1 col-span-2">{ru ? "Поиск" : "Search"}
              <span className="flex gap-2">
                <input className={inp} value={filters.q} maxLength={60} placeholder={ru ? "Например: велосипед" : "E.g. bicycle"}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") apply(filters); }} />
                <button type="button" className="btn btn-primary !py-2" disabled={loading} onClick={() => apply(filters)}>{ru ? "Найти" : "Search"}</button>
                <button type="button" className="btn btn-ghost !py-2" onClick={() => apply(EMPTY)} aria-label={ru ? "Сбросить" : "Reset"}>↺</button>
              </span>
            </label>
          </section>

          {loaded && !loading && items.length === 0 && (
            <section className="card text-sm text-center opacity-80">
              {ru ? "Объявлений по этим условиям пока нет. Измените фильтры или " : "No ads match yet. Change the filters or "}
              <button type="button" className="underline" onClick={() => setTab("new")}>{ru ? "подайте своё" : "post yours"}</button>.
            </section>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((a) => <AdCard key={a.id} ad={a} />)}
          </div>
          {next !== null && <button type="button" className="btn btn-ghost w-full" disabled={loading} onClick={() => void load(filters, next)}>{loading ? "…" : ru ? "Показать ещё" : "Show more"}</button>}
        </>
      )}

      {tab === "new" && (!token ? guest : !me ? needProfile : (
        <AdForm token={token} onSaved={() => { setTab("mine"); void load(filters, 0); }} />
      ))}

      {tab === "mine" && (!token ? guest : !me ? needProfile : edit ? (
        <AdForm token={token} initial={edit} onSaved={() => { setEdit(null); loadMine(); void load(filters, 0); }} onCancel={() => setEdit(null)} />
      ) : (
        <div className="space-y-3">
          {mine.length === 0 && <section className="card text-sm text-center opacity-80">{ru ? "У вас пока нет объявлений." : "You have no ads yet."}</section>}
          {mine.map((a) => (
            <section key={a.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{KIND_LABEL[a.kind][ru ? 0 : 1]}</span>
                <Link href={`/ads/item/?id=${a.id}`} className="font-semibold hover:underline break-words">{a.title}</Link>
                <span className="ml-auto font-bold">{fmtPrice(a, ru)}</span>
              </div>
              <div className="text-xs opacity-70">{status(a)} · 👁 {a.views ?? 0}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !py-1.5" onClick={() => setEdit(a)}>{ru ? "Изменить" : "Edit"}</button>
                {(a.canRenew || a.expired) && <button type="button" className="btn btn-primary !py-1.5" onClick={() => void doRenew(a)}>{ru ? "Продлить на 30 дней" : "Renew for 30 days"}</button>}
                <button type="button" className="btn btn-danger !py-1.5" onClick={() => void doDelete(a)}>{ru ? "Удалить" : "Delete"}</button>
              </div>
            </section>
          ))}
        </div>
      ))}

      <section className="space-y-3" aria-label={c.kindsH}>
        <h2 className="text-lg font-bold text-center">{c.kindsH}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KINDS.map((k) => (
            <button key={k} type="button" className="card text-start hover:opacity-90" onClick={() => { setTab("list"); apply({ ...EMPTY, kind: k }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <h3 className="font-semibold">{c.kinds[k][0]}</h3>
              <p className="text-sm opacity-85">{c.kinds[k][1]}</p>
            </button>
          ))}
        </div>
      </section>

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
        <p className="text-xs opacity-70"><Link href={ROUTES.terms} className="underline">{ru ? "Условия использования" : "Terms of use"}</Link></p>
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

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Avatar, { mediaUrl } from "@/components/Avatar";
import CallButton from "@/components/CallButton";
import ShareMenu from "@/components/ShareMenu";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { ROUTES, absoluteUrl, profileUrl } from "@/lib/urls";
import { KIND_LABEL, adsError, fmtPrice, getAd, reportAd, type Ad } from "@/lib/classifieds";

/** Страница одного объявления: /ads/item/?id=123. Фото, цена, описание, продавец, чат, звонок, жалоба */
export default function AdItemPage() {
  const { lang, toast } = useApp();
  const { token } = useSocial();
  const ru = lang === "ru";
  const [id, setId] = useState(0);
  const [ad, setAd] = useState<Ad | null>(null);
  const [own, setOwn] = useState(false);
  const [state, setState] = useState<"load" | "ok" | "gone">("load");
  const [i, setI] = useState(0);

  useEffect(() => { setId(Math.floor(Number(new URLSearchParams(window.location.search).get("id"))) || 0); }, []);
  useEffect(() => {
    if (!id) { if (typeof window !== "undefined" && window.location.search !== "") setState("gone"); return; }
    setState("load");
    getAd(id, token).then((r) => { setAd(r.item); setOwn(r.mine); setState("ok"); }).catch(() => setState("gone"));
  }, [id, token]);

  // название вкладки и микроразметка товара/вакансии для поисковиков
  useEffect(() => {
    if (!ad) return;
    document.title = `${ad.title} — ${[ad.city, ad.country].filter(Boolean).join(", ")} | Chess Bet`;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    const url = absoluteUrl(`/ads/item/?id=${ad.id}`);
    const place = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: ad.city, addressCountry: ad.country } };
    el.text = JSON.stringify(ad.kind === "job"
      ? { "@context": "https://schema.org", "@type": "JobPosting", title: ad.title, description: ad.body, datePosted: new Date(ad.created).toISOString(), validThrough: new Date(ad.expires).toISOString(), jobLocation: place, hiringOrganization: { "@type": "Organization", name: `@${ad.seller.name}` }, url }
      : { "@context": "https://schema.org", "@type": "Product", name: ad.title, description: ad.body, url, image: ad.photos.map((p) => mediaUrl(p)).filter(Boolean),
          ...(ad.price !== null ? { offers: { "@type": "Offer", price: ad.price, priceCurrency: ad.currency || undefined, availability: "https://schema.org/InStock", url } } : {}) }
    ).replace(/</g, "\\u003c");
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [ad]);

  const report = async () => {
    if (!ad || !window.confirm(ru ? "Пожаловаться на это объявление?" : "Report this ad?")) return;
    try { await reportAd(token, ad.id); toast(ru ? "Жалоба отправлена" : "Report sent", "ok"); }
    catch (e) { toast(adsError((e as Error).message, ru), "err"); }
  };

  const crumbs = (
    <nav aria-label="Breadcrumb" className="text-xs opacity-70">
      <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <Link href="/ads/" className="underline">{ru ? "Объявления" : "Classifieds"}</Link>
      {ad && <> › <span>{KIND_LABEL[ad.kind][ru ? 0 : 1]}</span></>}
    </nav>
  );

  if (state === "load") return <PageShell title={ru ? "Объявление" : "Ad"} intro="">{crumbs}<section className="card text-center opacity-70">…</section></PageShell>;
  if (state === "gone" || !ad) {
    return (
      <PageShell title={ru ? "Объявление недоступно" : "Ad not available"} intro="">
        {crumbs}
        <section className="card space-y-2 text-center">
          <p className="text-sm">{ru ? "Объявление удалено, скрыто или срок его размещения истёк." : "This ad was removed, hidden or has expired."}</p>
          <Link href="/ads/" className="btn btn-primary !py-2 inline-block">{ru ? "Все объявления" : "All ads"}</Link>
        </section>
      </PageShell>
    );
  }

  const photos = ad.photos.filter((p) => mediaUrl(p));
  const cur = photos[Math.min(i, photos.length - 1)];
  const place = [ad.city, ad.country].filter(Boolean).join(", ");

  return (
    <PageShell title={ad.title} intro="">
      {crumbs}
      <article className="card !p-0 overflow-hidden">
        <div className="relative aspect-[4/3] bg-black/10 flex items-center justify-center">
          {cur ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(cur)} alt={ad.title} className="absolute inset-0 w-full h-full object-contain" />
          ) : <span className="text-5xl opacity-30" aria-hidden>🛍</span>}
          {ad.pinned && <span className="chip chip-on absolute top-2 left-2">📌 {ru ? "Вверху" : "Top"}</span>}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 p-2 overflow-x-auto">
            {photos.map((p, k) => (
              <button key={p} type="button" onClick={() => setI(k)} aria-label={`${ru ? "Фото" : "Photo"} ${k + 1}`}
                className={"relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 " + (k === i ? "border-amber-400" : "border-transparent opacity-70")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(p)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{KIND_LABEL[ad.kind][ru ? 0 : 1]}</span>
            {place && <span className="text-sm opacity-80">📍 {place}</span>}
            <span className="ml-auto text-xs opacity-60">{new Date(ad.created).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          <div className="text-2xl font-extrabold">{fmtPrice(ad, ru)}</div>
          <p className="whitespace-pre-line break-words text-sm">{ad.body}</p>
          <div className="text-xs opacity-60">👁 {ad.views ?? 0}</div>
        </div>
      </article>

      <section className="card flex flex-col gap-3" aria-label={ru ? "Продавец" : "Seller"}>
        <div className="flex items-center gap-3">
          <Avatar name={ad.seller.name} src={ad.seller.avatar} size={48} />
          <div className="min-w-0">
            <Link href={profileUrl(ad.seller.name)} className="font-bold hover:underline">@{ad.seller.name}</Link>
            <div className="text-xs opacity-70">{ru ? "Уровень" : "Level"} {ad.seller.level}</div>
          </div>
          <div className="ml-auto"><ShareMenu url={absoluteUrl(`/ads/item/?id=${ad.id}`)} text={ad.title} label={ru ? "Поделиться" : "Share"} className="btn btn-ghost !py-2" /></div>
        </div>
        {own ? (
          <Link href="/ads/" className="btn btn-primary !py-2 text-center">{ru ? "Это ваше объявление: управлять в «Мои объявления»" : "This is your ad: manage it in My ads"}</Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href={`${ROUTES.messages}?with=${encodeURIComponent(ad.seller.name)}`} className="btn btn-primary !py-2">✉ {ru ? "Написать продавцу" : "Message the seller"}</Link>
            <CallButton name={ad.seller.name} className="!py-2" />
            <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => void report()} disabled={!token}>⚑ {ru ? "Пожаловаться" : "Report"}</button>
          </div>
        )}
        <p className="text-xs opacity-70">{ru ? "Не переводите предоплату незнакомым людям и не сообщайте данные кошелька. Сайт не участвует в расчётах между людьми." : "Never prepay strangers or share wallet details. The site is not a party to payments between people."}</p>
      </section>
    </PageShell>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { useTranslated } from "@/lib/adTranslate";
import { KIND_LABEL, fmtPrice, type Ad } from "@/lib/classifieds";
import Avatar, { mediaUrl } from "./Avatar";

/** Карточка объявления в списке: фото, цена, заголовок, место, продавец. Нажатие открывает объявление */
export default function AdCard({ ad }: { ad: Ad }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const photo = ad.photos.find((p) => mediaUrl(p));
  const place = [ad.city, ad.country].filter(Boolean).join(", ");
  // переводим название и место на язык сайта, только когда карточка попала на экран (экономим лимит переводчика)
  const { token } = useSocial();
  const ref = useRef<HTMLAnchorElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const tx = useTranslated({ title: ad.title, place }, token, lang, seen);
  const date = new Date(ad.created).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });

  return (
    <Link ref={ref} href={`/ads/item/?id=${ad.id}`} className="card !p-0 overflow-hidden flex flex-col hover:opacity-95" style={ad.pinned ? { borderColor: "#f5b301" } : undefined}>
      <div className="relative aspect-[4/3] bg-black/10 flex items-center justify-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(photo)} alt={ad.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-30" aria-hidden>🛍</span>
        )}
        {ad.pinned && <span className="chip chip-on absolute top-2 left-2">📌 {ru ? "Вверху" : "Top"}</span>}
        {ad.photos.length > 1 && <span className="chip absolute bottom-2 right-2">📷 {ad.photos.length}</span>}
      </div>
      <div className="p-3 flex flex-col gap-1.5 grow">
        <div className="font-bold text-lg">{fmtPrice(ad, ru)}</div>
        <h3 className="font-semibold leading-snug break-words">{tx.out.title}</h3>
        {ad.preview && <p className="text-sm opacity-70 line-clamp-2 break-words">{ad.preview}</p>}
        <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-80">
          <span className="chip">{KIND_LABEL[ad.kind][ru ? 0 : 1]}</span>
          {tx.out.place && <span>📍 {tx.out.place}</span>}
          <span className="ml-auto">{date}</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Avatar name={ad.seller.name} src={ad.seller.avatar} size={20} />
          <span>@{ad.seller.name}</span>
          <span className="chip ml-auto">{ru ? "Ур." : "Lvl"} {ad.seller.level}</span>
        </div>
      </div>
    </Link>
  );
}

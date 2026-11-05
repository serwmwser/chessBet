"use client";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";

/** Главная: карточка международной доски объявлений с переводом чата */
export default function AdsPromo() {
  const { lang } = useApp();
  const ru = lang === "ru";
  return (
    <section className="card space-y-2" aria-labelledby="ads-promo-h">
      <h2 id="ads-promo-h" className="text-lg font-bold">🌍 {ru ? "Доска объявлений с переводом чата" : "Classifieds with chat translation"}</h2>
      <p className="text-sm opacity-85">
        {ru
          ? "Продавайте, покупайте, сдавайте и ищите работу в любой стране и городе. Объявления и сообщения в чате переводятся на ваш язык одним нажатием. Первое объявление бесплатно."
          : "Sell, buy, rent and find work in any country and city. Ads and chat messages translate into your language with one tap. Your first ad is free."}
      </p>
      <Link href={ROUTES.ads} className="btn btn-primary !py-2 inline-flex">{ru ? "Открыть объявления" : "Browse classifieds"}</Link>
    </section>
  );
}

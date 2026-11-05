"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { BODY_MAX, KINDS, KIND_LABEL, MAX_PHOTOS, TITLE_MAX, adPlaces, adsPrices, saveAd, type Ad, type Kind, type Place } from "@/lib/classifieds";
import { uploadImage } from "./PostComposer";
import { mediaUrl } from "./Avatar";
import { payError, useAdPay } from "@/lib/adpay";

const CURRENCIES = ["USD", "EUR", "USDC", "RUB", "GBP", "PLN", "UAH", "KZT", "TRY", "AED"];

/** Форма подачи и редактирования объявления: раздел, заголовок, цена, место, описание, до 5 фото */
export default function AdForm({ token, initial, onSaved, onCancel }: {
  token: string; initial?: Ad | null; onSaved: (id: number) => void; onCancel?: () => void;
}) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const payAndCall = useAdPay();
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "sale");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [price, setPrice] = useState(initial?.price === null || initial?.price === undefined ? "" : String(initial.price));
  const [currency, setCurrency] = useState(initial?.currency || "USD");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { adPlaces().then(setPlaces).catch(() => {}); }, []);
  const cities = places.find((p) => p.country.toLowerCase() === country.trim().toLowerCase())?.cities ?? [];

  const add = async (f?: File) => {
    if (!f || photos.length >= MAX_PHOTOS) return;
    setUp(true);
    try { const p = await uploadImage(token, f); setPhotos((a) => [...a, p].slice(0, MAX_PHOTOS)); }
    catch (e) { toast((e as Error).message === "too_big" ? (ru ? "Фото слишком большое" : "Photo is too large") : (ru ? "Не удалось загрузить фото" : "Could not upload the photo"), "err"); }
    setUp(false);
    if (file.current) file.current.value = "";
  };

  const save = async () => {
    setBusy(true);
    try {
      const input = {
        id: initial?.id, kind, title, body, country, city, photos,
        price: price.trim() === "" ? null : Number(price.replace(",", ".")), currency: price.trim() === "" ? "" : currency,
      };
      let r: { id: number };
      try { r = await saveAd(token, input); }
      catch (e) {
        if (initial || (e as Error).message !== "payment_required") throw e;
        // бесплатные объявления закончились: предлагаем оплатить размещение
        const pr = await adsPrices();
        if (!pr.enabled) throw e;
        const cost = pr.post / 1e6;
        if (!window.confirm(ru ? `Бесплатные объявления закончились. Опубликовать за ${cost} USDC на 30 дней? Откроется кошелёк для перевода USDC.` : `Your free ads are used up. Publish for ${cost} USDC for 30 days? Your wallet will open to send the USDC.`)) { setBusy(false); return; }
        r = await payAndCall("post", 0, (tx) => saveAd(token, input, tx));
      }
      toast(initial ? (ru ? "Объявление сохранено" : "Ad saved") : (ru ? "Объявление опубликовано" : "Ad published"), "ok");
      onSaved(initial?.id ?? r.id);
    } catch (e) { toast(payError(e, ru), "err"); }
    setBusy(false);
  };

  const seg = (on: boolean) => `chip ${on ? "chip-on" : ""}`;
  const inp = "w-full rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-sm outline-none focus:ring-2 ring-emerald-500";

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div>
        <div className="font-bold mb-2">{ru ? "Раздел" : "Category"}</div>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => <button key={k} type="button" className={seg(kind === k)} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k][ru ? 0 : 1]}</button>)}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">{ru ? "Заголовок" : "Title"}
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))} className={inp} placeholder={ru ? "Например: Горный велосипед, как новый" : "E.g. Mountain bike, like new"} />
        <span className="text-xs opacity-60 text-right">{title.length}/{TITLE_MAX}</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">{ru ? "Цена (пусто — договорная)" : "Price (empty = negotiable)"}
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, "").slice(0, 14))} inputMode="decimal" placeholder="0" className={inp} />
        </label>
        <label className="flex flex-col gap-1 text-sm">{ru ? "Валюта" : "Currency"}
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp} disabled={price.trim() === ""}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">{ru ? "Страна" : "Country"}
          <input value={country} onChange={(e) => setCountry(e.target.value.slice(0, 40))} list="ads-countries" className={inp} placeholder={ru ? "Польша" : "Poland"} />
          <datalist id="ads-countries">{places.map((p) => <option key={p.slug} value={p.country} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">{ru ? "Город" : "City"}
          <input value={city} onChange={(e) => setCity(e.target.value.slice(0, 40))} list="ads-cities" className={inp} placeholder={ru ? "Варшава" : "Warsaw"} />
          <datalist id="ads-cities">{cities.map((c) => <option key={c.slug} value={c.city} />)}</datalist>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">{ru ? "Описание" : "Description"}
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))} rows={6} className={inp}
          placeholder={ru ? "Состояние, условия, как пользоваться. Без ссылок, телефонов и контактов: общение в чате сайта." : "Condition, terms, details. No links, phones or contacts: use the site chat."} />
        <span className="text-xs opacity-60 text-right">{body.length}/{BODY_MAX}</span>
      </label>

      <div>
        <div className="font-bold mb-2">{ru ? `Фото (до ${MAX_PHOTOS})` : `Photos (up to ${MAX_PHOTOS})`}</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((p, k) => (
            <div key={p} className="relative aspect-square rounded-xl overflow-hidden border border-black/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(p)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button type="button" onClick={() => setPhotos((a) => a.filter((_, j) => j !== k))} aria-label={ru ? "Убрать фото" : "Remove photo"}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white">✕</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" disabled={up} onClick={() => file.current?.click()} className="btn btn-ghost aspect-square">{up ? "…" : "＋"}</button>
          )}
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => add(e.target.files?.[0])} />
      </div>

      <p className="text-xs opacity-70">
        {ru ? "Первое объявление бесплатно, и ещё по одному бесплатному за каждого приглашённого друга, который начал пользоваться сайтом. Дальше размещение платное: 1 USDC за 30 дней (перевод USDC из кошелька при публикации). Объявление живёт 30 дней, до 10 активных. Запрещены мошенничество, запрещённые товары и просьбы перевести деньги вне сайта. Нарушения ведут к блокировке."
          : "Your first ad is free, plus one more free ad for every invited friend who starts using the site. After that, posting costs 1 USDC for 30 days (paid in USDC from your wallet when you publish). An ad lives 30 days, up to 10 active ads. Fraud, prohibited goods and requests to pay outside the site are banned and lead to a block."}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || up} className="btn btn-primary">{busy ? "…" : initial ? (ru ? "Сохранить" : "Save") : ru ? "Опубликовать" : "Publish"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-ghost">{ru ? "Отмена" : "Cancel"}</button>}
      </div>
    </div>
  );
}

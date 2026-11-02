"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { ABOUT_MAX, datingError, deleteDating, saveDating, type Gender, type MyProfile, type Seeking } from "@/lib/dating";
import { uploadImage } from "./PostComposer";
import { mediaUrl } from "./Avatar";

/** Анкета: пол, кого ищу, год рождения, страна, «О себе» и до 3 фото. Подтверждение 18+ обязательно */
export default function DatingProfileForm({ token, initial, onSaved, onDeleted }: {
  token: string; initial: MyProfile | null; onSaved: (p: MyProfile) => void; onDeleted: () => void;
}) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [gender, setGender] = useState<Gender | "">(initial?.gender ?? "");
  const [seeking, setSeeking] = useState<Seeking>(initial?.seeking ?? "any");
  const [birth, setBirth] = useState(initial ? String(initial.birth) : "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [adult, setAdult] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const add = async (f?: File) => {
    if (!f || photos.length >= 3) return;
    setUp(true);
    try { const p = await uploadImage(token, f); setPhotos((a) => [...a, p].slice(0, 3)); }
    catch (e) { toast((e as Error).message === "too_big" ? (ru ? "Фото слишком большое" : "Photo is too large") : (ru ? "Не удалось загрузить фото" : "Could not upload the photo"), "err"); }
    setUp(false);
    if (file.current) file.current.value = "";
  };

  const save = async () => {
    if (!gender) return toast(datingError("gender", ru), "err");
    if (!adult) return toast(datingError("adult_only", ru), "err");
    setBusy(true);
    try {
      const r = await saveDating(token, { enabled, gender, seeking, birth: Number(birth), country, about, photos, adult });
      onSaved(r.profile);
      toast(ru ? "Анкета сохранена" : "Profile saved", "ok");
    } catch (e) { toast(datingError((e as Error).message, ru), "err"); }
    setBusy(false);
  };

  const remove = async () => {
    if (!window.confirm(ru ? "Удалить анкету и все лайки? Это нельзя отменить." : "Delete your profile and all likes? This cannot be undone.")) return;
    try { await deleteDating(token); onDeleted(); toast(ru ? "Анкета удалена" : "Profile deleted", "ok"); }
    catch (e) { toast(datingError((e as Error).message, ru), "err"); }
  };

  const seg = (on: boolean) => `chip ${on ? "chip-on" : ""}`;
  const inp = "w-full rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-sm outline-none focus:ring-2 ring-emerald-500";

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div>
        <div className="font-bold mb-2">{ru ? "Фото (до 3)" : "Photos (up to 3)"}</div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((k) => {
            const p = photos[k];
            return (
              <div key={k} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-black/10 bg-black/20 flex items-center justify-center">
                {p ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos((a) => a.filter((_, j) => j !== k))} aria-label={ru ? "Убрать фото" : "Remove photo"}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white">✕</button>
                  </>
                ) : k === photos.length ? (
                  <button type="button" disabled={up} onClick={() => file.current?.click()} className="btn btn-ghost">{up ? "…" : "＋"}</button>
                ) : <span className="opacity-30 text-2xl">▫</span>}
              </div>
            );
          })}
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => add(e.target.files?.[0])} />
        <p className="text-xs opacity-60 mt-1">{ru ? "Только ваши фото. Чужие снимки и запрещённый контент — бан." : "Your own photos only. Stolen photos or banned content lead to a ban."}</p>
      </div>

      <div>
        <div className="font-bold mb-2">{ru ? "Я" : "I am"}</div>
        <div className="flex gap-2">
          <button type="button" className={seg(gender === "m")} onClick={() => setGender("m")}>{ru ? "Мужчина" : "Man"}</button>
          <button type="button" className={seg(gender === "f")} onClick={() => setGender("f")}>{ru ? "Женщина" : "Woman"}</button>
        </div>
      </div>

      <div>
        <div className="font-bold mb-2">{ru ? "Ищу" : "Looking for"}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={seg(seeking === "f")} onClick={() => setSeeking("f")}>{ru ? "Женщину" : "A woman"}</button>
          <button type="button" className={seg(seeking === "m")} onClick={() => setSeeking("m")}>{ru ? "Мужчину" : "A man"}</button>
          <button type="button" className={seg(seeking === "any")} onClick={() => setSeeking("any")}>{ru ? "Не важно" : "Anyone"}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">{ru ? "Год рождения" : "Birth year"}
          <input value={birth} onChange={(e) => setBirth(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1995" className={inp} />
        </label>
        <label className="flex flex-col gap-1 text-sm">{ru ? "Страна / город" : "Country / city"}
          <input value={country} onChange={(e) => setCountry(e.target.value.slice(0, 40))} placeholder={ru ? "Россия" : "Germany"} className={inp} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">{ru ? "О себе" : "About me"}
        <textarea value={about} onChange={(e) => setAbout(e.target.value.slice(0, ABOUT_MAX))} rows={4} className={inp}
          placeholder={ru ? "Увлечения, любимые дебюты, что ищете. Без ссылок и контактов." : "Hobbies, favourite openings, what you look for. No links or contacts."} />
        <span className="text-xs opacity-60 text-right">{about.length}/{ABOUT_MAX}</span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />
        <span>{ru ? "Мне есть 18 лет, я принимаю правила знакомств и понимаю, что нельзя переводить деньги и раскрывать данные кошелька малознакомым людям." : "I am 18 or older, accept the dating rules, and understand I must never send money or share wallet details with people I barely know."}</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {ru ? "Показывать мою анкету в ленте" : "Show my profile in the feed"}
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || up} className="btn btn-primary">{busy ? "…" : ru ? "Сохранить анкету" : "Save profile"}</button>
        {initial && <button type="button" onClick={remove} className="btn btn-danger">{ru ? "Удалить анкету" : "Delete profile"}</button>}
      </div>
    </div>
  );
}

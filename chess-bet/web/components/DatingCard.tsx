"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { ROUTES, profileUrl } from "@/lib/urls";
import { datingError, likeDating, type DCard } from "@/lib/dating";
import Avatar, { mediaUrl } from "./Avatar";
import ReportButton from "./ReportButton";

/** Карточка анкеты: галерея из 3 фото, возраст, страна, уровень, «О себе», лайк, сообщение, жалоба */
export default function DatingCard({ card, token, onChange }: { card: DCard; token: string; onChange?: (c: DCard) => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [c, setC] = useState(card);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const photos = c.photos.filter((p) => mediaUrl(p));
  const cur = photos[Math.min(i, photos.length - 1)];

  const like = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await likeDating(token, c.name, !c.liked);
      const n = { ...c, liked: r.liked, match: r.match };
      setC(n); onChange?.(n);
      if (r.match) toast(ru ? `Совпадение с @${c.name}! Теперь можно написать 💞` : `It's a match with @${c.name}! You can message now 💞`, "ok");
    } catch (e) { toast(datingError((e as Error).message, ru), "err"); }
    setBusy(false);
  };

  return (
    <article className="card !p-0 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/5] bg-black/20">
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(cur)} alt={ru ? `Фото ${c.name}` : `${c.name}'s photo`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Avatar name={c.name} src={c.avatar} size={96} /></div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`${ru ? "Фото" : "Photo"} ${k + 1}`}
                className="w-2.5 h-2.5 rounded-full border border-white/70" style={{ background: k === i ? "#f5d36b" : "rgba(0,0,0,.45)" }} />
            ))}
          </div>
        )}
        {c.likesMe && !c.match && <span className="chip absolute top-2 left-2">{ru ? "💛 Вы ей/ему нравитесь" : "💛 Likes you"}</span>}
        {c.match && <span className="chip absolute top-2 left-2">💞 {ru ? "Совпадение" : "Match"}</span>}
      </div>
      <div className="p-3 flex flex-col gap-2 grow">
        <div className="flex items-center gap-2">
          <Avatar name={c.name} src={c.avatar} size={28} />
          <Link href={profileUrl(c.name)} className="font-bold hover:underline">@{c.name}</Link>
          <span className="opacity-80">· {c.age}</span>
          <span className="chip ml-auto">{ru ? "Ур." : "Lvl"} {c.level}</span>
        </div>
        {c.country && <div className="text-sm opacity-70">📍 {c.country}</div>}
        {c.about && <p className="text-sm whitespace-pre-line break-words">{c.about}</p>}
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          <button type="button" onClick={like} disabled={busy} className={c.liked ? "btn btn-primary" : "btn btn-ghost"} aria-pressed={c.liked}>
            {c.liked ? "♥" : "♡"} {c.liked ? (ru ? "Нравится" : "Liked") : (ru ? "Нравится?" : "Like")}
          </button>
          <Link href={`${ROUTES.messages}?with=${encodeURIComponent(c.name)}`} className="btn btn-ghost">✉️ {ru ? "Написать" : "Message"}</Link>
        </div>
        <ReportButton kind="user" name={c.name} token={token} />
      </div>
    </article>
  );
}

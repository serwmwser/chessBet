"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { findPeople, LANGS } from "@/lib/social";
import { ROUTES, profileUrl } from "@/lib/urls";
import Avatar from "./Avatar";

type P = { name: string; avatar: string; bio: string; langs?: string[] };

/** HiMeet people: поиск собеседников по языку и началу ника */
export default function PeopleSearch({ me }: { me?: string }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [q, setQ] = useState("");
  const [lg, setLg] = useState("");
  const [list, setList] = useState<P[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let stop = false;
    setErr(false);
    const id = setTimeout(() => {
      findPeople(q.trim(), lg).then((r) => { if (!stop) setList(r); }).catch(() => { if (!stop) { setErr(true); setList([]); } });
    }, 300);
    return () => { stop = true; clearTimeout(id); };
  }, [q, lg]);

  const nameOf = (c: string) => LANGS.find((l) => l[0] === c)?.[ru ? 1 : 2] ?? c;
  const shown = (list ?? []).filter((p) => p.name !== me);
  return (
    <section className="card space-y-3">
      <h3 className="font-bold">🌍 {ru ? "Найти собеседника" : "Find someone to talk to"}</h3>
      <p className="text-xs opacity-70">{ru ? "Выберите язык: чат сам переведёт сообщения, так что писать можно на своём." : "Pick a language: the chat translates messages, so you can write in your own."}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={"chip " + (lg === "" ? "chip-on" : "")} aria-pressed={lg === ""} onClick={() => setLg("")}>{ru ? "Все языки" : "All languages"}</button>
        {LANGS.map(([code, nameRu, nameEn]) => (
          <button key={code} type="button" className={"chip " + (lg === code ? "chip-on" : "")} aria-pressed={lg === code} onClick={() => setLg(lg === code ? "" : code)}>{ru ? nameRu : nameEn}</button>
        ))}
      </div>
      <input className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm" dir="ltr" maxLength={20} autoCapitalize="none" autoCorrect="off"
        placeholder={ru ? "Ник (начало)" : "Name (starts with)"} value={q} onChange={(e) => setQ(e.target.value)} />
      {list === null ? <div className="skeleton h-20" /> : shown.length === 0 ? (
        <p className="text-sm opacity-70">{err ? (ru ? "Не удалось загрузить. Попробуйте позже." : "Could not load. Try again later.") : ru ? "Пока никого не нашлось. Попробуйте другой язык." : "Nobody found yet. Try another language."}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <Avatar name={p.name} src={p.avatar} size={44} />
              <div className="min-w-0 flex-1">
                <a href={profileUrl(p.name)} className="font-bold hover:underline">@{p.name}</a>
                {!!p.langs?.length && <div className="text-xs opacity-75">🗣 {p.langs.map(nameOf).join(", ")}</div>}
                {p.bio && <div className="text-xs opacity-60 truncate">{p.bio}</div>}
              </div>
              <a href={`${ROUTES.profile}?tab=chat&with=${encodeURIComponent(p.name)}`} className="btn btn-primary !py-1.5 text-sm shrink-0">{ru ? "Написать" : "Message"}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

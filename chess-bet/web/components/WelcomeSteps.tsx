"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { errText, findPeople, INTERESTS, LANGS, saveProfile, useSocial } from "@/lib/social";
import { ROUTES } from "@/lib/urls";
import Avatar from "./Avatar";
import OnlineDot from "./OnlineDot";

type P = { name: string; avatar: string; bio: string; langs?: string[]; presence?: number };
const tog = (a: string[], c: string) => (a.includes(c) ? a.filter((x) => x !== c) : a.length >= 8 ? a : [...a, c]);

/** HiMeet welcome: три шага после входа. 1) языки, 2) интересы, 3) первый собеседник. */
export default function WelcomeSteps({ onClose }: { onClose: () => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const s = useSocial();
  const [step, setStep] = useState(1);
  const [langs, setLangs] = useState<string[]>([]);
  const [ints, setInts] = useState<string[]>([]);
  const [people, setPeople] = useState<P[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (s.me && !filled) {
      setFilled(true);
      setLangs(s.me.langs?.length ? s.me.langs : [ru ? "ru" : "en"]);
      setInts(s.me.interests ?? []);
    }
  }, [s.me, filled, ru]);

  const saveAndFind = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (s.token) await saveProfile(s.token, { langs, interests: ints });
      const lists = await Promise.all((langs.length ? langs.slice(0, 3) : [""]).map((l) => findPeople("", l).catch(() => [] as P[])));
      const seen = new Set<string>();
      const all: P[] = [];
      for (const l of lists) for (const p of l) if (p.name !== s.me?.name && !seen.has(p.name)) { seen.add(p.name); all.push(p); }
      all.sort((a, b) => (b.presence ?? 0) - (a.presence ?? 0));
      setPeople(all.slice(0, 5));
      setStep(3);
    } catch (e) { setErr(errText(e, ru)); }
    finally { setBusy(false); }
  };

  const nameOf = (c: string) => LANGS.find((l) => l[0] === c)?.[ru ? 1 : 2] ?? c;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(60,20,80,.45)" }} role="dialog" aria-modal="true" aria-label="HiMeet">
      <div className="card w-full max-w-md space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= step ? "linear-gradient(90deg,#ff5c93,#a855f7)" : "rgba(127,127,127,.25)" }} />)}
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs font-semibold opacity-60">{ru ? `Шаг ${step} из 3` : `Step ${step} of 3`}</div>
          <h2 className="text-xl font-extrabold">
            {step === 1 ? (ru ? "На каких языках вы общаетесь?" : "Which languages do you speak?")
              : step === 2 ? (ru ? "Что вам интересно?" : "What are you into?")
              : ru ? "Ваш первый собеседник" : "Your first conversation"}
          </h2>
          <p className="text-sm opacity-80">
            {step === 1 ? (ru ? "Выберите до 8. Так вас найдут люди, которые говорят на этих языках." : "Pick up to 8. People who speak them will be able to find you.")
              : step === 2 ? (ru ? "Выберите до 8 интересов: так проще найти тему для разговора." : "Pick up to 8 interests: it is easier to find something to talk about.")
              : ru ? "Эти люди говорят на выбранных вами языках. Напишите им: чат сам переведёт сообщения." : "These people speak the languages you picked. Say hello: the chat translates messages for you."}
          </p>
        </div>

        {step === 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {LANGS.map(([code, nameRu, nameEn]) => (
              <button key={code} type="button" className={"chip " + (langs.includes(code) ? "chip-on" : "")} aria-pressed={langs.includes(code)} onClick={() => setLangs((a) => tog(a, code))}>{ru ? nameRu : nameEn}</button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-wrap justify-center gap-2">
            {INTERESTS.map(([code, emoji, nameRu, nameEn]) => (
              <button key={code} type="button" className={"chip " + (ints.includes(code) ? "chip-on" : "")} aria-pressed={ints.includes(code)} onClick={() => setInts((a) => tog(a, code))}>{emoji} {ru ? nameRu : nameEn}</button>
            ))}
          </div>
        )}
        {step === 3 && (
          people === null ? <div className="skeleton h-20" /> : people.length === 0 ? (
            <p className="text-sm text-center opacity-80">{ru ? "Пока никого с этими языками. Загляните в раздел «Люди» чуть позже или пригласите друга." : "Nobody with these languages yet. Check the People tab a bit later or invite a friend."}</p>
          ) : (
            <ul className="space-y-2">
              {people.map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <Avatar name={p.name} src={p.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2"><b>@{p.name}</b><OnlineDot presence={p.presence} ru={ru} /></div>
                    {!!p.langs?.length && <div className="text-xs opacity-75 truncate">🗣 {p.langs.map(nameOf).join(", ")}</div>}
                  </div>
                  <a href={`${ROUTES.profile}?tab=chat&with=${encodeURIComponent(p.name)}`} onClick={onClose} className="btn btn-primary !py-1 !px-2.5 !text-xs shrink-0">{ru ? "Написать" : "Message"}</a>
                </li>
              ))}
            </ul>
          )
        )}
        {err && <p className="text-sm text-center" style={{ color: "#e0245e" }}>{err}</p>}

        <div className="flex gap-2">
          {step === 1 && (<>
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>{ru ? "Позже" : "Later"}</button>
            <button type="button" className="btn btn-primary flex-1" disabled={!langs.length} onClick={() => setStep(2)}>{ru ? "Дальше" : "Next"}</button>
          </>)}
          {step === 2 && (<>
            <button type="button" className="btn btn-ghost flex-1" onClick={() => setStep(1)}>{ru ? "Назад" : "Back"}</button>
            <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={saveAndFind}>{busy ? "…" : ru ? "Дальше" : "Next"}</button>
          </>)}
          {step === 3 && (<>
            <a href={`${ROUTES.profile}?tab=people`} onClick={onClose} className="btn btn-ghost flex-1 text-center">{ru ? "Все люди" : "All people"}</a>
            <button type="button" className="btn btn-primary flex-1" onClick={onClose}>{ru ? "Готово" : "Done"}</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

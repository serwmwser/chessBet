"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LoginPrompt from "./LoginPrompt";
import { useApp } from "@/lib/ctx";
import { API_URL } from "@/lib/config";
import { ROUTES } from "@/lib/urls";

type Row = { id: string; micro: number; secs: number; created: number; peer: string };
type Data = {
  balance: number; today: { secs: number; micro: number }; log: Row[];
  rules: { perHourEach: number; minSecs: number; userDaySecs: number; pairDaySecs: number };
};

/** 1 микро = 0,000001 TCH */
const fmt = (micro: number) => (micro / 1e6).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
const mins = (secs: number) => Math.floor(secs / 60);

/** Раздел «TCH» в профиле: баллы за звонки. Баллы хранятся на сайте, вывод на кошелёк появится позже. */
export default function TchPanel({ token }: { token: string }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!token) return;
    const [wallet, tok] = token.split("|");
    let alive = true;
    fetch(`${API_URL}/api/tch/me`, { cache: "no-store", headers: { authorization: `Bearer ${tok}`, "x-wallet": wallet } })
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (j.ok) setD(j as Data); else setErr(true); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [token]);

  if (!token) return <LoginPrompt text={ru ? "Чтобы видеть баллы TCH, войдите на сайт." : "Sign in to see your TCH points."} />;
  if (err) return <p className="card text-center opacity-70">{ru ? "Не удалось загрузить баллы. Попробуйте позже." : "Could not load points. Please try again later."}</p>;
  if (!d) return <p className="text-center opacity-60">…</p>;

  const r = d.rules;
  return (
    <div className="space-y-3">
      <section className="card text-center space-y-1">
        <div className="text-sm opacity-70">{ru ? "Ваши баллы TCH" : "Your TCH points"}</div>
        <div className="text-4xl font-extrabold" style={{ color: "#d4a017" }}>{fmt(d.balance)}</div>
        <div className="text-xs opacity-70">
          {ru ? `За последние 24 часа: +${fmt(d.today.micro)} TCH, ${mins(d.today.secs)} мин разговоров` : `Last 24 hours: +${fmt(d.today.micro)} TCH, ${mins(d.today.secs)} min of calls`}
        </div>
      </section>

      <section className="card space-y-2 text-sm">
        <h2 className="font-bold">{ru ? "Как это работает" : "How it works"}</h2>
        <ul className="list-disc ps-5 space-y-1 opacity-90">
          <li>{ru ? `За разговор из профиля вы получаете ${fmt(r.perHourEach)} TCH за каждый час (собеседник столько же).` : `Each hour of a call earns you ${fmt(r.perHourEach)} TCH (your partner gets the same).`}</li>
          <li>{ru ? `Считаются звонки от ${mins(r.minSecs)} мин; не больше ${mins(r.userDaySecs) / 60} ч в сутки на человека и ${mins(r.pairDaySecs) / 60} ч в сутки с одним собеседником.` : `Calls of at least ${mins(r.minSecs)} min count; up to ${mins(r.userDaySecs) / 60} h per day per person and ${mins(r.pairDaySecs) / 60} h per day with one partner.`}</li>
          <li>{ru ? "Профиль должен существовать минимум сутки. Звонки между собственными аккаунтами не начисляются." : "Your profile must be at least a day old. Calls between your own accounts earn nothing."}</li>
          <li>{ru ? "Пока баллы хранятся на сайте. Вывод на кошелёк появится позже." : "For now points are stored on the site. Withdrawal to a wallet will come later."}</li>
        </ul>
        <p className="text-xs opacity-60">{ru ? "TCH не гарантирует дохода и не является инвестицией. Подробности: " : "TCH does not guarantee income and is not an investment. Details: "}<Link href={ROUTES.token} className="underline">{ru ? "страница токена" : "token page"}</Link></p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold px-1">{ru ? "Последние начисления" : "Recent rewards"}</h2>
        {d.log.length === 0 && <p className="card text-center opacity-70">{ru ? "Пока нет начислений. Позвоните другу из его профиля." : "No rewards yet. Call a friend from their profile."}</p>}
        {d.log.map((x) => (
          <div key={x.id} className="card !py-3 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate">{ru ? "Звонок с" : "Call with"} @{x.peer || "?"}</div>
              <div className="text-xs opacity-60">{new Date(x.created).toLocaleString(ru ? "ru-RU" : "en-US")} · {mins(x.secs)} {ru ? "мин" : "min"}</div>
            </div>
            <b className="shrink-0" style={{ color: "#d4a017" }}>+{fmt(x.micro)}</b>
          </div>
        ))}
      </section>
    </div>
  );
}

"use client";
import LoginPrompt from "@/components/LoginPrompt";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar from "@/components/Avatar";
import DailyQuests from "@/components/DailyQuests";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { ROUTES, profileUrl } from "@/lib/urls";
import { clockText, hhmm, tourErr, useNow, useTournament, useTournaments, type TourInfo, type TourStatus } from "@/lib/tournaments";

const tourUrl = (id: string) => `${ROUTES.tournaments}?id=${encodeURIComponent(id)}`;

const STATUS: Record<TourStatus, [string, string]> = {
  upcoming: ["Скоро", "Upcoming"], running: ["Идёт", "Live"], finishing: ["Завершается", "Finishing"],
  finished: ["Завершён", "Finished"], cancelled: ["Отменён", "Cancelled"],
};
function Badge({ s, ru }: { s: TourStatus; ru: boolean }) {
  const live = s === "running";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${live ? "bg-emerald-500 text-white" : "bg-black/10 dark:bg-white/10"}`}>
      {live ? "● " : ""}{ru ? STATUS[s][0] : STATUS[s][1]}
    </span>
  );
}

/** Подпись времени: до старта или до конца */
function timerText(t: TourInfo, now: number, ru: boolean): string {
  if (t.status === "upcoming") return `${ru ? "Старт через" : "Starts in"} ${clockText(t.start - now)}`;
  if (t.status === "running") return `${ru ? "До конца" : "Ends in"} ${clockText(t.end - now)}`;
  if (t.status === "finishing") return ru ? "Доигрываются последние партии" : "Last games are finishing";
  return "";
}

function Rules({ ru }: { ru: boolean }) {
  return (
    <section className="card space-y-2">
      <h2 className="text-lg font-bold">{ru ? "Как это работает" : "How it works"}</h2>
      <ul className="list-disc ps-5 space-y-1 text-sm opacity-90">
        {ru ? (
          <>
            <li>Блиц-арена каждый час (3 минуты на партию, 30 минут турнира) и дневная арена в 18:00 UTC (5 минут, 60 минут турнира).</li>
            <li>Вход бесплатный и без ставок. Нужен вход на сайте. Записаться можно заранее и даже после старта, до последних 5 минут.</li>
            <li>Пока вы на странице турнира, сервер сам подбирает соперника и открывает партию. Закончили партию — вернитесь на страницу, и начнётся следующая.</li>
            <li>Победа даёт 2 очка, ничья 1. Партии короче 5 ходов очков не дают (кроме мата).</li>
            <li>Не пришли в партию за 90 секунд, и вы выбываете из турнира. Ушли из партии на 2 минуты, засчитывается поражение.</li>
            <li>Награды: очки XP, значок «Первый турнир» и кубки за 1–3 места (если сыграли минимум 4 человека). Денег в турнирах нет.</li>
          </>
        ) : (
          <>
            <li>A blitz arena every hour (3 minutes per game, 30-minute tournament) and a daily arena at 18:00 UTC (5 minutes, 60-minute tournament).</li>
            <li>Free entry, no stakes. You need to be signed in. Join in advance or after the start, until the last 5 minutes.</li>
            <li>While you stay on the tournament page, the server pairs you with an opponent and opens the game. When a game ends, come back to the page and the next one starts.</li>
            <li>A win gives 2 points, a draw 1. Games shorter than 5 moves give no points (except checkmate).</li>
            <li>Do not show up within 90 seconds and you are removed from the tournament. Leave a game for 2 minutes and it counts as a loss.</li>
            <li>Rewards: XP points, the “First tournament” badge and cups for places 1–3 (if at least 4 players took part). No money is involved.</li>
          </>
        )}
      </ul>
    </section>
  );
}

function ListView({ token, signIn }: { token: string; signIn: () => Promise<string> }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const { data, skew, error } = useTournaments(token);
  const now = useNow() + skew;
  return (
    <>
      <section className="space-y-3" aria-label={ru ? "Ближайшие турниры" : "Upcoming tournaments"}>
        <h2 className="text-lg font-bold">{ru ? "Ближайшие турниры" : "Upcoming tournaments"}</h2>
        {!data && <p className="text-sm opacity-60">{error ? (ru ? "Не удалось загрузить список" : "Could not load the list") : "…"}</p>}
        {data?.live.map((t) => (
          <Link key={t.id} href={tourUrl(t.id)} className="card block hover:brightness-105 transition">
            <div className="flex items-center justify-between gap-2">
              <b>{ru ? t.ru : t.en}</b>
              <Badge s={t.status} ru={ru} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-80">
              <span>🕒 {hhmm(t.start)}–{hhmm(t.end)}</span>
              <span>👥 {t.players}</span>
              {t.registered && <span className="font-semibold text-emerald-600">✓ {ru ? "вы записаны" : "you are in"}</span>}
            </div>
            <div className="mt-1 text-sm font-semibold">{timerText(t, now, ru)}</div>
          </Link>
        ))}
      </section>

      {!token && <LoginPrompt text={ru ? "Подключите кошелёк, чтобы участвовать в турнирах." : "Connect your wallet to join tournaments."} />}

      {data && data.past.length > 0 && (
        <section className="space-y-3" aria-label={ru ? "Недавние турниры" : "Recent tournaments"}>
          <h2 className="text-lg font-bold">{ru ? "Недавние турниры" : "Recent tournaments"}</h2>
          {data.past.map((t) => (
            <Link key={t.id} href={tourUrl(t.id)} className="card block hover:brightness-105 transition">
              <div className="flex items-center justify-between gap-2">
                <b>{ru ? t.ru : t.en} · {hhmm(t.start)}</b>
                <Badge s={t.status} ru={ru} />
              </div>
              {t.top.length > 0 && (
                <div className="mt-1 text-sm opacity-80">
                  {t.top.map((p, i) => <span key={p.name} className="me-3">{["🥇", "🥈", "🥉"][i]} {p.name} ({p.score})</span>)}
                </div>
              )}
            </Link>
          ))}
        </section>
      )}

      <DailyQuests token={token} signIn={signIn} />
      <Rules ru={ru} />
    </>
  );
}

function DetailView({ id, token, signIn }: { id: string; token: string; signIn: () => Promise<string> }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const { one, skew, error, busy, join, leave } = useTournament(id, token);
  const now = useNow() + skew;

  if (!one) {
    return (
      <section className="card text-center text-sm opacity-70">
        {error ? tourErr(error, ru) : "…"}
        <div className="mt-3"><Link href={ROUTES.tournaments} className="btn btn-ghost !py-2">{ru ? "← Все турниры" : "← All tournaments"}</Link></div>
      </section>
    );
  }
  const t = one.tour, me = one.me;
  const open = (t.status === "upcoming" || t.status === "running") && now < t.end - 5 * 60_000;
  const registered = !!me?.registered;

  return (
    <>
      <Link href={ROUTES.tournaments} className="text-sm underline opacity-80">{ru ? "← Все турниры" : "← All tournaments"}</Link>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{ru ? t.ru : t.en}</h2>
          <Badge s={t.status} ru={ru} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
          <span>🕒 {hhmm(t.start)}–{hhmm(t.end)}</span>
          <span>👥 {t.players}</span>
          <span>⏱ {t.minutes} {ru ? "мин на партию" : "min per game"}</span>
        </div>
        <div className="text-base font-semibold">{timerText(t, now, ru)}</div>

        {registered && t.status === "running" && !me?.current && (
          <p className="rounded-xl bg-emerald-500/10 p-3 text-sm">
            ⏳ {ru ? "Ищем соперника… Оставайтесь на этой странице, партия откроется сама." : "Looking for an opponent… Stay on this page, the game will open by itself."}
          </p>
        )}
        {registered && t.status === "upcoming" && (
          <p className="rounded-xl bg-emerald-500/10 p-3 text-sm">✓ {ru ? "Вы записаны. Оставайтесь на странице: партия начнётся после старта." : "You are in. Stay on this page: your game starts after the kick-off."}</p>
        )}
        {me && registered && (
          <p className="text-sm">{ru ? "Ваши очки" : "Your score"}: <b>{me.score}</b> · {ru ? "партий" : "games"}: {me.games}{me.rank ? ` · ${ru ? "место" : "rank"} ${me.rank}` : ""}</p>
        )}

        {error && <p className="text-sm text-red-500">{tourErr(error, ru)}</p>}

        <div className="flex flex-wrap gap-2">
          {token && !registered && open && <button type="button" disabled={busy} className="btn btn-primary" onClick={() => void join()}>{ru ? "Участвовать" : "Join"}</button>}
          {token && registered && open && !me?.current && <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => void leave()}>{ru ? "Выйти из турнира" : "Leave"}</button>}
          {token && !registered && !open && (t.status === "upcoming" || t.status === "running") && <span className="text-sm opacity-70">{ru ? "Вход закрыт: до конца осталось меньше 5 минут" : "Entry closed: less than 5 minutes left"}</span>}
        </div>
      </section>

      <section className="card space-y-2" aria-label={ru ? "Таблица" : "Standings"}>
        <h2 className="text-lg font-bold">{ru ? "Таблица" : "Standings"}</h2>
        {one.standings.length === 0 ? (
          <p className="text-sm opacity-60">{ru ? "Пока никого. Станьте первым!" : "Nobody yet. Be the first!"}</p>
        ) : (
          <ol className="divide-y divide-black/5 dark:divide-white/10">
            {one.standings.map((s) => (
              <li key={s.name} className={`flex items-center gap-3 py-2 ${s.me ? "font-semibold" : ""}`}>
                <span className="w-7 text-center text-sm opacity-70">{s.rank <= 3 && s.games > 0 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}</span>
                <Avatar name={s.name} src={s.avatar} size={32} />
                <Link href={profileUrl(s.name)} className="truncate hover:underline">{s.name}</Link>
                <span className="ms-auto flex items-center gap-3 text-sm">
                  <span title={ru ? "Победы / партии" : "Wins / games"} className="opacity-60">{s.wins}/{s.games}</span>
                  <span title={s.playing ? (ru ? "Играет" : "Playing") : s.online ? (ru ? "Ждёт пару" : "Waiting") : (ru ? "Не на странице" : "Away")}>{s.playing ? "♟" : s.online ? "🟢" : "⚪"}</span>
                  <b className="w-8 text-end">{s.score}</b>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <Rules ru={ru} />
    </>
  );
}

function Content() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const s = useSocial();
  const id = useSearchParams().get("id") || "";
  return (
    <PageShell
      title={ru ? "Шахматные турниры" : "Free Chess Tournaments"}
      intro={ru ? "Бесплатные арены каждый час: играйте, набирайте очки, получайте значки и кубки." : "Free arenas every hour: play, score points, earn badges and cups."}
    >
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{ru ? "Турниры" : "Tournaments"}</span>
      </nav>
      {id ? <DetailView id={id} token={s.token} signIn={s.signIn} /> : <ListView token={s.token} signIn={s.signIn} />}
    </PageShell>
  );
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-3 pt-8 text-center opacity-70">…</main>}>
      <Content />
    </Suspense>
  );
}

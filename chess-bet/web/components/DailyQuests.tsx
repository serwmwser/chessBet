"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { getPlayerStats, leftText, useQuests, type QBadge, type QStats } from "@/lib/quests";

/** Полоска прогресса */
function Bar({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** Ряд значков: наведите или нажмите, чтобы увидеть название */
export function BadgeRow({ badges }: { badges: QBadge[] }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span key={b.id} title={ru ? b.ru : b.en} className="chip !px-2.5 !py-1 text-sm" aria-label={ru ? b.ru : b.en}>
          <span aria-hidden>{b.icon}</span> <span className="text-xs">{ru ? b.ru : b.en}</span>
        </span>
      ))}
    </div>
  );
}

function Level({ s, ru }: { s: QStats; ru: boolean }) {
  const base = 25 * (s.level - 1) ** 2;
  const pct = ((s.xp - base) / Math.max(1, s.nextXp - base)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <b>{ru ? `Уровень ${s.level}` : `Level ${s.level}`}</b>
        <span className="opacity-70">{s.xp} / {s.nextXp} XP</span>
      </div>
      <Bar pct={pct} />
    </div>
  );
}

/** Задания дня текущего игрока: выдаются автоматически каждый день в 00:00 UTC */
export default function DailyQuests({ token, signIn }: { token: string; signIn?: () => Promise<string> }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const { data, error } = useQuests(token);
  const [now, setNow] = useState(() => Date.now());
  const [t0] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  if (!data) return <section className="card"><p className="text-sm opacity-60">{error ? (ru ? "Не удалось загрузить задания" : "Could not load quests") : "…"}</p></section>;
  const left = data.resetIn - (now - t0);
  const done = data.quests.filter((q) => q.done).length;

  return (
    <section className="card space-y-3" aria-label={ru ? "Задания дня" : "Daily quests"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg">{ru ? "🎯 Задания дня" : "🎯 Daily quests"}</h2>
          <p className="text-xs opacity-60">{ru ? "Обновятся через" : "Refresh in"} {leftText(left, ru)}</p>
        </div>
        {data.stats && (
          <div className="text-right text-sm">
            <div title={ru ? "Серия дней подряд" : "Day streak"}>🔥 <b>{data.stats.streak}</b> {ru ? "дн." : "d"}</div>
            <div className="text-xs opacity-60">{ru ? "рекорд" : "best"} {data.stats.best}</div>
          </div>
        )}
      </div>

      {data.stats && <Level s={data.stats} ru={ru} />}

      <ul className="space-y-3">
        {data.quests.map((q) => (
          <li key={q.id} className={q.done ? "opacity-80" : ""}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{q.done ? "✅" : "⬜"} {ru ? q.ru : q.en}</span>
              <span className="whitespace-nowrap text-xs opacity-70">{q.progress}/{q.target} · +{q.xp} XP</span>
            </div>
            <Bar pct={(q.progress / q.target) * 100} done={q.done} />
          </li>
        ))}
      </ul>

      <p className="text-xs opacity-70">
        {done === data.quests.length
          ? (ru ? `🎉 Все задания выполнены! Бонус +${data.bonus} XP получен.` : `🎉 All quests done! Bonus +${data.bonus} XP earned.`)
          : (ru ? `Выполните все три и получите бонус +${data.bonus} XP.` : `Complete all three for a +${data.bonus} XP bonus.`)}
      </p>

      {data.guest ? (
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 text-sm">
          {ru ? "Войдите на сайт, чтобы прогресс засчитывался." : "Sign in so your progress counts."}
          {signIn && <button type="button" className="btn btn-primary !py-2 mt-2 w-full" onClick={() => void signIn()}>{ru ? "Войти" : "Sign in"}</button>}
        </div>
      ) : (
        <Link href={ROUTES.home} className="btn btn-primary !py-2.5 w-full">{ru ? "♟ Играть" : "♟ Play"}</Link>
      )}

      <p className="text-[11px] opacity-50">
        {ru ? "Засчитываются бесплатные партии не короче 5 ходов, пока вы вошли на сайте. Награды: очки, значки и серии дней, без денег."
            : "Free games of at least 5 moves count while you are signed in. Rewards: points, badges and streaks, no money."}
      </p>

      {data.badges.length > 0 && (
        <div className="pt-1">
          <h3 className="text-sm font-semibold mb-2">{ru ? "Мои значки" : "My badges"}</h3>
          <BadgeRow badges={data.badges} />
        </div>
      )}
    </section>
  );
}

/** Публичная карточка игрока в чужом профиле: уровень, серия, значки */
export function PlayerBadges({ name }: { name: string }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [d, setD] = useState<{ stats: QStats; badges: QBadge[] } | null>(null);
  useEffect(() => {
    let alive = true;
    setD(null);
    getPlayerStats(name).then((r) => { if (alive) setD(r); }).catch(() => {});
    return () => { alive = false; };
  }, [name]);
  if (!d || (d.stats.games === 0 && d.badges.length === 0)) return null;
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>⭐ <b>{ru ? `Уровень ${d.stats.level}` : `Level ${d.stats.level}`}</b></span>
        <span>🔥 <b>{d.stats.streak}</b> {ru ? "дн." : "d"}</span>
        <span>♟ {d.stats.games} · 🏁 {d.stats.wins}</span>
        <span className="opacity-60">{d.stats.xp} XP</span>
      </div>
      <BadgeRow badges={d.badges} />
    </section>
  );
}

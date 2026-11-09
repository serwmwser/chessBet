"use client";
import LoginPrompt from "@/components/LoginPrompt";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PuzzleBoard from "@/components/PuzzleBoard";
import { useApp } from "@/lib/ctx";
import { useSocial } from "@/lib/social";
import { ROUTES } from "@/lib/urls";
import { puzzleStats, type Level, type PuzzleStats } from "@/lib/puzzles";
import { EN, RU } from "./content";

export default function PuzzlesPage() {
  const { lang } = useApp();
  const { token, signIn } = useSocial();
  const ru = lang === "ru";
  const c = ru ? RU : EN;
  const [level, setLevel] = useState<Level>(1);
  const [stats, setStats] = useState<PuzzleStats | null>(null);

  const refresh = useCallback(() => {
    if (!token) { setStats(null); return; }
    puzzleStats(token).then(setStats).catch(() => {});
  }, [token]);
  useEffect(() => { refresh(); }, [refresh]);

  const stat = (l: Level) => stats?.levels.find((x) => x.level === l);
  const chip = (on: boolean) => `chip ${on ? "chip-on" : ""}`;
  const levels: Level[] = [1, 2, 3];

  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{c.crumb}</span>
      </nav>

      {!token ? (
        <LoginPrompt text={ru ? "Подключите кошелёк, чтобы решать задачи: сервер проверяет ходы и начисляет XP на ваш аккаунт." : "Connect your wallet to solve puzzles: the server checks your moves and adds XP to your account."} />
      ) : (
        <section className="card space-y-3" aria-label={ru ? "Решение задач" : "Solve puzzles"}>
          <div role="tablist" className="flex flex-wrap gap-2">
            {levels.map((l) => {
              const s = stat(l);
              return (
                <button key={l} type="button" role="tab" aria-selected={level === l} className={chip(level === l)} onClick={() => setLevel(l)}>
                  {ru ? `Мат в ${l}` : `Mate in ${l}`}{s ? ` · ${s.solved}/${s.total}` : ""}
                </button>
              );
            })}
          </div>
          {stats && <p className="text-xs opacity-70">{ru ? `Всего получено XP за задачи: ${stats.xp}` : `Total XP earned from puzzles: ${stats.xp}`}</p>}
          <PuzzleBoard key={level} token={token} level={level} onSolved={refresh} />
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{c.why.h}</h2>
        {c.why.p.map((p) => <p key={p} className="text-sm opacity-90">{p}</p>)}
      </section>

      <section className="space-y-3" aria-label={c.levelsH}>
        <h2 className="text-lg font-bold text-center">{c.levelsH}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {c.levels.map(([h, p, xp]) => (
            <li key={h} className="card space-y-1">
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{h}</h3><span className="chip">{xp}</span></div>
              <p className="text-sm opacity-85">{p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-label={c.stepsH}>
        <h2 className="text-lg font-bold text-center">{c.stepsH}</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.steps.map(([h, p], i) => (
            <li key={h} className="card flex gap-3">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-600" aria-hidden>{i + 1}</span>
              <div><h3 className="font-semibold">{h}</h3><p className="text-sm opacity-85">{p}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" aria-label={c.tipsH}>
        <h2 className="text-lg font-bold text-center">{c.tipsH}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.tips.map(([h, p]) => (
            <li key={h} className="card space-y-1"><h3 className="font-semibold">{h}</h3><p className="text-sm opacity-85">{p}</p></li>
          ))}
        </ul>
      </section>

      <section className="space-y-2" aria-label={c.faqH}>
        <h2 className="text-lg font-bold text-center">{c.faqH}</h2>
        {c.faq.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="font-semibold cursor-pointer">{q}</summary>
            <p className="text-sm opacity-85 mt-2">{a}</p>
          </details>
        ))}
      </section>
    </PageShell>
  );
}

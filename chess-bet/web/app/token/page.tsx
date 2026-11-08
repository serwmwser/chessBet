"use client";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { BASE, ROUTES } from "@/lib/urls";
import { EN, RU, SLICES, TOTAL } from "./content";

const COLORS = ["#d4a017", "#10b981", "#0ea5e9", "#8b5cf6", "#f97316", "#ec4899", "#64748b", "#14b8a6"];
const fmt = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");

export default function TokenPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const c = ru ? RU : EN;

  const list = (title: string, items: string[]) => (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-sm">
            <span className="text-emerald-500" aria-hidden>•</span>
            <span className="opacity-90">{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{c.crumb}</span>
      </nav>

      <div className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">{c.status}</div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{c.factsH}</h2>
        <dl className="space-y-2 text-sm">
          {c.facts.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2 last:border-0">
              <dt className="opacity-70">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{c.distH}</h2>
        <div className="flex h-5 w-full overflow-hidden rounded-full" role="img" aria-label={c.distH}>
          {SLICES.map((s, i) => <div key={s.id} style={{ width: s.pct + "%", background: COLORS[i % COLORS.length] }} title={(ru ? s.ru : s.en) + " " + s.pct + "%"} />)}
        </div>
        <ul className="space-y-3">
          {SLICES.map((s, i) => (
            <li key={s.id} className="flex gap-3 text-sm">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              <div className="min-w-0">
                <div className="font-semibold">{ru ? s.ru : s.en}: {s.pct}% <span className="font-normal opacity-70">({fmt(s.amount)} TCH)</span></div>
                <div className="text-xs opacity-75">{ru ? s.noteRu : s.noteEn}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-70">{ru ? "Всего" : "Total"}: {fmt(TOTAL)} TCH. {c.distNote}</p>
      </section>

      {list(c.earnH, c.earn)}
      {list(c.spendH, c.spend)}
      {list(c.valueH, c.value)}

      <section className="space-y-3" aria-label={c.roadH}>
        <h2 className="text-lg font-bold text-center">{c.roadH}</h2>
        <ol className="space-y-3">
          {c.road.map(([h, p], i) => (
            <li key={h} className="card flex gap-3">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-600" aria-hidden>{i + 1}</span>
              <div>
                <h3 className="font-semibold">{h}</h3>
                <p className="text-sm opacity-80">{p}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {list(c.risksH, c.risks)}

      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary" href={`${BASE}/whitepaper-tch.md`} target="_blank" rel="noopener noreferrer">{c.wp}</a>
        <Link className="btn btn-ghost" href={ROUTES.home}>{c.back}</Link>
      </div>
    </PageShell>
  );
}

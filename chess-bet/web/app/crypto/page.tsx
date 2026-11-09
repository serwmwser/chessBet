"use client";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { EN, ESCROW_URL, RU } from "./content";

export default function CryptoPage() {
  const { lang } = useApp();
  const c = lang === "ru" ? RU : EN;
  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{c.crumb}</span>
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.home} className="btn btn-primary">{c.cta}</Link>
        <Link href={ROUTES.nft} className="btn btn-ghost">🎨 {c.nft}</Link>
      </div>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{c.stepsH}</h2>
        <ol className="list-decimal ps-5 space-y-1.5 text-sm sm:text-base opacity-90">
          {c.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      {c.secs.map((s) => (
        <section key={s.h} className="card space-y-2">
          <h2 className="text-lg font-bold">{s.h}</h2>
          {s.p.map((t) => <p key={t} className="text-sm sm:text-base opacity-90">{t}</p>)}
        </section>
      ))}

      <section className="card space-y-3" aria-label="FAQ">
        <h2 className="text-lg font-bold">FAQ</h2>
        {c.faq.map(([q, a]) => (
          <details key={q} className="rounded-xl border px-3 py-2">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-sm opacity-85">{a}</p>
          </details>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.home} className="btn btn-primary">{c.cta}</Link>
        <Link href={ROUTES.chess} className="btn btn-ghost">{c.practice}</Link>
        <a href={ESCROW_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">{c.contract}</a>
        <Link href={ROUTES.terms} className="btn btn-ghost">{c.terms}</Link>
      </div>
      <p className="text-xs opacity-60">{c.risk}</p>
    </PageShell>
  );
}

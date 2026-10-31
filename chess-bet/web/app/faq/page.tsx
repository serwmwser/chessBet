"use client";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { EN, RU } from "./content";

export default function FaqPage() {
  const { lang } = useApp();
  const c = lang === "ru" ? RU : EN;
  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{c.crumb}</span>
      </nav>

      {c.groups.map((g) => (
        <section key={g.h} className="card space-y-3">
          <h2 className="text-lg font-bold">{g.h}</h2>
          {g.items.map(([q, a]) => (
            <details key={q} className="rounded-xl border px-3 py-2">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-sm opacity-85">{a}</p>
            </details>
          ))}
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.home} className="btn btn-primary">{c.cta}</Link>
        <Link href={ROUTES.chess} className="btn btn-ghost">{c.chess}</Link>
        <Link href={ROUTES.crypto} className="btn btn-ghost">{c.crypto}</Link>
        <Link href={ROUTES.terms} className="btn btn-ghost">{c.terms}</Link>
      </div>
      <p className="text-xs opacity-60">{c.note}</p>
    </PageShell>
  );
}

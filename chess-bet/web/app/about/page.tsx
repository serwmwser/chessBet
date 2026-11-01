"use client";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { ESCROW_URL } from "../crypto/content";
import { CONTACT_EMAIL, EN, RU } from "./content";

export default function AboutPage() {
  const { lang } = useApp();
  const c = lang === "ru" ? RU : EN;
  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{c.crumb}</span>
      </nav>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{c.missionH}</h2>
        {c.mission.map((p) => <p key={p} className="text-sm opacity-90">{p}</p>)}
      </section>

      <section className="space-y-3" aria-label={c.howH}>
        <h2 className="text-lg font-bold text-center">{c.howH}</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.steps.map(([h, p], i) => (
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

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{c.whyH}</h2>
        <ul className="space-y-2">
          {c.why.map((t) => (
            <li key={t} className="flex gap-2 text-sm">
              <span className="text-emerald-500" aria-hidden>✓</span>
              <span className="opacity-90">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{c.projectH}</h2>
        <p className="text-sm opacity-90">{c.projectP}</p>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase opacity-60">{c.contactLabel}</dt>
            <dd><a href={`mailto:${CONTACT_EMAIL}`} className="underline break-all">{CONTACT_EMAIL}</a></dd>
          </div>
          <div>
            <dt className="text-xs uppercase opacity-60">{c.contractLabel}</dt>
            <dd><a href={ESCROW_URL} target="_blank" rel="noopener noreferrer" className="underline">{c.contractLink}</a></dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.home} className="btn btn-primary">{c.cta}</Link>
        <Link href={ROUTES.faq} className="btn btn-ghost">{c.faq}</Link>
        <Link href={ROUTES.crypto} className="btn btn-ghost">{c.crypto}</Link>
        <Link href={ROUTES.terms} className="btn btn-ghost">{c.terms}</Link>
        <Link href={ROUTES.age} className="btn btn-ghost">{c.age}</Link>
      </div>
    </PageShell>
  );
}

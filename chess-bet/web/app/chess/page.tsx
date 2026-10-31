"use client";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { TG_BOT_URL } from "@/lib/telegram";
import { EN, RU } from "./content";

export default function ChessPage() {
  const { lang } = useApp();
  const c = lang === "ru" ? RU : EN;
  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{c.crumb}</span>
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.home} className="btn btn-primary">{c.cta}</Link>
        <a href={TG_BOT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">✈️ {c.tg}</a>
      </div>

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
        <Link href={ROUTES.terms} className="btn btn-ghost">{c.terms}</Link>
      </div>
      <p className="text-xs opacity-60">18+ · {lang === "ru" ? "Ставки связаны с риском проигрыша. Играйте ответственно." : "Stakes carry the risk of losing. Play responsibly."}</p>
    </PageShell>
  );
}

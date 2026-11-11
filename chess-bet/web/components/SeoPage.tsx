"use client";
import Link from "next/link";
import PageShell from "./PageShell";
import { ROUTES } from "@/lib/urls";

export type SeoText = {
  slug: string; crumb: string; title: string; intro: string; seoTitle: string; seoDesc: string; cta: string; ctaHref: string;
  blocks: [string, string[]][]; featuresH: string; features: [string, string][]; faqH: string; faq: [string, string][];
};

/** HiMeet SEO page: общий вид посадочных страниц (заголовок, блоки, возможности, вопросы-ответы, кнопка) */
export default function SeoPage({ c }: { c: SeoText }) {
  return (
    <PageShell title={c.title} intro={c.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{c.crumb}</span>
      </nav>
      <a href={c.ctaHref} className="btn btn-primary w-full justify-center text-center">{c.cta}</a>
      {c.blocks.map(([h, ps]) => (
        <section key={h} className="card space-y-2">
          <h2 className="text-lg font-bold">{h}</h2>
          {ps.map((p) => <p key={p} className="text-sm opacity-90">{p}</p>)}
        </section>
      ))}
      <section className="space-y-3" aria-label={c.featuresH}>
        <h2 className="text-lg font-bold text-center">{c.featuresH}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.features.map(([h, p]) => (
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
      <a href={c.ctaHref} className="btn btn-primary w-full justify-center text-center">{c.cta}</a>
    </PageShell>
  );
}

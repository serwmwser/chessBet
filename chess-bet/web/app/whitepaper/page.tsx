"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES, SITE_URL } from "@/lib/urls";
import { DOCS, type Doc } from "./content";

export default function WhitepaperPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [id, setId] = useState<Doc["id"]>("app");

  useEffect(() => {
    const read = () => setId(window.location.hash === "#token" ? "token" : "app");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const doc = DOCS.find((d) => d.id === id) || DOCS[0];
  const pick = (d: Doc) => { setId(d.id); try { window.history.replaceState(null, "", d.id === "token" ? "#token" : "#app"); } catch { /* без адреса */ } };
  const pageUrl = `${SITE_URL}/whitepaper/${id === "token" ? "#token" : ""}`;
  const translate = (tl: string) => `https://translate.google.com/translate?sl=en&tl=${tl}&u=${encodeURIComponent(pageUrl)}`;

  return (
    <PageShell
      title={ru ? "Белые книги" : "Whitepapers"}
      intro={ru ? "Белая книга приложения Chess Bet и белая книга токена TCH. Тексты на английском; их можно перевести переводчиком браузера." : "The Chess Bet app whitepaper and the TCH token whitepaper."}
    >
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">Chess Bet</Link> › <span>{ru ? "Белые книги" : "Whitepapers"}</span>
      </nav>

      <div role="tablist" className="flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === id}
            onClick={() => pick(d)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold border transition"
            style={d.id === id
              ? { background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00", borderColor: "transparent" }
              : { borderColor: "rgba(212,160,23,.45)", color: "#d4a017" }}
          >
            {d.tab}
          </button>
        ))}
      </div>

      <div className="card space-y-2 text-sm">
        <div className="font-semibold">{ru ? "Как прочитать на русском" : "How to read in another language"}</div>
        <p className="opacity-85">
          {ru
            ? "В Chrome нажмите правой кнопкой мыши на странице и выберите «Перевести на русский», на телефоне откройте меню ⋮ → «Перевести». Или нажмите кнопку ниже."
            : "In Chrome, right-click the page and choose Translate, or on a phone open the ⋮ menu and choose Translate. Or use the buttons below."}
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-ghost !py-1.5" href={translate("ru")} target="_blank" rel="noopener noreferrer">{ru ? "Перевести на русский" : "Translate to Russian"}</a>
          <a className="btn btn-ghost !py-1.5" href={translate("es")} target="_blank" rel="noopener noreferrer">Español</a>
          <a className="btn btn-ghost !py-1.5" href={translate("de")} target="_blank" rel="noopener noreferrer">Deutsch</a>
        </div>
      </div>

      <article lang="en" className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-extrabold">{doc.title}</h2>
          <p className="text-xs opacity-70">{doc.version}</p>
          <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">{doc.note}</p>
        </header>

        {doc.sections.map((s) => (
          <section key={s.h} className="card space-y-2">
            <h3 className="text-base font-bold">{s.h}</h3>
            {s.rows && s.head && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start opacity-70">{s.head.map((h) => <th key={h} className="py-1 pe-3 text-start font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r) => (
                      <tr key={r[0]} className="border-t border-black/10 dark:border-white/10">
                        {r.map((c, i) => <td key={i} className="py-1 pe-3">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.p?.map((t) => <p key={t} className="text-sm opacity-90">{t}</p>)}
            {s.ul && (
              <ul className="space-y-1.5">
                {s.ul.map((t) => (
                  <li key={t} className="flex gap-2 text-sm">
                    <span className="text-emerald-500" aria-hidden>•</span>
                    <span className="opacity-90">{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={ROUTES.token}>{ru ? "Страница токена TCH" : "TCH token page"}</Link>
        <Link className="btn btn-ghost" href={ROUTES.home}>{ru ? "На главную" : "Home"}</Link>
      </div>
    </PageShell>
  );
}

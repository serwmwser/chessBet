"use client";
import type { ReactNode } from "react";
import Header from "./Header";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";

/** Общая обёртка новых страниц сайта: шапка, меню разделов, заголовок со вступлением, содержимое и подвал */
export default function PageShell({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-3xl px-3 pt-4 pb-12 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#d4a017" }}>{title}</h1>
          {intro && <p className="text-sm sm:text-base opacity-85">{intro}</p>}
        </header>
        {children}
        <SiteFooter />
      </main>
    </>
  );
}

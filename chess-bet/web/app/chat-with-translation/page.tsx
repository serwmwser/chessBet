"use client";
import SeoPage from "@/components/SeoPage";
import { useApp } from "@/lib/ctx";
import { EN, RU } from "./content";

export default function Page() {
  const { lang } = useApp();
  return <SeoPage c={lang === "ru" ? RU : EN} />;
}

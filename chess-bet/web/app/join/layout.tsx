import type { Metadata } from "next";

const SITE = "https://serwmwser.github.io";
const TITLE = "Join Chess Bet: free messenger with calls, classifieds, dating and chess";
const DESC = "Chess Bet is a free messenger with calls and chat translation, worldwide classifieds (first ad free), dating through chess and chess games. Choose where to start and sign in with a wallet in a minute. 18+.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["free messenger", "free calls", "classifieds", "dating", "chess online", "Chess Bet", "бесплатный мессенджер", "объявления", "знакомства", "шахматы онлайн"],
  alternates: { canonical: "/join/" },
  openGraph: { type: "website", url: SITE + "/join/", title: TITLE, description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/join/#page", url: SITE + "/join/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: ["en", "ru"], dateModified: "2026-11-09" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Join", item: SITE + "/join/" },
    ] },
  ],
}).replace(/</g, "\\u003c");

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

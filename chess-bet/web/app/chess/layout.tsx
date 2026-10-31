import type { Metadata } from "next";
import { EN } from "./content";

const SITE = "https://chessbet.lol";
const TITLE = "Play Chess Online Free vs Bot or Friend";
const DESC = "Play chess online for free against a bot or a friend by private link. No stakes needed. When you are ready, play for USDC on Polygon.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/chess/" },
  openGraph: { type: "website", url: SITE + "/chess/", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/chess/#page", url: SITE + "/chess/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: EN.crumb, item: SITE + "/chess/" },
    ] },
    { "@type": "FAQPage", mainEntity: EN.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c");

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

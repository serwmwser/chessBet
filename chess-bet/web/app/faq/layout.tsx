import type { Metadata } from "next";
import { EN } from "./content";

const SITE = "https://chessbet.lol";
const TITLE = "Chess Bet FAQ: Stakes, Fees, Safety, Fair Play";
const DESC = "Answers about Chess Bet: how USDC stakes work, the 10% fee, payouts, age 18+, fair play, chess NFTs and the Rook Club community.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/faq/" },
  openGraph: { type: "website", url: SITE + "/faq/", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/faq/#page", url: SITE + "/faq/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: EN.crumb, item: SITE + "/faq/" },
    ] },
    { "@type": "FAQPage", mainEntity: EN.groups.flatMap((g) => g.items).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c");

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

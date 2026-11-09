import type { Metadata } from "next";
import { EN } from "./content";

const SITE = "https://serwmwser.github.io";
const TITLE = "Crypto Chess Game: Play for USDC on Polygon";
const DESC = "Crypto chess game on Polygon: stake USDC, a smart contract holds the pot and the winner claims 90%. Practise free first. 18+, play responsibly.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/crypto/" },
  openGraph: { type: "website", url: SITE + "/crypto/", title: TITLE + " | HiMeet", description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE + " | HiMeet", description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/crypto/#page", url: SITE + "/crypto/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "HiMeet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: EN.crumb, item: SITE + "/crypto/" },
    ] },
    { "@type": "FAQPage", mainEntity: EN.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c");

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

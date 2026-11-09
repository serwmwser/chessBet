import type { Metadata } from "next";
import { EN } from "./content";

const SITE = "https://serwmwser.github.io";

export const metadata: Metadata = {
  title: EN.seoTitle,
  description: EN.seoDesc,
  alternates: { canonical: "/ads/" },
  openGraph: { type: "website", url: SITE + "/ads/", title: EN.seoTitle, description: EN.seoDesc, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: EN.seoTitle, description: EN.seoDesc, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CollectionPage", "@id": SITE + "/ads/#page", url: SITE + "/ads/", name: EN.seoTitle, description: EN.seoDesc, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: EN.crumb, item: SITE + "/ads/" },
    ] },
    { "@type": "FAQPage", mainEntity: EN.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c");

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

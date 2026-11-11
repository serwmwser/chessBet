import type { Metadata } from "next";

const SITE = "https://himeet.online";
const TITLE = "HiMeet Whitepaper & TCH Token Whitepaper | HiMeet";
const DESC = "Read the HiMeet whitepaper (social network, classifieds, dating and chess for USDC on Polygon) and the TCH token whitepaper: tokenomics, release schedule, roadmap and risks. In English, translatable in your browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["HiMeet whitepaper", "TCH whitepaper", "ChessTalk Token", "tokenomics", "Polygon", "chess for USDC", "белая книга", "токеномика"],
  alternates: { canonical: "/whitepaper/" },
  openGraph: { type: "article", url: SITE + "/whitepaper/", title: TITLE, description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/whitepaper/#page", url: SITE + "/whitepaper/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en", dateModified: "2026-11-08" },
    { "@type": "TechArticle", "@id": SITE + "/whitepaper/#app", headline: "HiMeet (Rook Club): Whitepaper", url: SITE + "/whitepaper/#app", inLanguage: "en", dateModified: "2026-11-08", author: { "@id": SITE + "/#org" }, publisher: { "@id": SITE + "/#org" } },
    { "@type": "TechArticle", "@id": SITE + "/whitepaper/#token", headline: "TCH (ChessTalk Token): Whitepaper", url: SITE + "/whitepaper/#token", inLanguage: "en", dateModified: "2026-11-08", author: { "@id": SITE + "/#org" }, publisher: { "@id": SITE + "/#org" } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "HiMeet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Whitepapers", item: SITE + "/whitepaper/" },
    ] },
  ],
}).replace(/</g, "\\u003c");

export default function WhitepaperLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

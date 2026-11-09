import type { Metadata } from "next";
import { CONTACT_EMAIL } from "./content";

const SITE = "https://serwmwser.github.io";
const TITLE = "About Chess Bet: Chess for USDC on Polygon & Rook Club";
const DESC = "Chess Bet is a chess platform where skill decides the game. Play free, or play for USDC with stakes held by an open smart contract on Polygon. Meet chess and crypto fans in Rook Club.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/about/" },
  openGraph: { type: "website", url: SITE + "/about/", title: TITLE, description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "AboutPage", "@id": SITE + "/about/#page", url: SITE + "/about/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en", about: { "@id": SITE + "/#org" } },
    { "@type": "Organization", "@id": SITE + "/#org", name: "Chess Bet", url: SITE + "/", logo: SITE + "/icon-512.png", contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "About", item: SITE + "/about/" },
    ] },
  ],
}).replace(/</g, "\\u003c");

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

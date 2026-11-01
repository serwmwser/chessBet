import type { Metadata } from "next";

const SITE = "https://chessbet.lol";
const TITLE = "Free Online Chess Tournaments: Hourly Arena, Prizes & Cups";
const DESC = "Join free chess tournaments on Chess Bet: a blitz arena every hour and a daily arena at 18:00 UTC. No entry fee, no wallet funds at risk. Earn points, badges and cups.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/tournaments/" },
  openGraph: { type: "website", url: SITE + "/tournaments/", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE + " | Chess Bet", description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/tournaments/#page", url: SITE + "/tournaments/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: "en" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Tournaments", item: SITE + "/tournaments/" },
    ] },
  ],
}).replace(/</g, "\\u003c");

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

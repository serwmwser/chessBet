import type { Metadata } from "next";

const SITE = "https://chessbet.lol";
const TITLE = "TCH Token (ChessTalk Token): Tokenomics, Roadmap & Whitepaper | Chess Bet";
const DESC = "TCH is the in-app token of Chess Bet on Polygon (issued 8 November 2026): 888,888,888 fixed supply, earned for calls and activity from a rewards reserve, spent on paid options with burning. Tokenomics, roadmap, risks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["TCH token", "ChessTalk Token", "Chess Bet token", "tokenomics", "Polygon ERC-20", "whitepaper", "токен TCH", "токеномика", "дорожная карта токена"],
  alternates: { canonical: "/token/" },
  openGraph: { type: "website", url: SITE + "/token/", title: TITLE, description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

const FAQ: [string, string][] = [
  ["What is the TCH token?", "TCH (ChessTalk Token) is the in-app token of Chess Bet on the Polygon network (ERC-20), issued on 8 November 2026 at 0x14818b99E86fD4654Cb55BE57367d1BfaA2b0F82. Members earn it for calls and activity and spend it on paid options inside the app. Rewards are not live yet and TCH is not listed on any exchange."],
  ["What is the total supply of TCH?", "The total supply is fixed at 888,888,888 TCH. All tokens are created once at issue, and there is no function to create more."],
  ["How do I earn TCH?", "By calls between profiles, games, posts, puzzles and invitations. Rewards are paid out gradually from a locked rewards reserve (58% of supply), with daily limits and anti-abuse checks."],
  ["What can TCH be spent on?", "Paid options such as boosting an ad, a VIP profile or dating extras, tournament entry fees and staking. Part of every payment in TCH is burned."],
  ["Is TCH an investment?", "No. TCH is an in-app unit, not a share in a company, and its price is not guaranteed. The token contracts have not been independently audited."],
  ["Is there a Russian version?", "Да. Страница токена TCH доступна на русском языке: токеномика, дорожная карта и риски."],
];

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/token/#page", url: SITE + "/token/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: ["en", "ru"], dateModified: "2026-11-08" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Chess Bet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "TCH token", item: SITE + "/token/" },
    ] },
    { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c");

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

import type { Metadata } from "next";

const SITE = "https://serwmwser.github.io";
const TITLE = "Transparency: ChessEscrow betting contract on Polygon | HiMeet";
const DESC = "Live state of the HiMeet betting contract on Polygon, read straight from the blockchain: USDC held, games created, bet cap, fee, owner and oracle. What is fixed in code, who can do what, and honest risks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["HiMeet transparency", "ChessEscrow", "Polygon USDC escrow", "chess betting contract", "прозрачность контракта", "ставки в шахматах USDC"],
  alternates: { canonical: "/transparency/" },
  openGraph: { type: "website", url: SITE + "/transparency/", title: TITLE, description: DESC, images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": SITE + "/transparency/#page", url: SITE + "/transparency/", name: TITLE, description: DESC, isPartOf: { "@id": SITE + "/#site" }, inLanguage: ["en", "ru"], dateModified: "2026-11-09" },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "HiMeet", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Transparency", item: SITE + "/transparency/" },
    ] },
  ],
}).replace(/</g, "\\u003c");

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {children}
    </>
  );
}

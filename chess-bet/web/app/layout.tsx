import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/ctx";
import OpenSplash from "@/components/OpenSplash";
import TelegramInit from "@/components/TelegramInit";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SITE = "https://chessbet.lol";
const TITLE = "Chess Bet: Play Chess Online for USDC | Skill-Based Chess Stakes";
const DESC = "Play online chess against real players for USDC on Polygon. Winner takes 94% of the pot, paid by a smart contract. Free practice vs bot, cartoon pieces, chess NFTs, Telegram Mini App.";

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": SITE + "/#site", url: SITE, name: "Chess Bet", description: DESC, inLanguage: ["en", "de", "fr", "es", "pt", "zh", "ar", "tr", "ru"] },
    { "@type": "WebApplication", "@id": SITE + "/#app", name: "Chess Bet", url: SITE, applicationCategory: "GameApplication", genre: "Chess", operatingSystem: "Any (web browser, Android, Telegram Mini App)", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to open and practise; stakes are optional" } },
    { "@type": "FAQPage", mainEntity: [
      { "@type": "Question", name: "Which currency and network does Chess Bet use?", acceptedAnswer: { "@type": "Answer", text: "USDC on the Polygon network, plus a small amount of POL for network fees." } },
      { "@type": "Question", name: "What is the fee?", acceptedAnswer: { "@type": "Answer", text: "The fee is 6% of the pot, so the winner receives 94%. Draws and cancelled games are refunded in full." } },
      { "@type": "Question", name: "Who holds the stakes?", acceptedAnswer: { "@type": "Answer", text: "A smart contract holds the stakes, and the winner claims the prize from it." } },
      { "@type": "Question", name: "Can I practise for free?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can play chess against a bot or a friend for free without any stake." } },
    ] },
  ],
}).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | Chess Bet" },
  description: DESC,
  applicationName: "Chess Bet",
  keywords: ["chess online", "play chess for money", "chess betting", "chess USDC", "crypto chess", "chess stakes", "play chess vs bot", "chess NFT", "Polygon chess game", "web3 chess", "chess Telegram mini app", "chess tournaments", "online chess with friends", "free chess practice"],
  alternates: { canonical: "/" },
  authors: [{ name: "Chess Bet" }],
  creator: "Chess Bet",
  category: "games",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website", url: SITE, siteName: "Chess Bet", locale: "en_US",
    title: TITLE, description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Chess Bet: play chess for USDC" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#0e2233", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="icon" href={`${BASE}/icon-192.png`} />
        <link rel="apple-touch-icon" href={`${BASE}/icon-192.png`} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <OpenSplash />
        <TelegramInit />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("${BASE}/sw.js",{scope:"${BASE}/"}).catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/ctx";
import OpenSplash from "@/components/OpenSplash";
import TelegramInit from "@/components/TelegramInit";
import Analytics from "@/components/Analytics";
import CallWindow from "@/components/CallWindow";
import AutoLogin from "@/components/AutoLogin";
import WelcomeInvite from "@/components/WelcomeInvite";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SITE = "https://himeet.online";
const TITLE = "HiMeet: Social Network with Free Chat, Calls and Translation";
const DESC = "HiMeet is a social network where you can talk to people in any language: free chat and calls with message translation, a community feed, worldwide classifieds, 18+ dating and chess. Sign in with email or Google."; // HiMeet social

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": SITE + "/#site", url: SITE, name: "HiMeet", alternateName: "HiMeet: Social Network with Free Chat, Calls and Translation", publisher: { "@id": SITE + "/#org" }, description: DESC, inLanguage: ["en", "de", "fr", "es", "pt", "zh", "ar", "tr", "ru"] },
    { "@type": "Organization", "@id": SITE + "/#org", name: "HiMeet", alternateName: "Rook Club", url: SITE, logo: SITE + "/icon-512.png", email: "chessgrokearn@gmail.com", sameAs: ["https://t.me/chess_betlolbot", "https://www.producthunt.com/products/chess-bet"] },
    { "@type": "WebApplication", "@id": SITE + "/#app", name: "HiMeet", url: SITE, applicationCategory: "SocialNetworkingApplication", applicationSubCategory: "Social network, worldwide classifieds, dating, chess", featureList: ["Social network with profiles, posts, feed and private and voice messages", "Free worldwide classifieds with translation of ads and chat", "Free 18+ dating with profiles, likes and matches", "Online chess for USDC stakes on Polygon held by a smart contract", "Free chess against a bot or a friend, puzzles and tournaments", "Chess NFTs on Polygon"], operatingSystem: "Any (web browser, Android, Telegram Mini App)", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to open and practise; stakes are optional" } },
    { "@type": "FAQPage", mainEntity: [
      { "@type": "Question", name: "What is HiMeet (Rook Club)?", acceptedAnswer: { "@type": "Answer", text: "HiMeet is a social network with free chat and calls with message translation, a community feed, free worldwide classifieds (ads and chat are translated into your language), 18+ dating and online chess. Adults can optionally play chess for USDC on Polygon; this is separate from the social features." } },
      { "@type": "Question", name: "Is there dating on HiMeet?", acceptedAnswer: { "@type": "Answer", text: "Yes. Dating is free and for adults only (18+): profiles with up to 3 photos, filters, likes, matches and private chat." } },
      { "@type": "Question", name: "What is a chess NFT on HiMeet?", acceptedAnswer: { "@type": "Answer", text: "In the NFT Studio you pick a move from your own finished game and combine it with a cartoon chess piece, a mood and a background. The result is an ERC-721 NFT on Polygon that shows the board position of that move. Each move of a game can become an NFT only once." } },
      { "@type": "Question", name: "What are HiMeet classifieds and are chats translated?", acceptedAnswer: { "@type": "Answer", text: "HiMeet has an international classifieds board in the Rook Club community: for sale, wanted, rent, jobs and services in any country and city. Ads and chat messages can be translated into your language with one tap. Your first ad is free." } },
      { "@type": "Question", name: "Can I practise for free?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can play chess against a bot or a friend for free without any stake." } },
    ] },
  ],
}).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | HiMeet" },
  description: DESC,
  applicationName: "HiMeet",
  keywords: ["social network", "free chat with translation", "language exchange", "free messenger", "free calls", "chat translator", "worldwide classifieds", "free classifieds", "online dating 18+", "community feed", "cartoon chess", "chess online", "play chess vs bot", "online chess with friends", "free chess practice"],
  alternates: { canonical: "/" },
  authors: [{ name: "HiMeet" }],
  creator: "HiMeet",
  category: "social",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website", url: SITE, siteName: "HiMeet", locale: "en_US",
    title: TITLE, description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HiMeet: free messenger, classifieds, dating and chess" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#fff4f8", width: "device-width", initialScale: 1 };

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
        <Providers>{children}<AutoLogin /><WelcomeInvite /><CallWindow /><Analytics /></Providers>
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

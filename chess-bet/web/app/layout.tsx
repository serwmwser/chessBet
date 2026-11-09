import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/ctx";
import OpenSplash from "@/components/OpenSplash";
import TelegramInit from "@/components/TelegramInit";
import Analytics from "@/components/Analytics";
import CallWindow from "@/components/CallWindow";
import AutoLogin from "@/components/AutoLogin";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SITE = "https://chessbet.lol";
const TITLE = "Chess Bet: Social Network, Classifieds, Dating & Chess for USDC";
const DESC = "Social network with free worldwide classifieds and chat translation, 18+ dating and online chess for USDC stakes on Polygon. Winner gets 90% via smart contract.";

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": SITE + "/#site", url: SITE, name: "Chess Bet", alternateName: "Chess Bet: Social Network, Classifieds, Dating & Chess for USDC", publisher: { "@id": SITE + "/#org" }, description: DESC, inLanguage: ["en", "de", "fr", "es", "pt", "zh", "ar", "tr", "ru"] },
    { "@type": "Organization", "@id": SITE + "/#org", name: "Chess Bet", alternateName: "Rook Club", url: SITE, logo: SITE + "/icon-512.png", email: "chessgrokearn@gmail.com", sameAs: ["https://t.me/chess_betlolbot", "https://www.producthunt.com/products/chess-bet"] },
    { "@type": "WebApplication", "@id": SITE + "/#app", name: "Chess Bet", url: SITE, applicationCategory: "SocialNetworkingApplication", applicationSubCategory: "Social network, worldwide classifieds, dating, chess", featureList: ["Social network with profiles, posts, feed and private and voice messages", "Free worldwide classifieds with translation of ads and chat", "Free 18+ dating with profiles, likes and matches", "Online chess for USDC stakes on Polygon held by a smart contract", "Free chess against a bot or a friend, puzzles and tournaments", "Chess NFTs on Polygon"], operatingSystem: "Any (web browser, Android, Telegram Mini App)", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to open and practise; stakes are optional" } },
    { "@type": "FAQPage", mainEntity: [
      { "@type": "Question", name: "What is Chess Bet (Rook Club)?", acceptedAnswer: { "@type": "Answer", text: "Chess Bet is a social network with free worldwide classifieds (ads and chat are translated into your language), 18+ dating, and online chess where players can stake USDC on Polygon. It also has free chess puzzles, tournaments and chess NFTs." } },
      { "@type": "Question", name: "Is there dating on Chess Bet?", acceptedAnswer: { "@type": "Answer", text: "Yes. Dating is free and for adults only (18+): profiles with up to 3 photos, filters, likes, matches and private chat." } },
      { "@type": "Question", name: "Which currency and network does Chess Bet use?", acceptedAnswer: { "@type": "Answer", text: "USDC on the Polygon network, plus a small amount of POL for network fees." } },
      { "@type": "Question", name: "What is the fee?", acceptedAnswer: { "@type": "Answer", text: "The fee is 10% of the pot, so the winner receives 90%. Draws and cancelled games are refunded in full." } },
      { "@type": "Question", name: "Who holds the stakes?", acceptedAnswer: { "@type": "Answer", text: "A smart contract holds the stakes, and the winner claims the prize from it." } },
      { "@type": "Question", name: "What is a chess NFT on Chess Bet?", acceptedAnswer: { "@type": "Answer", text: "In the NFT Studio you pick a move from your own finished game and combine it with a cartoon chess piece, a mood and a background. The result is an ERC-721 NFT on Polygon that shows the board position of that move. Each move of a game can become an NFT only once." } },
      { "@type": "Question", name: "Can I sell a chess NFT on OpenSea?", acceptedAnswer: { "@type": "Answer", text: "Yes. The NFTs are standard ERC-721 tokens on Polygon with 5% creator royalties (ERC-2981), so they can be listed and traded on OpenSea." } },
      { "@type": "Question", name: "How do I play chess for crypto?", acceptedAnswer: { "@type": "Answer", text: "Sign in or connect a wallet, get USDC and a little POL on Polygon, create a game with a stake or join one in the lobby, and play. The winner claims 90% of the pot from the smart contract." } },
      { "@type": "Question", name: "What are Chess Bet classifieds and are chats translated?", acceptedAnswer: { "@type": "Answer", text: "Chess Bet has an international classifieds board in the Rook Club community: for sale, wanted, rent, jobs and services in any country and city. Ads and chat messages can be translated into your language with one tap. Your first ad is free." } },
      { "@type": "Question", name: "Can I practise for free?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can play chess against a bot or a friend for free without any stake." } },
    ] },
  ],
}).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | Chess Bet" },
  description: DESC,
  applicationName: "Chess Bet",
  keywords: ["social network", "worldwide classifieds", "classifieds with chat translation", "free classifieds", "online dating 18+", "chess online", "play chess for money", "chess betting", "chess USDC", "crypto chess", "chess stakes", "play chess vs bot", "chess NFT", "chess NFT collection", "NFT chess game", "chess NFT OpenSea", "mint chess move NFT", "play to earn chess", "crypto chess game", "USDC chess game", "blockchain chess", "Polygon chess game", "web3 chess", "chess Telegram mini app", "chess tournaments", "online chess with friends", "free chess practice"],
  alternates: { canonical: "/" },
  authors: [{ name: "Chess Bet" }],
  creator: "Chess Bet",
  category: "games",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website", url: SITE, siteName: "Chess Bet", locale: "en_US",
    title: TITLE, description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Chess Bet: social network, classifieds, dating and chess for USDC" }],
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
        <Providers>{children}<AutoLogin /><CallWindow /><Analytics /></Providers>
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

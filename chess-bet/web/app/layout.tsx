import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/ctx";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Chess Bet — chess for USDC",
  description: "Play chess against other players for USDC on Polygon, or practise against a bot for free.",
  applicationName: "Chess Bet",
};
export const viewport: Viewport = { themeColor: "#060a1c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="icon" href={`${BASE}/icon-192.png`} />
        <link rel="apple-touch-icon" href={`${BASE}/icon-192.png`} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("${BASE}/sw.js",{scope:"${BASE}/"}).catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}

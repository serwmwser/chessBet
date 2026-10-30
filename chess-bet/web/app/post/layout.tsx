import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post | Rook Club by Chess Bet",
  description: "A post on Rook Club, the community for chess, crypto and NFT fans by Chess Bet.",
  alternates: { canonical: "/post/" },
  robots: { index: false, follow: true },
  openGraph: { title: "Post on Rook Club", description: "Chess, crypto and NFT community by Chess Bet.", url: "https://chessbet.lol/post/", siteName: "Chess Bet", type: "article" },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}

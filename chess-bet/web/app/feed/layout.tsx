import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rook Club Feed | Chess Bet",
  description: "Rook Club feed: latest posts from chess, crypto and NFT fans, plus posts from people you follow.",
  alternates: { canonical: "/feed/" },
  robots: { index: false, follow: true },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}

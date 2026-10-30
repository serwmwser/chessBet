import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rook Club Profile | Chess Bet",
  description: "Rook Club by Chess Bet: a community for chess, crypto and NFT fans. Profiles with posts, photos, followers and NFTs.",
  alternates: { canonical: "/u/" },
  robots: { index: false, follow: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

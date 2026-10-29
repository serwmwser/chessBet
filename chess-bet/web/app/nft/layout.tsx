import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess NFT Studio: Turn Your Best Move into an NFT",
  description: "Pick a move from your own finished Chess Bet game, add a cartoon chess piece, a mood and a background, and mint it as an NFT on Polygon. Sell it on OpenSea with 5% creator royalties.",
  alternates: { canonical: "/nft/" },
};

export default function NftLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Player Profile | Chess Bet",
  description: "Chess Bet player profile: posts, photos, followers and NFTs of a chess and crypto fan.",
  alternates: { canonical: "/u/" },
  robots: { index: false, follow: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

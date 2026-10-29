import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Chess Bet roadmap: what is ready and what is coming next, from tournaments and ratings to NFTs and Telegram features.",
  alternates: { canonical: "/roadmap/" },
};

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return children;
}

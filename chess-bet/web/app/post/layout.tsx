import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post | Rook Club by HiMeet",
  description: "A post on Rook Club, the community for chess, crypto and NFT fans by HiMeet.",
  alternates: { canonical: "/post/" },
  robots: { index: false, follow: true },
  openGraph: { title: "Post on Rook Club", description: "Chess, crypto and NFT community by HiMeet.", url: "https://serwmwser.github.io/post/", siteName: "HiMeet", type: "article" },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}

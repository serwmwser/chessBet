import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages | Rook Club by Chess Bet",
  description: "Private messages between Rook Club members.",
  alternates: { canonical: "/messages/" },
  robots: { index: false, follow: false },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Age Requirement 18+ and Responsible Play",
  description: "Chess Bet is for adults only (18+). What you confirm when you play, how we handle age, and tips for responsible play with USDC stakes.",
  alternates: { canonical: "/age/" },
};

export default function AgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

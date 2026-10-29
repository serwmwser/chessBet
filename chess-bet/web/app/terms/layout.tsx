import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use of Chess Bet: age 18+, how USDC stakes work, fees, refunds, responsible play and your responsibilities.",
  alternates: { canonical: "/terms/" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

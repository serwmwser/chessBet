import type { Metadata } from "next";

// Панель модератора не должна попадать в поисковики
export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

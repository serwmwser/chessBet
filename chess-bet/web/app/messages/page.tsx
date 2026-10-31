"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/urls";

/** Старый адрес /messages/ (ссылки из уведомлений): переносит в раздел «Чат» профиля */
function Go() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const w = (sp.get("with") || "").replace(/^@/, "");
    router.replace(`${ROUTES.profile}?tab=chat${w ? `&with=${encodeURIComponent(w)}` : ""}`);
  }, [sp, router]);
  return <p className="text-center opacity-60 p-6">…</p>;
}

export default function MessagesRedirect() {
  return (
    <Suspense fallback={null}>
      <Go />
    </Suspense>
  );
}

"use client";
import { mediaUrl } from "./Avatar";
import type { Attach } from "@/lib/attach";

/** Вложение в сообщении или письме: фото (открывается по нажатию) или PDF (скачивание) */
export default function FileBubble({ f, ru }: { f: Attach; ru: boolean }) {
  const url = mediaUrl(f.path);
  if (f.image) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={ru ? "Фото" : "Photo"} loading="lazy" className="rounded-lg max-h-64 w-auto max-w-full" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 underline">
      <span aria-hidden>📄</span><span>PDF · {f.kb} {ru ? "КБ" : "KB"}</span><span aria-hidden>⬇</span>
    </a>
  );
}

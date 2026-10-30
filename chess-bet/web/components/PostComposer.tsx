"use client";
import { useRef, useState } from "react";
import { API_URL } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { errText, publish, type SPost, type SUser } from "@/lib/social";
import Avatar from "./Avatar";

const MAX_CHARS = 500;
const MAX_PHOTOS = 4;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Сжимает фото в браузере: до 1600 px по длинной стороне, JPEG. Заодно убирает метаданные (геопозицию и т. п.) */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("bad_image");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const toBlob = (q: number) => new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
  let b = await toBlob(0.82);
  if (b && b.size > 1_800_000) b = await toBlob(0.6);
  if (!b || b.size > 2_000_000) throw new Error("too_big");
  return b;
}

/** Сжимает и загружает фото на сервер, возвращает путь вида /media/... (нужен вход) */
export async function uploadImage(token: string, file: File): Promise<string> {
  if (!OK_TYPES.includes(file.type)) throw new Error("bad_image");
  if (file.size > 20_000_000) throw new Error("too_big");
  const blob = await shrink(file);
  const r = await fetch(`${API_URL}/api/upload`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" }, body: blob });
  const j = (await r.json()) as { ok: boolean; path?: string; error?: string };
  if (!j.ok || !j.path) throw new Error(j.error || "error");
  return j.path;
}

type Item = { id: number; preview: string; path: string };
let seq = 0;

/** Окно «Post»: текст, фото, публикация в ленту профиля и подписчикам */
export default function PostComposer({ me, token, signIn, onPosted, onClose }: {
  me: SUser | null; token: string; signIn: () => Promise<string>; onPosted: (p: SPost) => void; onClose?: () => void;
}) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [up, setUp] = useState(0);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const say = (e: unknown) => {
    const m = (e as Error)?.message;
    toast(m === "too_big" ? (ru ? "Фото слишком большое" : "Photo is too large") : m === "bad_image" ? (ru ? "Нужна картинка JPG, PNG или WebP" : "Use a JPG, PNG or WebP image") : errText(e, ru), "err");
  };

  const pick = async (list: FileList | null) => {
    if (!list || !list.length) return;
    let t = token;
    try { if (!t) t = await signIn(); } catch (e) { say(e); return; }
    for (const f of Array.from(list).slice(0, MAX_PHOTOS - items.length)) {
      setUp((n) => n + 1);
      try {
        const path = await uploadImage(t, f);
        setItems((a) => (a.length < MAX_PHOTOS ? [...a, { id: ++seq, preview: URL.createObjectURL(f), path }] : a));
      } catch (e) { say(e); }
      finally { setUp((n) => n - 1); }
    }
    if (file.current) file.current.value = "";
  };
  const drop = (id: number) => setItems((a) => { const x = a.find((i) => i.id === id); if (x) URL.revokeObjectURL(x.preview); return a.filter((i) => i.id !== id); });

  const send = async () => {
    setBusy(true);
    try {
      const t = token || (await signIn());
      const p = await publish(t, text.trim(), items.map((i) => i.path));
      items.forEach((i) => URL.revokeObjectURL(i.preview));
      setText(""); setItems([]);
      toast(ru ? "Опубликовано" : "Posted", "ok");
      onPosted(p);
      onClose?.();
    } catch (e) { say(e); }
    finally { setBusy(false); }
  };

  const left = MAX_CHARS - text.length;
  const empty = !text.trim() && items.length === 0;
  return (
    <section className="card space-y-3" style={{ border: "1px solid #c8962e" }}>
      <div className="flex gap-3">
        <Avatar name={me?.name || "?"} src={me?.avatar} />
        <textarea
          value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))} rows={3} maxLength={MAX_CHARS}
          placeholder={ru ? "Что нового? Партия, NFT, идея…" : "What's happening? A game, an NFT, an idea…"}
          className="w-full bg-transparent outline-none resize-y text-base" aria-label={ru ? "Текст поста" : "Post text"}
        />
      </div>
      {(items.length > 0 || up > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {items.map((i) => (
            <div key={i.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.preview} alt="" className="w-full h-40 object-cover rounded-xl" />
              <button type="button" onClick={() => drop(i.id)} aria-label={ru ? "Убрать фото" : "Remove photo"} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-sm">✕</button>
            </div>
          ))}
          {up > 0 && <div className="h-40 rounded-xl flex items-center justify-center text-sm opacity-70 border border-dashed">{ru ? "Загрузка…" : "Uploading…"}</div>}
        </div>
      )}
      <div className="flex items-center gap-3">
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
        <button type="button" className="btn btn-ghost !py-2" disabled={items.length + up >= MAX_PHOTOS} onClick={() => file.current?.click()}>🖼 {ru ? "Фото" : "Photo"}</button>
        <span className="ml-auto text-xs" style={{ color: left < 40 ? "#e0245e" : undefined, opacity: left < 40 ? 1 : 0.6 }}>{left}</span>
        {onClose && <button type="button" className="btn btn-ghost !py-2" onClick={onClose}>{ru ? "Отмена" : "Cancel"}</button>}
        <button type="button" className="btn btn-primary !py-2" disabled={busy || up > 0 || empty} onClick={send}>
          {busy ? "…" : token ? "Post" : ru ? "Войти и опубликовать" : "Sign in & post"}
        </button>
      </div>
    </section>
  );
}

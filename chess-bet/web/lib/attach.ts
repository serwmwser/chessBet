"use client";
// Вложения (фото и PDF): загрузка на сервер и служебная строка в тексте вида [file:<имя>:<КБ>]
import { API_URL } from "./config";
import { errText } from "./social";

export const FILE_MAX = 5 * 1024 * 1024;
const FILE_RE = /^\[file:([a-f0-9]{20}\.(?:jpg|png|webp|pdf)):(\d{1,5})\]$/;
const FILE_ANY = /\[file:[a-f0-9]{20}\.(?:jpg|png|webp|pdf):\d{1,5}\]/g;

export type Attach = { path: string; kb: number; image: boolean };

/** Служебная строка для сообщения или письма */
export const encodeFile = (path: string, bytes: number) => `[file:${path.replace(/^\/media\//, "")}:${Math.max(1, Math.min(99999, Math.round(bytes / 1024)))}]`;

/** Если текст целиком является вложением, возвращает его описание, иначе null */
export function parseFile(text: string): Attach | null {
  const m = FILE_RE.exec(text.trim());
  return m ? { path: `/media/${m[1]}`, kb: Number(m[2]), image: !m[1].endsWith(".pdf") } : null;
}

/** Делит текст письма на обычный текст и вложения */
export function splitFiles(body: string): { text: string; files: Attach[] } {
  const files: Attach[] = [];
  const text = body.replace(FILE_ANY, (s) => { const a = parseFile(s); if (a) files.push(a); return ""; }).trim();
  return { text, files };
}

/** Для короткого превью: служебные строки заменяются значком скрепки */
export const stripFiles = (s: string) => s.replace(/\[file:[^\]]*\]?/g, "📎").replace(/\s+/g, " ").trim();

/** Фото с телефона уменьшаем до 1600 px, чтобы влезло в 5 МБ и быстро грузилось */
async function shrink(f: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.size <= 1.5 * 1024 * 1024) { bmp.close(); return f; }
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d");
    if (!g) { bmp.close(); return f; }
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return b && b.size < f.size ? b : f;
  } catch { return f; }
}

/** Загружает фото или PDF (нужен вход), возвращает путь /media/... и размер */
export async function uploadFile(token: string, file: File): Promise<{ path: string; bytes: number }> {
  const okType = /^image\/(jpeg|png|webp)$/.test(file.type) || file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!okType) throw new Error("bad_type");
  const blob = await shrink(file);
  if (blob.size > FILE_MAX) throw new Error("too_big");
  const [wallet, tok] = token.split("|");
  const r = await fetch(`${API_URL}/api/upload-file`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}) },
    body: blob,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; path?: string; error?: string };
  if (!j.ok || !j.path) throw new Error(j.error || "error");
  return { path: j.path, bytes: blob.size };
}

export function fileErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "bad_type" || m === "bad_file") return ru ? "Можно прикрепить фото (JPG, PNG, WebP) или PDF" : "You can attach a photo (JPG, PNG, WebP) or a PDF";
  if (m === "too_big") return ru ? "Файл больше 5 МБ" : "The file is larger than 5 MB";
  if (m === "slow_down") return ru ? "Слишком много файлов. Подождите немного" : "Too many files. Please wait a little";
  return errText(e, ru);
}

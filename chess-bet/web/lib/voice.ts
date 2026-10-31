"use client";
// Голосовые сообщения: запись, загрузка на сервер и служебная строка в тексте сообщения вида [voice:<файл>:<секунды>]
import { API_URL } from "./config";
import { errText } from "./social";

export const VOICE_MAX_SEC = 120;
const VOICE_RE = /^\[voice:([a-f0-9]{20}\.(?:webm|ogg|m4a)):(\d{1,3})\]$/;

/** Текст сообщения для голоса: путь /media/<файл> и длительность в секундах */
export const encodeVoice = (path: string, sec: number) => `[voice:${path.replace(/^\/media\//, "")}:${Math.max(1, Math.min(VOICE_MAX_SEC, Math.round(sec)))}]`;

/** Если текст сообщения — голосовое, возвращает путь и длительность, иначе null */
export function parseVoice(text: string): { path: string; sec: number } | null {
  const m = VOICE_RE.exec(text.trim());
  return m ? { path: `/media/${m[1]}`, sec: Number(m[2]) } : null;
}

/** Формат записи, который поддерживает браузер (Chrome/Firefox: webm/ogg, Safari: mp4) */
export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* пробуем следующий */ }
  }
  return "";
}

export const canRecord = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/** Загружает запись на сервер (нужен вход), возвращает путь вида /media/... */
export async function uploadVoice(token: string, blob: Blob): Promise<string> {
  const [wallet, tok] = token.split("|");
  const r = await fetch(`${API_URL}/api/upload-voice`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}) },
    body: blob,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; path?: string; error?: string };
  if (!j.ok || !j.path) throw new Error(j.error || "error");
  return j.path;
}

export function voiceErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "bad_audio") return ru ? "Не удалось обработать запись" : "Could not process the recording";
  if (m === "too_big") return ru ? "Запись слишком большая" : "The recording is too large";
  if (m === "NotAllowedError" || (e as Error)?.name === "NotAllowedError") return ru ? "Нет доступа к микрофону. Разрешите его в настройках браузера" : "No microphone access. Allow it in your browser settings";
  if ((e as Error)?.name === "NotFoundError") return ru ? "Микрофон не найден" : "No microphone found";
  return errText(e, ru);
}

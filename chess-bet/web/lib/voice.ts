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

/** Открывает микрофон. На Android «Could not start audio source» часто временная: пробуем два набора настроек и до трёх раз с паузой */
export async function openMic(): Promise<MediaStream> {
  const tries: MediaStreamConstraints[] = [{ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }, { audio: true }, { audio: { echoCancellation: true, noiseSuppression: true } }];
  let last: unknown = new Error("mic");
  for (let i = 0; i < 3; i++) {
    for (const c of tries) {
      try { return await navigator.mediaDevices.getUserMedia(c); }
      catch (e) {
        last = e;
        const n = (e as Error)?.name;
        if (n === "NotAllowedError" || n === "NotFoundError" || n === "SecurityError") throw e; // повтор не поможет
      }
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw last;
}

/** Максимальный размер файла с записью: лимит сервера 2 МБ */
export const VOICE_FILE_MAX = 2 * 1024 * 1024 - 1024;

/** Длительность аудиофайла в секундах (если узнать не удалось, 1) */
export function audioSeconds(f: Blob): Promise<number> {
  return new Promise((res) => {
    const u = URL.createObjectURL(f);
    const a = new Audio();
    let done = false;
    const end = (s: number) => { if (done) return; done = true; URL.revokeObjectURL(u); res(s); };
    a.preload = "metadata";
    a.onloadedmetadata = () => end(Number.isFinite(a.duration) && a.duration > 0 ? Math.max(1, Math.round(a.duration)) : 1);
    a.onerror = () => end(1);
    setTimeout(() => end(1), 3000);
    a.src = u;
  });
}

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
  if ((e as Error)?.name === "NotReadableError" || (e as Error)?.name === "AbortError" || /audio source|Could not start/i.test(String((e as Error)?.message || ""))) {
    return ru ? "Микрофон занят или не запускается. Закройте приложения, которые используют микрофон (звонки, запись экрана, игры, видео), и попробуйте снова. Или запишите голос в приложении «Диктофон» телефона, нажмите 📱 рядом с микрофоном и выберите запись" : "The microphone is busy or cannot start. Close apps that use the microphone (calls, screen recording, games, video) and try again. Or record in your phone's Recorder app, tap 📱 next to the microphone and pick the recording";
  }
  return errText(e, ru);
}

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

/** Открывает микрофон: обычный запрос, затем без обработки звука, затем по очереди каждое устройство ввода (на части телефонов устройство «по умолчанию» не запускается) */
export async function openMic(): Promise<MediaStream> {
  const gum = (a: MediaTrackConstraints | boolean) => navigator.mediaDevices.getUserMedia({ audio: a });
  const hard = (e: unknown) => { const n = (e as Error)?.name; return n === "NotAllowedError" || n === "SecurityError"; };
  const tries: (MediaTrackConstraints | boolean)[] = [true, { echoCancellation: false, noiseSuppression: false, autoGainControl: false }];
  let last: unknown = new Error("mic");
  for (let round = 0; round < 2; round++) {
    for (const c of tries) {
      try { return await gum(c); } catch (e) { last = e; if (hard(e)) throw e; }
    }
    try {
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId);
      for (const d of devs) {
        try { return await gum({ deviceId: { exact: d.deviceId } }); } catch (e) { last = e; if (hard(e)) throw e; }
      }
    } catch { /* список устройств недоступен */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw last;
}

function micHelp(ru: boolean): string {
  return ru
    ? "Микрофон не запускается. Разрешите его приложению, в котором открыт сайт (Bitget Wallet, Chrome или другое): Настройки телефона → Приложения → название приложения → Разрешения → Микрофон → Разрешить. Затем закройте приложение полностью и откройте заново. Если не помогло, закройте другие приложения с микрофоном (звонки, запись экрана, видео)"
    : "The microphone cannot start. Allow it for the app that opens the site (Bitget Wallet, Chrome or another): phone Settings → Apps → the app → Permissions → Microphone → Allow. Then close the app completely and reopen it. If that does not help, close other apps that use the microphone (calls, screen recording, video)";
}

export function voiceErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "bad_audio") return ru ? "Не удалось обработать запись" : "Could not process the recording";
  if (m === "too_big") return ru ? "Запись слишком большая" : "The recording is too large";
  if (m === "NotAllowedError" || (e as Error)?.name === "NotAllowedError") return micHelp(ru);
  if ((e as Error)?.name === "NotFoundError") return ru ? "Микрофон не найден" : "No microphone found";
  if ((e as Error)?.name === "NotReadableError" || /audio source/i.test(String((e as Error)?.message || ""))) {
    return micHelp(ru);
  }
  return errText(e, ru);
}

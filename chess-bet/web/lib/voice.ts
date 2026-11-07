"use client";
// Голосовые сообщения: запись, загрузка на сервер и служебная строка в тексте сообщения вида [voice:<файл>:<секунды>]
import { API_URL } from "./config";
import { errText } from "./social";

// Диагностика: считаем микрофонные потоки и звуковые контексты, которые открыла сама страница
type Probe = { streams: MediaStream[]; ctxs: AudioContext[] };
const probe: Probe = { streams: [], ctxs: [] };
if (typeof window !== "undefined" && !(window as unknown as { __cbProbe?: Probe }).__cbProbe) {
  (window as unknown as { __cbProbe?: Probe }).__cbProbe = probe;
  try {
    const md = navigator.mediaDevices;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c?: MediaStreamConstraints) => { const s = await orig(c); probe.streams.push(s); return s; };
  } catch { /* нет mediaDevices */ }
  try {
    const AC = window.AudioContext;
    if (AC) {
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = class extends AC {
        constructor(o?: AudioContextOptions) { super(o); probe.ctxs.push(this); }
      };
    }
  } catch { /* нет AudioContext */ }
}
/** Сколько живых микрофонных дорожек и незакрытых звуковых контекстов открыла страница */
export function probeInfo(): string {
  const live = probe.streams.reduce((n, s) => n + s.getAudioTracks().filter((t) => t.readyState === "live").length, 0);
  const ctx = probe.ctxs.filter((c) => c.state !== "closed").length;
  return "mic " + live + ", ctx " + ctx + "/" + probe.ctxs.length;
}

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

export function voiceErr(e: unknown, ru: boolean): string {
  const m = (e as Error)?.message;
  if (m === "bad_audio") return ru ? "Не удалось обработать запись" : "Could not process the recording";
  if (m === "too_big") return ru ? "Запись слишком большая" : "The recording is too large";
  if (m === "NotAllowedError" || (e as Error)?.name === "NotAllowedError") return ru ? "Нет доступа к микрофону. Разрешите его в настройках браузера" : "No microphone access. Allow it in your browser settings";
  if ((e as Error)?.name === "NotFoundError") return ru ? "Микрофон не найден" : "No microphone found";
  if ((e as Error)?.name === "NotReadableError" || /audio source/i.test(String((e as Error)?.message || ""))) {
    return ru ? "Микрофон занят или не запускается. Закройте приложение полностью, откройте заново и попробуйте снова. Если не помогло, закройте другие приложения с микрофоном (звонки, запись экрана, видео)" : "The microphone is busy or cannot start. Close the app completely, reopen it and try again. If that does not help, close other apps that use the microphone (calls, screen recording, video)";
  }
  return errText(e, ru);
}

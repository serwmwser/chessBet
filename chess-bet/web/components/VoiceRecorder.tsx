"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { releaseAudio, resumeAudio } from "@/lib/sfx";
import { VOICE_MAX_SEC, canRecord, encodeVoice, openMic, pickMime, probeInfo, uploadVoice, voiceErr } from "@/lib/voice";

/** Короткая диагностика для сообщения об ошибке: что ещё может занимать звук */
function diag(): string {
  try {
    const ss = window.speechSynthesis;
    const med = Array.from(document.querySelectorAll("audio,video"));
    return "(tts " + (ss?.speaking ? 1 : 0) + (ss?.pending ? 1 : 0) + ", media " + med.filter((m) => !(m as HTMLMediaElement).paused).length + "/" + med.length + ", " + document.visibilityState + ", " + probeInfo() + ")";
  } catch { return ""; }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Кнопка 🎤: запись до 2 минут, «✕» отменяет, «➤» отправляет. onVoice получает готовый текст сообщения */
export default function VoiceRecorder({ token, disabled, onVoice }: { token: string; disabled?: boolean; onVoice: (text: string) => Promise<void> }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [state, setState] = useState<"idle" | "rec" | "up">("idle");
  const [sec, setSec] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const t0 = useRef(0);
  const act = useRef<"send" | "cancel">("send");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const opening = useRef(false); // микрофон сейчас открывается

  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
    resumeAudio();
    try { window.dispatchEvent(new Event("cb-mic-stop")); } catch { /* вне браузера */ } // музыка может вернуться
  };
  useEffect(() => () => { act.current = "cancel"; try { rec.current?.stop(); } catch { /* уже остановлена */ } release(); }, []);

  const finish = (how: "send" | "cancel") => {
    act.current = how;
    try { rec.current?.stop(); } catch { release(); setState("idle"); }
  };

  const start = async () => {
    if (!canRecord()) { toast(ru ? "Этот браузер не умеет записывать голос" : "This browser cannot record voice", "err"); return; }
    if (opening.current || rec.current) return; // двойное нажатие не должно открывать микрофон дважды
    opening.current = true;
    setState("up"); // пока микрофон открывается, кнопка неактивна
    try {
      release(); // закрываем прежний поток: незакрытый поток держит микрофон, и новый не запускается
      window.dispatchEvent(new Event("cb-mic-start")); // музыка выключается на время записи
      try { window.speechSynthesis?.cancel(); } catch { /* нет озвучки */ } // озвучка фигур может держать звук Android
      document.querySelectorAll("audio,video").forEach((m) => { try { (m as HTMLMediaElement).pause(); } catch { /* уже остановлен */ } });
      await releaseAudio(); // закрываем звуковой контекст звуков игры
      await new Promise((r) => setTimeout(r, 250));
      const st = await openMic();
      stream.current = st;
      const mime = pickMime();
      const r = new MediaRecorder(st, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      chunks.current = [];
      act.current = "send";
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = async () => {
        const how = act.current;
        const secs = Math.round((Date.now() - t0.current) / 1000);
        const type = r.mimeType || mime || "audio/webm";
        release();
        if (how === "cancel") { setState("idle"); return; }
        if (secs < 1) { toast(ru ? "Слишком короткая запись" : "Recording is too short", "err"); setState("idle"); return; }
        setState("up");
        try {
          const path = await uploadVoice(token, new Blob(chunks.current, { type }));
          await onVoice(encodeVoice(path, Math.min(secs, VOICE_MAX_SEC)));
        } catch (e) { toast(voiceErr(e, ru), "err"); }
        finally { setState("idle"); }
      };
      rec.current = r;
      t0.current = Date.now();
      setSec(0);
      r.start();
      opening.current = false;
      setState("rec");
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0.current) / 1000);
        setSec(s);
        if (s >= VOICE_MAX_SEC) finish("send");
      }, 250);
    } catch (e) { opening.current = false; release(); setState("idle"); toast(voiceErr(e, ru) + " [" + ((e as Error)?.name || "?") + "] " + diag(), "err"); }
  };

  if (state === "rec") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#e0245e" }} />
        <span className="tabular-nums w-10">{fmt(sec)}</span>
        <button type="button" className="btn btn-ghost !py-1.5 !px-3" onClick={() => finish("cancel")} aria-label={ru ? "Отменить запись" : "Cancel recording"}>✕</button>
        <button type="button" className="btn btn-primary !py-1.5 !px-3" onClick={() => finish("send")} aria-label={ru ? "Отправить голосовое" : "Send voice message"}>➤</button>
      </div>
    );
  }
  return (
    <button type="button" className="btn btn-ghost !py-2 !px-3" disabled={disabled || state === "up"} onClick={start} aria-label={ru ? "Записать голосовое сообщение" : "Record a voice message"} title={ru ? "Голосовое сообщение" : "Voice message"}>
      {state === "up" ? "…" : "🎤"}
    </button>
  );
}

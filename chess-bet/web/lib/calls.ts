"use client";
// Звонки из профиля: соединение с сервером (/call), WebRTC (голос напрямую между пользователями) и состояние для интерфейса.
// Сервер: server/src/calls.ts. Окно звонка: components/CallWindow.tsx, кнопка: components/CallButton.tsx.
import { useSyncExternalStore } from "react";
import { API_URL, WS_URL } from "./config";

export const CALL_URL = WS_URL.replace(/\/ws$/, "/call");

export type CallStatus = "off" | "idle" | "calling" | "incoming" | "connecting" | "active";
export type Peer = { name: string; avatar: string };
export type CallState = {
  status: CallStatus; peer: Peer | null; id: string; secs: number; muted: boolean;
  error: string;                                   // код последней ошибки (для тоста)
  ended: { reason: string; secs: number; at: number } | null; // как закончился последний звонок
};

const INIT: CallState = { status: "off", peer: null, id: "", secs: 0, muted: false, error: "", ended: null };
let state: CallState = INIT;
const listeners = new Set<() => void>();
function set(p: Partial<CallState>) { state = { ...state, ...p }; listeners.forEach((l) => l()); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Текущее состояние без подписки (для обработчиков событий) */
export const getCallState = (): CallState => state;

/** Состояние звонка для компонентов */
export function useCallState(): CallState {
  return useSyncExternalStore(subscribe, () => state, () => INIT);
}

let ws: WebSocket | null = null;
let token = "";
let wantOn = false;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let ice: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
let pc: RTCPeerConnection | null = null;
let local: MediaStream | null = null;
let pending: RTCIceCandidateInit[] = [];
let pingTimer: ReturnType<typeof setInterval> | null = null;
let connTimer: ReturnType<typeof setTimeout> | null = null;
let audio: HTMLAudioElement | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let actx: AudioContext | null = null;
let iAmCaller = false;

const send = (o: unknown) => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); };

// ---------- сигнал вызова ----------
function beep() {
  try {
    actx = actx ?? new AudioContext();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 520; g.gain.value = 0.06;
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.35);
  } catch { /* звук необязателен */ }
}
function startRing() {
  stopRing(); beep();
  try { navigator.vibrate?.([300, 200, 300]); } catch { /* необязательно */ }
  ringTimer = setInterval(() => { beep(); try { navigator.vibrate?.([300, 200, 300]); } catch { /* необязательно */ } }, 2000);
}
function stopRing() { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } }

// ---------- очистка ----------
function cleanup() {
  stopRing();
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  if (connTimer) { clearTimeout(connTimer); connTimer = null; }
  if (pc) { pc.ontrack = null; pc.onicecandidate = null; pc.onconnectionstatechange = null; try { pc.close(); } catch { /* уже закрыто */ } pc = null; }
  if (local) { local.getTracks().forEach((t) => t.stop()); local = null; }
  if (audio) { audio.srcObject = null; }
  pending = [];
}
function finish(reason: string, secs: number) {
  cleanup();
  set({ status: ws && ws.readyState === WebSocket.OPEN ? "idle" : wantOn ? "idle" : "off", peer: null, id: "", secs: 0, muted: false, ended: { reason, secs, at: Date.now() } });
}

// ---------- WebRTC ----------
async function mic(): Promise<boolean> {
  try {
    local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    return true;
  } catch { set({ error: "mic" }); return false; }
}

function makePc(id: string) {
  pc = new RTCPeerConnection({ iceServers: ice });
  local?.getTracks().forEach((t) => pc!.addTrack(t, local!));
  pc.onicecandidate = (e) => { if (e.candidate) send({ t: "signal", id, data: { type: "candidate", candidate: e.candidate.toJSON() } }); };
  pc.ontrack = (e) => {
    audio = audio ?? new Audio();
    audio.autoplay = true;
    audio.srcObject = e.streams[0];
    void audio.play().catch(() => { /* браузер разрешит после нажатия */ });
  };
  pc.onconnectionstatechange = () => {
    const s = pc?.connectionState;
    if (s === "connected") {
      if (connTimer) { clearTimeout(connTimer); connTimer = null; }
      set({ status: "active" });
      if (!pingTimer) { send({ t: "ping", id }); pingTimer = setInterval(() => send({ t: "ping", id }), 5000); } // секунды идут, пока связь живая
    } else if (s === "disconnected" || s === "failed") {
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      if (s === "failed") { set({ error: "network" }); hangup(); }
    }
  };
  // не соединились за 25 секунд — завершаем
  connTimer = setTimeout(() => { if (state.status === "connecting") { set({ error: "network" }); hangup(); } }, 25000);
}

async function onSignal(id: string, data: { type?: string; sdp?: string; candidate?: RTCIceCandidateInit }) {
  if (!pc || id !== state.id) return;
  try {
    if (data.type === "offer" && data.sdp) {
      await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
      for (const c of pending) await pc.addIceCandidate(c).catch(() => {});
      pending = [];
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      send({ t: "signal", id, data: { type: "answer", sdp: ans.sdp } });
    } else if (data.type === "answer" && data.sdp) {
      await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
      for (const c of pending) await pc.addIceCandidate(c).catch(() => {});
      pending = [];
    } else if (data.type === "candidate" && data.candidate) {
      if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
      else pending.push(data.candidate);
    }
  } catch { set({ error: "network" }); hangup(); }
}

// ---------- соединение с сервером ----------
function connect() {
  if (!wantOn || !token || (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING))) return;
  const s = new WebSocket(CALL_URL);
  ws = s;
  s.onopen = () => { s.send(JSON.stringify({ t: "auth", token })); };
  s.onmessage = (ev) => {
    let m: { t: string; [k: string]: unknown };
    try { m = JSON.parse(String(ev.data)); } catch { return; }
    switch (m.t) {
      case "ready": retry = 0; ice = (m.ice as RTCIceServer[]) || ice; if (state.status === "off") set({ status: "idle" }); break;
      case "ringing": set({ status: "calling", id: String(m.id), peer: m.peer as Peer, error: "" }); break;
      case "incoming": set({ status: "incoming", id: String(m.id), peer: m.from as Peer, error: "" }); startRing(); break;
      case "accepted":
        stopRing();
        set({ status: "connecting" });
        if (iAmCaller) { // звонящий создаёт предложение, принявший отвечает
          makePc(state.id);
          void (async () => {
            try { const off = await pc!.createOffer(); await pc!.setLocalDescription(off); send({ t: "signal", id: state.id, data: { type: "offer", sdp: off.sdp } }); }
            catch { set({ error: "network" }); hangup(); }
          })();
        }
        break;
      case "signal": void onSignal(String(m.id), m.data as { type?: string; sdp?: string; candidate?: RTCIceCandidateInit }); break;
      case "tick": set({ secs: Number(m.secs) || 0 }); break;
      case "ended": finish(String(m.reason), Number(m.secs) || 0); break;
      case "error": {
        const e = String(m.e);
        set({ error: e });
        if (e === "busy" || e === "offline" || e === "not_found" || e === "slow_down" || e === "busy_me" || e === "overloaded") { cleanup(); set({ status: "idle", peer: null, id: "" }); }
        break;
      }
    }
  };
  s.onclose = (ev) => {
    if (ws === s) ws = null;
    if (state.status !== "idle" && state.status !== "off") finish("disconnect", state.secs);
    if (ev.code === 4000) { wantOn = false; set({ status: "off", error: "other_tab" }); return; } // открыли в другой вкладке
    if (ev.code === 4003) { set({ status: "off" }); return; }
    set({ status: "off" });
    if (wantOn) { retry = Math.min(retry + 1, 5); retryTimer = setTimeout(connect, 1500 * retry); }
  };
}

/** Включает приём звонков для вошедшего пользователя (токен «адрес|токен»). Пустой токен — выключает */
export function startCalls(t: string) {
  if (!t) { stopCalls(); return; }
  if (t === token && wantOn) return;
  token = t; wantOn = true; retry = 0;
  if (ws) { try { ws.close(); } catch { /* закрыто */ } ws = null; }
  connect();
}
export function stopCalls() {
  wantOn = false; token = "";
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  cleanup();
  if (ws) { try { ws.close(); } catch { /* закрыто */ } ws = null; }
  set({ ...INIT, ended: state.ended });
}

// ---------- действия ----------
/** Позвонить пользователю по нику. Только после нажатия пользователя (нужен микрофон) */
export async function callUser(name: string) {
  if (state.status !== "idle") return;
  if (!(await mic())) return;
  iAmCaller = true;
  send({ t: "invite", to: name });
}
export async function acceptCall() {
  if (state.status !== "incoming") return;
  if (!(await mic())) { send({ t: "decline", id: state.id }); return; }
  iAmCaller = false;
  stopRing();
  makePc(state.id);
  send({ t: "accept", id: state.id });
}
export function declineCall() { if (state.status === "incoming") send({ t: "decline", id: state.id }); }
export function hangup() {
  if (state.id) send({ t: "hangup", id: state.id });
  else finish("hangup", state.secs);
}
export function toggleMute() {
  const next = !state.muted;
  local?.getAudioTracks().forEach((t) => { t.enabled = !next; });
  set({ muted: next });
}
export function clearCallError() { set({ error: "" }); }

/** Можно ли сейчас позвонить пользователю (в сети, не занят) */
export async function callOnline(tok: string, name: string): Promise<{ online: boolean; busy: boolean }> {
  const [wallet, t] = tok.split("|");
  try {
    const r = await fetch(`${API_URL}/api/calls/online?name=${encodeURIComponent(name)}`, { cache: "no-store", headers: t ? { authorization: `Bearer ${t}`, "x-wallet": wallet } : {} });
    const j = (await r.json()) as { ok: boolean; online?: boolean; busy?: boolean };
    return { online: !!j.online, busy: !!j.busy };
  } catch { return { online: false, busy: false }; }
}

/** Понятный текст ошибки или причины завершения (ru/en) */
export function callError(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    mic: ["Нет доступа к микрофону. Разрешите его в настройках браузера", "No microphone access. Allow it in your browser settings"],
    offline: ["Пользователь сейчас не в сети", "The user is offline"],
    busy: ["Пользователь сейчас разговаривает", "The user is on another call"],
    busy_me: ["Вы уже в разговоре", "You are already on a call"],
    not_found: ["Звонок этому пользователю недоступен", "This user cannot be called"],
    slow_down: ["Слишком много звонков, попробуйте позже", "Too many calls, try again later"],
    overloaded: ["Сервис звонков перегружен, попробуйте позже", "Calls are busy, try again later"],
    network: ["Не удалось соединиться. Проверьте сеть", "Could not connect. Check your network"],
    other_tab: ["Звонки открыты в другой вкладке", "Calls are open in another tab"],
    auth: ["Войдите на сайт", "Please sign in"],
    declined: ["Звонок отклонён", "Call declined"],
    no_answer: ["Не ответили", "No answer"],
    cancelled: ["Звонок отменён", "Call cancelled"],
    hangup: ["Звонок завершён", "Call ended"],
    disconnect: ["Связь потеряна", "Connection lost"],
    limit: ["Достигнут лимит длительности звонка", "Call length limit reached"],
    reconnect: ["Звонок прерван: страница обновлена", "Call interrupted: page reloaded"],
  };
  const x = m[code];
  return x ? (ru ? x[0] : x[1]) : ru ? "Ошибка звонка" : "Call error";
}

export const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

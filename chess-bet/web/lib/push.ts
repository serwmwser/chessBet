"use client";
// Уведомления о звонках и сообщениях (Web Push): подписка этого устройства на сервере HiMeet.
import { API_URL } from "./config";

export type PushState = "unsupported" | "denied" | "off" | "on";

const keyBytes = (s: string): Uint8Array => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function api(path: string, token: string, post: unknown) {
  const [wallet, tok] = token.split("|");
  const r = await fetch(API_URL + path, { method: "POST", cache: "no-store", headers: { "content-type": "application/json", authorization: "Bearer " + tok, "x-wallet": wallet }, body: JSON.stringify(post) });
  const j = (await r.json()) as { ok: boolean; error?: string };
  if (!j.ok) throw new Error(j.error || "error");
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch { return "off"; }
}

/** Включить уведомления. Вызывать только по нажатию кнопки (браузер спрашивает разрешение) */
export async function enablePush(token: string): Promise<PushState> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const k = (await fetch(API_URL + "/api/push/key", { cache: "no-store" }).then((r) => r.json())) as { key?: string };
  if (!k.key) throw new Error("push_off");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(k.key) as BufferSource }));
  const j = sub.toJSON();
  await api("/api/push/subscribe", token, { endpoint: j.endpoint, keys: j.keys });
  return "on";
}

export async function disablePush(token: string): Promise<PushState> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await api("/api/push/unsubscribe", token, { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch { /* уже выключено */ }
  return "off";
}

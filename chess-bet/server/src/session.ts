import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ethers } from "ethers";

const FILE = process.env.SESSIONS_FILE ?? "./data/sessions.json";
const TTL = 24 * 60 * 60_000;
const MAX = 20_000;

// ключ: sha256(токен) -> { адрес, срок }
const sessions = new Map<string, { addr: string; exp: number }>();
const h = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

try {
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const now = Date.now();
  for (const [k, v] of Object.entries<any>(raw)) if (v && v.exp > now) sessions.set(k, v);
} catch {}

let timer: NodeJS.Timeout | null = null;
function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(sessions)));
    } catch (e) { console.error("sessions save", e); }
  }, 500);
}

function prune() {
  const now = Date.now();
  for (const [k, v] of sessions) if (v.exp <= now) sessions.delete(k);
  while (sessions.size > MAX) sessions.delete(sessions.keys().next().value as string);
}

/** Одна подпись кошелька -> токен на 24 часа. Возвращает { token, exp } или код ошибки. */
export function createSession(m: any): { token: string; exp: number } | string {
  const addr = String(m?.address ?? "").toLowerCase();
  if (!ethers.isAddress(addr)) return "bad_address";
  const ts = Number(m.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 10 * 60_000) return "bad_time";
  const msg = `ChessBet session\nAddress: ${m.address}\nTime: ${ts}`;
  try {
    if (ethers.verifyMessage(msg, String(m.sig ?? "")).toLowerCase() !== addr) return "bad_signature";
  } catch { return "bad_signature"; }
  prune();
  const token = crypto.randomBytes(32).toString("hex");
  const exp = Date.now() + TTL;
  sessions.set(h(token), { addr, exp });
  save();
  return { token, exp };
}

/** Проверка токена для адреса (вход в игру и сохранение профиля). */
export function checkSession(address: unknown, token: unknown): boolean {
  const addr = String(address ?? "").toLowerCase();
  const s = sessions.get(h(String(token ?? "")));
  return !!s && s.addr === addr && s.exp > Date.now();
}

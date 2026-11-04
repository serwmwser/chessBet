// Перевод сообщений чата: POST /api/translate {text, to}. Провайдеры по порядку: DeepL (DEEPL_KEY), Google (GOOGLE_TRANSLATE_KEY), MyMemory (без ключа, малый лимит).
// Результаты кэшируются в SQLite: повторный перевод того же текста не тратит лимит провайдера.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import Database from "better-sqlite3";

const DB_FILE = process.env.SOCIAL_DB || "./data/social.db";
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.exec(`CREATE TABLE IF NOT EXISTS translations(h TEXT PRIMARY KEY, lang TEXT NOT NULL, src TEXT NOT NULL DEFAULT '', text TEXT NOT NULL, created INTEGER NOT NULL);`);

const MAX_TEXT = 1000;
const LANGS = new Set(["en", "ru", "es", "de", "fr", "it", "pt", "pl", "uk", "tr", "ar", "zh", "ja", "ko", "hi", "id", "vi", "nl", "cs", "ro", "bg", "el", "he", "th", "sv", "hu", "kk"]);
const DEEPL_TARGET: Record<string, string> = { en: "EN-US", pt: "PT-BR", zh: "ZH-HANS" };
const HOUR = 3600000, DAY = 86400000;

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

type R = { text: string; from: string };
const timeout = () => AbortSignal.timeout(8000);

async function deepl(text: string, to: string): Promise<R> {
  const key = process.env.DEEPL_KEY || "";
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/translate`, {
    method: "POST", signal: timeout(),
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: DEEPL_TARGET[to] || to.toUpperCase() }),
  });
  if (!r.ok) throw new Error("deepl_" + r.status);
  const j = (await r.json()) as { translations?: { text: string; detected_source_language?: string }[] };
  const t = j.translations?.[0];
  if (!t) throw new Error("deepl_empty");
  return { text: t.text, from: (t.detected_source_language || "").toLowerCase() };
}

async function google(text: string, to: string): Promise<R> {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(process.env.GOOGLE_TRANSLATE_KEY || "")}`, {
    method: "POST", signal: timeout(), headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target: to, format: "text" }),
  });
  if (!r.ok) throw new Error("google_" + r.status);
  const j = (await r.json()) as { data?: { translations?: { translatedText: string; detectedSourceLanguage?: string }[] } };
  const t = j.data?.translations?.[0];
  if (!t) throw new Error("google_empty");
  return { text: t.translatedText, from: (t.detectedSourceLanguage || "").toLowerCase() };
}

/** MyMemory принимает до ~500 символов за запрос: режем текст по предложениям */
function chunks(text: string, n = 400): string[] {
  const out: string[] = [];
  let cur = "";
  for (const part of text.split(/(?<=[.!?…\n])\s*/)) {
    if ((cur + " " + part).trim().length > n && cur) { out.push(cur.trim()); cur = ""; }
    let p = part;
    while (p.length > n) { out.push(p.slice(0, n)); p = p.slice(n); }
    cur = (cur + " " + p).trim();
  }
  if (cur) out.push(cur);
  return out;
}
async function mymemory(text: string, to: string): Promise<R> {
  const email = process.env.MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}` : "";
  const parts: string[] = [];
  let from = "";
  for (const c of chunks(text)) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=${encodeURIComponent("Autodetect|" + to)}${email}`, { signal: timeout() });
    if (!r.ok) throw new Error("mymemory_" + r.status);
    const j = (await r.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string }; matches?: { source?: string }[] };
    const t = j.responseData?.translatedText;
    if (Number(j.responseStatus) !== 200 || !t || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error("mymemory_limit");
    parts.push(t);
    if (!from && j.matches?.[0]?.source) from = j.matches[0].source.slice(0, 2).toLowerCase();
  }
  return { text: parts.join(" "), from };
}

async function translate(text: string, to: string): Promise<R> {
  const order: (() => Promise<R>)[] = [];
  if (process.env.DEEPL_KEY) order.push(() => deepl(text, to));
  if (process.env.GOOGLE_TRANSLATE_KEY) order.push(() => google(text, to));
  order.push(() => mymemory(text, to));
  let last: unknown = new Error("no_provider");
  for (const f of order) { try { return await f(); } catch (e) { last = e; } }
  throw last;
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > 8192) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/** POST /api/translate: только для вошедших, 60 переводов в час и 300 в сутки на человека */
export async function handleTranslate(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<boolean> {
  if (url.pathname !== "/api/translate") return false;
  const out = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); return true; };
  const bad = (e: string, code = 400) => out(code, { ok: false, error: e });
  if (req.method !== "POST") return bad("method", 405);
  if (!viewer) return bad("auth", 401);
  try {
    const m = await readBody(req);
    const text = String(m.text ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, MAX_TEXT);
    const to = String(m.to ?? "").toLowerCase().slice(0, 2);
    if (!text) return bad("empty");
    if (!LANGS.has(to)) return bad("lang");
    const h = crypto.createHash("sha256").update(to + "\n" + text).digest("hex").slice(0, 40);
    const hit = db.prepare("SELECT src, text FROM translations WHERE h=?").get(h) as { src: string; text: string } | undefined;
    if (hit) return out(200, { ok: true, text: hit.text, from: hit.src, cached: true });
    if (limited("tr_h:" + viewer, 60, HOUR) || limited("tr_d:" + viewer, 300, DAY)) return bad("slow_down", 429);
    let r: R;
    try { r = await translate(text, to); }
    catch (e) { console.error("translate", (e as Error).message); return bad("unavailable", 503); }
    if (r.from && r.from === to) return out(200, { ok: true, text, from: r.from, same: true }); // уже на этом языке
    db.prepare("INSERT OR REPLACE INTO translations(h,lang,src,text,created) VALUES(?,?,?,?,?)").run(h, to, r.from, r.text, Date.now());
    return out(200, { ok: true, text: r.text, from: r.from });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "too_big") return bad("too_big", 413);
    if (msg === "bad_json") return bad("bad_json");
    console.error("translate", e);
    return bad("server", 500);
  }
}

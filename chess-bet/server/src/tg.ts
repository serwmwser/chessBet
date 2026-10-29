// Уведомления игрокам через Telegram-бота: привязка кошелька к чату и отправка сообщений.
// Токен бота читается только из переменной TG_BOT_TOKEN на сервере (в код и в чат его вставлять не нужно).
import fs from "node:fs";
import crypto from "node:crypto";
import { ethers } from "ethers";

const TOKEN = process.env.TG_BOT_TOKEN || "";
const BOT = process.env.TG_BOT_NAME || "chess_betlolbot";
const FILE = process.env.TG_FILE || "./data/tg.json";
export const tgEnabled = TOKEN !== "";
const API = `https://api.telegram.org/bot${TOKEN}`;

type Link = { chat: number; lang: "ru" | "en" };
const links = new Map<string, Link>(); // адрес кошелька (строчными) → чат
try {
  const o = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, Link>;
  for (const [a, l] of Object.entries(o)) links.set(a, l);
} catch { /* файла ещё нет */ }
function save() {
  try {
    fs.mkdirSync(FILE.replace(/[\\/][^\\/]*$/, "") || ".", { recursive: true });
    fs.writeFileSync(FILE + ".tmp", JSON.stringify(Object.fromEntries(links)));
    fs.renameSync(FILE + ".tmp", FILE);
  } catch (e) { console.error("tg save", e); }
}

const TTL = 10 * 60 * 1000;
const challenges = new Map<string, { addr: string; action: "link" | "unlink"; exp: number }>(); // nonce → запрос на подпись
const codes = new Map<string, { addr: string; exp: number }>(); // код из ссылки → кошелёк
const sweep = () => {
  const now = Date.now();
  for (const [k, v] of challenges) if (v.exp < now) challenges.delete(k);
  for (const [k, v] of codes) if (v.exp < now) codes.delete(k);
};
const textFor = (addr: string, action: string, nonce: string) =>
  `Chess Bet: ${action === "link" ? "включить" : "выключить"} уведомления в Telegram\nКошелёк: ${addr}\nКод: ${nonce}\nПодпись бесплатна и не тратит деньги.`;

/** Шаг 1: сайт просит текст для подписи */
export function tgChallenge(addrIn: string, action: "link" | "unlink") {
  if (!tgEnabled) throw new Error("tg_off");
  if (!ethers.isAddress(addrIn)) throw new Error("bad_addr");
  sweep();
  if (challenges.size > 5000) throw new Error("busy");
  const addr = addrIn.toLowerCase();
  const nonce = crypto.randomBytes(8).toString("hex");
  challenges.set(nonce, { addr, action, exp: Date.now() + TTL });
  return { nonce, message: textFor(addr, action, nonce) };
}

/** Шаг 2: сайт присылает подпись. Для link возвращаем ссылку на бота, для unlink отключаем. */
export function tgConfirm(addrIn: string, action: "link" | "unlink", nonce: string, sig: string) {
  if (!tgEnabled) throw new Error("tg_off");
  const c = challenges.get(nonce);
  const addr = String(addrIn || "").toLowerCase();
  if (!c || c.exp < Date.now() || c.addr !== addr || c.action !== action) throw new Error("expired");
  let who = "";
  try { who = ethers.verifyMessage(textFor(addr, action, nonce), sig).toLowerCase(); } catch { throw new Error("bad_sig"); }
  if (who !== addr) throw new Error("bad_sig");
  challenges.delete(nonce);
  if (action === "unlink") { links.delete(addr); save(); return { ok: true as const }; }
  const code = crypto.randomBytes(8).toString("hex");
  codes.set(code, { addr, exp: Date.now() + TTL });
  return { ok: true as const, url: `https://t.me/${BOT}?start=link_${code}` };
}

export const tgStatus = (addr: string) => ({ enabled: tgEnabled, linked: links.has(String(addr || "").toLowerCase()) });

async function call(method: string, body: Record<string, unknown>) {
  const r = await fetch(`${API}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({}))) as { ok?: boolean; error_code?: number; result?: any };
}

const sent = new Set<string>(); // чтобы не слать одно и то же дважды
/** Отправить уведомление игроку. key: уникальный ключ события (например "g12:p5"), url: куда ведёт кнопка. Ошибки не мешают игре. */
export async function tgNotify(addr: string, ru: string, en: string, key: string, url?: string) {
  try {
    if (!tgEnabled) return;
    const a = String(addr || "").toLowerCase();
    const l = links.get(a);
    if (!l) return;
    const k = a + ":" + key;
    if (sent.has(k)) return;
    sent.add(k);
    if (sent.size > 20000) sent.clear();
    const body: Record<string, unknown> = { chat_id: l.chat, text: l.lang === "ru" ? ru : en, disable_web_page_preview: true };
    if (url) body.reply_markup = { inline_keyboard: [[{ text: l.lang === "ru" ? "Открыть партию" : "Open game", url }]] };
    const r = await call("sendMessage", body);
    if (!r.ok && (r.error_code === 403 || r.error_code === 400)) { links.delete(a); save(); } // бота заблокировали или чат недоступен
  } catch (e) { console.error("tgNotify", e); }
}

let offset = 0;
async function handle(m: any) {
  const chat = m?.chat?.id;
  const text = String(m?.text || "").trim();
  if (typeof chat !== "number" || m?.chat?.type !== "private") return;
  const lang: "ru" | "en" = String(m?.from?.language_code || "").startsWith("ru") ? "ru" : "en";
  const say = (ru: string, en: string) => call("sendMessage", { chat_id: chat, text: lang === "ru" ? ru : en });
  const mm = /^\/start(?:@\w+)?\s+link_([0-9a-f]{16})$/.exec(text);
  if (mm) {
    sweep();
    const c = codes.get(mm[1]);
    if (!c) { await say("Ссылка устарела. Вернитесь на сайт и нажмите «Включить уведомления» ещё раз.", "The link has expired. Go back to the site and press Enable notifications again."); return; }
    codes.delete(mm[1]);
    for (const [a, l] of links) if (l.chat === chat && a !== c.addr) links.delete(a); // один чат: один кошелёк
    links.set(c.addr, { chat, lang });
    save();
    await say("Готово ✅ Я напишу, когда настанет ваш ход, а вас нет в партии. Отключить: /stop", "Done ✅ I will message you when it is your turn and you are not in the game. Turn off: /stop");
  } else if (/^\/stop(?:@\w+)?$/.test(text)) {
    for (const [a, l] of links) if (l.chat === chat) links.delete(a);
    save();
    await say("Уведомления отключены.", "Notifications are off.");
  } else if (text.startsWith("/start")) {
    await say("Это бот Chess Bet. Чтобы получать уведомления «ваш ход», откройте сайт → Профиль → «Уведомления в Telegram».", "This is the Chess Bet bot. To get your-move notifications open the site → Profile → Telegram notifications.");
  }
}

/** Запуск опроса Telegram (вызвать один раз при старте сервера) */
export function startTg() {
  if (!tgEnabled) { console.log("tg: TG_BOT_TOKEN не задан, уведомления выключены"); return; }
  console.log("tg: уведомления включены, бот @" + BOT);
  void call("deleteWebhook", {}).catch(() => {});
  const loop = async () => {
    for (;;) {
      try {
        const r = await call("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
        if (r.ok && Array.isArray(r.result)) {
          for (const u of r.result) { offset = u.update_id + 1; await handle(u.message).catch((e) => console.error("tg handle", e)); }
        } else await new Promise((res) => setTimeout(res, 5000));
      } catch { await new Promise((res) => setTimeout(res, 5000)); }
    }
  };
  void loop();
}

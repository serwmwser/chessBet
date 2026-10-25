import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { Chess } from "chess.js";
import { ethers } from "ethers";
import { createSession, checkSession } from "./session.js";

const {
  RPC_URL,
  ESCROW,
  ORACLE_PK,
  PORT = "8080",
  ALLOWED_ORIGINS = "",
  BLOCKED_COUNTRIES = "",
  STATE_FILE = "./data/state.json",
  PROFILES_FILE = "./data/profiles.json",
  REF_FILE = "./data/refs.json",
  ADS_FILE = "./data/ads.json",
  FAUCET_PK = "",
  USDC_TOKEN = "",
  FAUCET_NATIVE = "1",
  FAUCET_USDC = "1000",
  SYNC_MS = "60000",
  NFT_ADDRESS = "",
} = process.env;
if (!RPC_URL || !ESCROW || !ORACLE_PK) {
  console.error("Нужны RPC_URL, ESCROW, ORACLE_PK (см. .env.example)");
  process.exit(1);
}

const ABI = [
  "event GameCreated(uint256 indexed id,address indexed p1,uint256 bet,uint32 duration,address inviteSigner)",
  "event GameJoined(uint256 indexed id,address indexed p1,address indexed p2)",
  "event GameCancelled(uint256 indexed id)",
  "function games(uint256) view returns (address p1,address p2,uint128 bet,uint32 duration,uint64 startedAt,uint8 status,address inviteSigner)",
  "function nextGameId() view returns (uint256)",
  "function feeBps() view returns (uint16)",
  "function reportResult(uint256 id,address winner)",
  "function refundStuck(uint256 id)",
  "function referrerOf(address) view returns (address)",
  "function setReferrer(address user,address ref)",
  "function refInfo(address r) view returns (uint32 friends,uint32 gamesCount,uint256 earned,uint256 owed,uint256 pct)",
];
// RPC_URL: один адрес или несколько через запятую. Если адресов несколько, сервер идёт по порядку
// и переключается на следующий, когда первый завис или вернул ошибку.
const rpcUrls = RPC_URL.split(",").map((x) => x.trim()).filter(Boolean);
const net = ethers.Network.from(Number(process.env.CHAIN_ID ?? "137"));
const mkRpc = (u: string) => new ethers.JsonRpcProvider(u, net, { staticNetwork: net, batchMaxCount: 1 });
const provider: ethers.AbstractProvider = rpcUrls.length > 1
  ? new ethers.FallbackProvider(rpcUrls.map((u, i) => ({ provider: mkRpc(u), priority: i + 1, stallTimeout: 1500, weight: 1 })), net, { quorum: 1 })
  : mkRpc(rpcUrls[0]);
const wallet = new ethers.Wallet(ORACLE_PK, provider);
const escrow = new ethers.Contract(ESCROW, ABI, wallet);
const NFT = NFT_ADDRESS ? ethers.getAddress(NFT_ADDRESS) : ""; // адрес контракта GameNFT (пусто = NFT выключены)
const ev = process.env.EVENTS === "0" ? (..._a: unknown[]) => {} : (...a: unknown[]) => (escrow as any).on(...a);

// ---------- типы и состояние ----------
// signer != null → приватная игра (в публичном лобби не показывается)
type OpenGame = { id: number; p1: string; bet: string; duration: number; signer: string | null };
type Live = {
  id: number; white: string; black: string; bet: string; duration: number; startedAt: number;
  chess: Chess; clock: { w: number; b: number }; last: number;
  drawOffer: string | null; over: boolean; reason: string | null; winner: string | null;
  reported: boolean; socks: Set<WebSocket>;
  chat: { from: string; text: string; at: number }[];
  // пауза: у каждого игрока 2 паузы по 5 минут; пока пауза идёт, основные часы заморожены
  pause: { by: string; color: "w" | "b"; until: number } | null; pausesLeft: { w: number; b: number };
};
const PAUSES = 2;
const PAUSE_MS = 5 * 60_000;
type Done = {
  id: number; white: string; black: string; bet: string; winner: string | null;
  reason: string; payout: string; pgn: string; at: number;
};

const open = new Map<number, OpenGame>();
const live = new Map<number, Live>();
let done: Done[] = [];
let scanFrom = 1;
let feeBps = 600;
const lc = (a: string) => a.toLowerCase();

// ---------- сохранение состояния ----------
function load() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    done = s.done ?? [];
    scanFrom = s.scanFrom ?? 1;
    for (const x of s.live ?? []) {
      const chess = new Chess();
      if (x.pgn) chess.loadPgn(x.pgn);
      // время простоя сервера не списывается с игроков
      // пауза: простой сервера тоже не съедает её время
      const pause = x.pause ? { by: x.pause.by, color: x.pause.color, until: Date.now() + Number(x.pause.left) } : null;
      live.set(x.id, { ...x, chess, startedAt: x.startedAt ?? Date.now(), last: Date.now(), socks: new Set(), pause, pausesLeft: x.pausesLeft ?? { w: PAUSES, b: PAUSES }, chat: x.chat ?? [] });
    }
    console.log(`state: live=${live.size} done=${done.length} scanFrom=${scanFrom}`);
  } catch {
    /* первый запуск */
  }
}
let saveTimer: NodeJS.Timeout | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const liveOut = [...live.values()].map((g) => ({
      id: g.id, white: g.white, black: g.black, bet: g.bet, duration: g.duration,
      startedAt: g.startedAt, pgn: g.chess.pgn(), clock: g.clock, drawOffer: g.drawOffer, over: g.over,
      reason: g.reason, winner: g.winner, reported: g.reported, chat: g.chat,
      pause: g.pause ? { by: g.pause.by, color: g.pause.color, left: Math.max(0, g.pause.until - Date.now()) } : null, pausesLeft: g.pausesLeft,
    }));
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE + ".tmp", JSON.stringify({ live: liveOut, done: done.slice(-5000), scanFrom }));
    fs.renameSync(STATE_FILE + ".tmp", STATE_FILE);
  }, 500);
}

// ---------- профили игроков (логин, аватар, о себе, ссылка) ----------
type Profile = { name: string; bio: string; link: string; avatar: string; updated: number };
const profiles = new Map<string, Profile>();
const nameOwner = new Map<string, string>(); // логин (в нижнем регистре) → адрес
function loadProfiles() {
  try {
    const o = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8")) as Record<string, Profile>;
    for (const [a, p] of Object.entries(o)) { profiles.set(a, p); if (p.name) nameOwner.set(p.name.toLowerCase(), a); }
    console.log(`profiles: ${profiles.size}`);
  } catch { /* пока нет профилей */ }
}
let pSaveTimer: NodeJS.Timeout | null = null;
function saveProfiles() {
  if (pSaveTimer) return;
  pSaveTimer = setTimeout(() => {
    pSaveTimer = null;
    fs.mkdirSync(path.dirname(PROFILES_FILE), { recursive: true });
    fs.writeFileSync(PROFILES_FILE + ".tmp", JSON.stringify(Object.fromEntries(profiles)));
    fs.renameSync(PROFILES_FILE + ".tmp", PROFILES_FILE);
  }, 500);
}
const NAME_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
/** Проверка и очистка присланного профиля; возвращает текст ошибки или готовый профиль */
function cleanProfile(m: any): Profile | string {
  const name = String(m.name ?? "").trim();
  const bio = String(m.bio ?? "").trim().slice(0, 160);
  let link = String(m.link ?? "").trim();
  const avatar = String(m.avatar ?? "");
  if (name && !NAME_RE.test(name)) return "bad_name";
  if (link) {
    if (!/^https?:\/\//i.test(link)) link = "https://" + link;
    try { const u = new URL(link); if (!/^https?:$/.test(u.protocol)) return "bad_link"; link = u.toString(); } catch { return "bad_link"; }
    if (link.length > 200) return "bad_link";
  }
  if (avatar && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) || avatar.length > 60_000)) return "bad_avatar";
  return { name, bio, link, avatar, updated: Date.now() };
}
/** Сохранение профиля: тело подписано кошельком владельца, чужой профиль изменить нельзя */
function saveProfile(m: any): string | null {
  const addr = String(m.address ?? "").toLowerCase();
  if (!ethers.isAddress(addr)) return "bad_address";
  const ts = Number(m.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 10 * 60_000) return "bad_time";
  const body = JSON.stringify({ name: m.name ?? "", bio: m.bio ?? "", link: m.link ?? "", avatar: m.avatar ?? "" });
  const hash = crypto.createHash("sha256").update(body).digest("hex");
  const exp = `ChessBet profile\nAddress: ${m.address}\nHash: ${hash}\nTime: ${ts}`;
  if (!(m.token && checkSession(addr, m.token))) {
    try { if (ethers.verifyMessage(exp, String(m.sig)).toLowerCase() !== addr) return "bad_signature"; } catch { return "bad_signature"; }
  }
  const p = cleanProfile(m);
  if (typeof p === "string") return p;
  if (p.name) {
    const owner = nameOwner.get(p.name.toLowerCase());
    if (owner && owner !== addr) return "name_taken";
  }
  const old = profiles.get(addr);
  if (old?.name) nameOwner.delete(old.name.toLowerCase());
  if (p.name) nameOwner.set(p.name.toLowerCase(), addr);
  profiles.set(addr, p);
  saveProfiles();
  return null;
}
const publicProfile = (a: string) => { const p = profiles.get(a); return p ? { name: p.name, bio: p.bio, link: p.link, avatar: p.avatar } : null; };

// ---------- синхронизация с контрактом ----------
async function sync() {
  const next = Number(await escrow.nextGameId());
  let firstNonTerminal = next;
  const seenOpen = new Set<number>();
  for (let id = scanFrom; id < next; id++) {
    const g = await escrow.games(id);
    const st = Number(g.status);
    if (st === 1) {
      seenOpen.add(id);
      const signer = g.inviteSigner === ethers.ZeroAddress ? null : lc(g.inviteSigner);
      open.set(id, { id, p1: lc(g.p1), bet: g.bet.toString(), duration: Number(g.duration), signer });
    } else if (st === 2) {
      if (!live.has(id) && !done.some((d) => d.id === id))
        startLive(id, lc(g.p1), lc(g.p2), g.bet.toString(), Number(g.duration), Number(g.startedAt) * 1000);
      // результат не сообщён за 2×время + 3 дня (как в контракте) → сами открываем возврат ставок; refundStuck может вызвать любой
      if (Date.now() / 1000 > Number(g.startedAt) + 2 * Number(g.duration) + 3 * 86_400) {
        try {
          await enqueue(async () => { await (await escrow.refundStuck(id)).wait(); });
          console.log(`refundStuck #${id}: ставки открыты к возврату`);
        } catch (e) {
          console.error(`refundStuck #${id} не удался:`, (e as Error).message);
        }
      }
    } else {
      open.delete(id);
    }
    if ((st === 1 || st === 2) && id < firstNonTerminal) firstNonTerminal = id;
  }
  // игра на сервере ещё "в процессе", а в контракте уже закрыта (например, refundStuck)
  for (const g of live.values()) {
    if (g.reported || g.id >= next) continue;
    const st = Number((await escrow.games(g.id)).status);
    if (st > 2) { g.reported = true; finalize(g); }
  }
  scanFrom = Math.min(firstNonTerminal, next);
  save();
}

function startLive(id: number, white: string, black: string, bet: string, duration: number, startedAt = Date.now()) {
  const ms = duration * 1000;
  live.set(id, {
    id, white, black, bet, duration, startedAt, chess: new Chess(), clock: { w: ms, b: ms }, last: Date.now(),
    drawOffer: null, over: false, reason: null, winner: null, reported: false, socks: new Set(),
    pause: null, pausesLeft: { w: PAUSES, b: PAUSES }, chat: [],
  });
  open.delete(id);
  save();
}

// ---------- игровая логика ----------
// Часы стоят, пока белые не сделали первый ход (первый ход время не расходует)
function remaining(g: Live) {
  const c = { ...g.clock };
  if (!g.over && !g.pause && g.chess.history().length > 0) { const t = g.chess.turn(); c[t] = Math.max(0, c[t] - (Date.now() - g.last)); }
  return c;
}

/**
 * Может ли сторона `s` поставить мат сопернику хоть какой-то серией легальных ходов (при содействии соперника)?
 * Нужно для правила: если у флага не упавшего игрока недостаточно материала для мата, просрочка времени — ничья.
 */
function canMate(chess: Chess, s: "w" | "b"): boolean {
  const mine: { type: string; square: string }[] = [];
  const theirs: { type: string; square: string }[] = [];
  for (const row of chess.board()) for (const p of row) if (p && p.type !== "k") (p.color === s ? mine : theirs).push(p);
  if (mine.some((p) => p.type === "p" || p.type === "r" || p.type === "q")) return true; // пешка может превратиться, ладья/ферзь матуют
  if (mine.length === 0) return false;                  // один король мата поставить не может
  if (mine.length === 1 && theirs.length === 0) return false; // король + один конь/слон против голого короля
  const col = (sq: string) => (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2;
  const onlyBishops = (a: { type: string }[]) => a.every((p) => p.type === "b");
  if (onlyBishops(mine) && onlyBishops(theirs) && new Set([...mine, ...theirs].map((p) => col(p.square))).size <= 1) return false; // все слоны на полях одного цвета
  return true;
}

/** Просрочка времени: победа соперника, а если он не может поставить мат, то ничья. */
function flag(g: Live, loser: "w" | "b") {
  const winner = loser === "w" ? "b" : "w";
  if (!canMate(g.chess, winner)) return finish(g, null, "timeout_draw");
  return finish(g, winner === "w" ? g.white : g.black, "timeout");
}
function snap(g: Live) {
  const h = g.chess.history({ verbose: true });
  const lm = h[h.length - 1];
  return {
    t: "state", id: g.id, fen: g.chess.fen(), history: h.map((m) => m.san),
    lastMove: lm ? { from: lm.from, to: lm.to } : null,
    white: g.white, black: g.black, bet: g.bet, duration: g.duration,
    turn: g.chess.turn(), clock: remaining(g), over: g.over, reason: g.reason,
    winner: g.winner, drawOffer: g.drawOffer, feeBps,
    pause: g.pause ? { by: g.pause.by, color: g.pause.color, left: Math.max(0, g.pause.until - Date.now()) } : null,
    pausesLeft: g.pausesLeft, chat: g.chat.slice(-50),
  };
}
function broadcast(g: Live) {
  const m = JSON.stringify(snap(g));
  for (const s of g.socks) if (s.readyState === WebSocket.OPEN) s.send(m);
}
function finish(g: Live, winner: string | null, reason: string) {
  if (g.over) return;
  g.over = true; g.winner = winner; g.reason = reason; g.drawOffer = null;
  // фиксируем остаток часов на момент окончания (на паузе часы заморожены), затем снимаем паузу
  g.clock = remaining({ ...g, over: false } as Live);
  g.pause = null;
  broadcast(g);
  save();
  void report(g);
}

// ---------- рефералы: пригласивший хранится у нас до первой решённой партии, затем фиксируется в контракте ----------
const refPending = new Map<string, string>(); // игрок → пригласивший
try {
  for (const [u, r] of Object.entries(JSON.parse(fs.readFileSync(REF_FILE, "utf8")) as Record<string, string>)) refPending.set(u, r);
  console.log(`refs: ${refPending.size}`);
} catch { /* пока пусто */ }
function saveRefs() {
  try {
    fs.mkdirSync(path.dirname(REF_FILE), { recursive: true });
    fs.writeFileSync(REF_FILE + ".tmp", JSON.stringify(Object.fromEntries(refPending)));
    fs.renameSync(REF_FILE + ".tmp", REF_FILE);
  } catch (e) { console.error("refs save:", (e as Error).message); }
}
/** Перед отправкой результата фиксируем пригласивших обоих игроков в контракте (газ платим только за реально сыгравших). */
async function ensureRefs(players: string[]) {
  for (const u of players) {
    const r = refPending.get(u);
    if (!r) continue;
    try {
      const cur = String(await escrow.referrerOf(u));
      if (cur === ethers.ZeroAddress) await (await escrow.setReferrer(u, r)).wait();
      refPending.delete(u); saveRefs();
    } catch (e) { console.error(`setReferrer ${u}:`, (e as Error).message); }
  }
}

let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(f: () => Promise<T>) => { const r = queue.then(f, f); queue = r.catch(() => {}); return r; };

async function report(g: Live, attempt = 0): Promise<void> {
  try {
    await enqueue(async () => {
      const st = Number((await escrow.games(g.id)).status);
      if (st === 2) {
        await ensureRefs([g.white, g.black]);
        const tx = await escrow.reportResult(g.id, g.winner ?? ethers.ZeroAddress);
        await tx.wait();
      }
    });
    g.reported = true;
    finalize(g);
  } catch (e) {
    console.error(`reportResult #${g.id} попытка ${attempt + 1} не удалась:`, (e as Error).message);
    setTimeout(() => void report(g, attempt + 1), Math.min(60_000, 2000 * 2 ** attempt));
  }
}
function finalize(g: Live) {
  if (done.some((d) => d.id === g.id)) { live.delete(g.id); return; }
  const pot = BigInt(g.bet) * 2n;
  const fee = g.winner ? (pot * BigInt(feeBps)) / 10000n : 0n;
  done.push({
    id: g.id, white: g.white, black: g.black, bet: g.bet, winner: g.winner,
    reason: g.reason ?? "unknown", payout: g.winner ? (pot - fee).toString() : g.bet,
    pgn: g.chess.pgn(), at: Date.now(),
  });
  live.delete(g.id);
  save();
}

/** Окно на первый ход белых: 72 часа для любой партии со ставкой */
const FIRST_MOVE_MS = 72 * 3600 * 1000;
setInterval(() => {
  for (const g of live.values()) {
    if (g.over) continue;
    if (g.pause) {
      // не вернулся из паузы за 5 минут — поражение
      if (Date.now() >= g.pause.until) finish(g, g.pause.by === g.white ? g.black : g.white, "pause_timeout");
      continue;
    }
    if (g.chess.history().length === 0) {
      // белые не сделали первый ход за 72 часа → отмена, ставки возвращаются без комиссии
      if (Date.now() - g.startedAt > FIRST_MOVE_MS) finish(g, null, "abort");
      continue;
    }
    const t = g.chess.turn();
    if (remaining(g)[t] <= 0) flag(g, t);
  }
}, 1000);

// ---------- реклама для страницы паузы: список в файле ADS_FILE (до 10 слотов), правится без пересборки сайта ----------
let adsCache: { mtime: number; list: unknown[] } = { mtime: -1, list: [] };
function readAds(): unknown[] {
  try {
    const m = fs.statSync(ADS_FILE).mtimeMs;
    if (m !== adsCache.mtime) {
      const raw = JSON.parse(fs.readFileSync(ADS_FILE, "utf8"));
      const web = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u) && u.length <= 500;
      const str = (u: unknown, n: number) => (typeof u === "string" ? u.slice(0, n) : undefined);
      const list: unknown[] = [];
      for (const x of Array.isArray(raw) ? raw : []) {
        if (list.length >= 10 || !x || typeof x !== "object") continue;
        const type = x.type;
        if ((type === "video" || type === "banner") && web(x.src)) list.push({ type, src: x.src, href: web(x.href) ? x.href : undefined });
        else if (type === "cta" && x.title && web(x.href)) list.push({ type, title: str(x.title, 120), subtitle: str(x.subtitle, 200), button: str(x.button, 24), href: x.href });
        else if (type === "html" && typeof x.html === "string" && x.html.length <= 50_000 && !/<\s*script/i.test(x.html)) list.push({ type, html: x.html });
      }
      adsCache = { mtime: m, list };
    }
  } catch { adsCache = { mtime: -1, list: [] }; } // нет файла или он повреждён — рекламы нет
  return adsCache.list;
}

// ---------- HTTP ----------
const origins = ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
const blocked = BLOCKED_COUNTRIES.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
const originOk = (o?: string) => origins.length === 0 || (!!o && origins.includes(o));
const geoBlocked = (req: http.IncomingMessage) => {
  const c = String(req.headers["cf-ipcountry"] ?? "").toUpperCase();
  return !!c && blocked.includes(c);
};

// ---------- кран тестовых токенов (включается только если заданы FAUCET_PK и USDC_TOKEN) ----------
const faucetWallet = FAUCET_PK ? new ethers.Wallet(FAUCET_PK, provider) : null;
const faucetUsdc = faucetWallet && USDC_TOKEN ? new ethers.Contract(USDC_TOKEN, ["function mint(address to,uint256 amount)"], faucetWallet) : null;
let faucetQueue: Promise<unknown> = Promise.resolve();
const lastDrip = new Map<string, number>();
async function drip(addr: string): Promise<string | null> {
  if (!faucetWallet || !faucetUsdc) return "faucet_off";
  if (!ethers.isAddress(addr)) return "bad_address";
  const a = ethers.getAddress(addr);
  const now = Date.now();
  if (now - (lastDrip.get(lc(a)) ?? 0) < 30_000) return "too_often";
  lastDrip.set(lc(a), now);
  const job = faucetQueue.then(async () => {
    let n = await provider.getTransactionCount(faucetWallet.address, "latest");
    await (await faucetWallet.sendTransaction({ to: a, value: ethers.parseEther(FAUCET_NATIVE), nonce: n++ })).wait();
    await (await faucetUsdc.mint(a, ethers.parseUnits(FAUCET_USDC, 6), { nonce: n })).wait();
  });
  faucetQueue = job.catch(() => {});
  try { await job; return null; } catch (e) { console.error("faucet:", (e as Error).message); return "failed"; }
}

function stats(addr: string) {
  const mine = done.filter((d) => d.white === addr || d.black === addr).sort((a, b) => b.at - a.at);
  let wins = 0, losses = 0, draws = 0, net = 0;
  for (const d of mine) {
    if (!d.winner) draws++;
    else if (d.winner === addr) { wins++; net += Number(d.payout) - Number(d.bet); }
    else { losses++; net -= Number(d.bet); }
  }
  return { games: mine.slice(0, 50).map(({ pgn, ...r }) => r), stats: { wins, losses, draws, net } };
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin as string | undefined;
  if (geoBlocked(req)) { res.writeHead(451).end("unavailable in your region"); return; }
  if (origin && originOk(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url ?? "/", "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const out = (o: unknown) => res.end(JSON.stringify(o));
  if (req.method === "POST" && parts[0] === "faucet") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 2_000) req.destroy(); });
    req.on("end", async () => {
      let m: any;
      try { m = JSON.parse(body); } catch { return out({ ok: false, error: "bad_json" }); }
      const e = await drip(String(m.address ?? ""));
      out(e ? { ok: false, error: e } : { ok: true });
    });
    return;
  }
  if (req.method === "POST" && parts[0] === "profile") {
    if (origins.length && !originOk(origin)) { res.writeHead(403).end("{}"); return; }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 100_000) req.destroy(); });
    req.on("end", () => {
      let m: any;
      try { m = JSON.parse(body); } catch { return out({ ok: false, error: "bad_json" }); }
      const e = saveProfile(m);
      out(e ? { ok: false, error: e } : { ok: true });
    });
    return;
  }
  if (req.method === "POST" && parts[0] === "session") {
    if (origins.length && !originOk(origin)) { res.writeHead(403).end("{}"); return; }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 2_000) req.destroy(); });
    req.on("end", () => {
      try {
        const r = createSession(JSON.parse(body));
        out(typeof r === "string" ? { ok: false, error: r } : { ok: true, token: r.token, exp: r.exp });
      } catch { out({ ok: false, error: "bad_request" }); }
    });
    return;
  }
  if (req.method === "POST" && parts[0] === "ref") {
    if (origins.length && !originOk(origin)) { res.writeHead(403).end("{}"); return; }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 2_000) req.destroy(); });
    req.on("end", async () => {
      try {
        const m = JSON.parse(body);
        const user = lc(String(m.address ?? "")), ref = lc(String(m.ref ?? ""));
        if (!ethers.isAddress(user) || !ethers.isAddress(ref) || user === ref) return out({ ok: false, error: "bad_address" });
        const msg = `ChessBet referral\nUser: ${user}\nReferrer: ${ref}`;
        if (lc(ethers.verifyMessage(msg, String(m.sig ?? ""))) !== user) return out({ ok: false, error: "bad_sig" });
        if (refPending.has(user)) return out({ ok: true });
        if (done.some((d) => d.white === user || d.black === user) || [...live.values()].some((g) => g.white === user || g.black === user)) return out({ ok: false, error: "already_played" });
        if (String(await escrow.referrerOf(user)) !== ethers.ZeroAddress) return out({ ok: true });
        refPending.set(user, ref); saveRefs();
        out({ ok: true });
      } catch { out({ ok: false, error: "bad_request" }); }
    });
    return;
  }
  if (parts[0] === "ref" && parts[1] && ethers.isAddress(parts[1])) {
    escrow.refInfo(lc(parts[1])).then((r: any) => out({
      friends: Number(r[0]), games: Number(r[1]), earned: r[2].toString(), owed: r[3].toString(), pct: Number(r[4]),
    })).catch(() => out({ friends: 0, games: 0, earned: "0", owed: "0", pct: 10 }));
    return;
  }
  if (parts[0] === "profile" && parts[1]) return out(publicProfile(lc(parts[1])));
  if (parts[0] === "profiles") {
    // короткие данные (логин + аватар) для списка адресов: /profiles?a=0x..,0x..
    const list = (url.searchParams.get("a") ?? "").split(",").map(lc).filter((x) => ethers.isAddress(x)).slice(0, 20);
    const o: Record<string, { name: string; avatar: string }> = {};
    for (const a of list) { const p = profiles.get(a); if (p) o[a] = { name: p.name, avatar: p.avatar }; }
    return out(o);
  }
  if (parts[0] === "health") return out({ ok: true });
  if (parts[0] === "ads") return out(readAds());
  if (parts[0] === "games") {
    const pub = [...open.values()].filter((g) => !g.signer).sort((a, b) => b.id - a.id).slice(0, 200);
    return out({ feeBps, games: pub });
  }
  if (parts[0] === "game" && parts[1]) {
    const id = Number(parts[1]);
    const o = open.get(id);
    if (o) return out({ status: "open", game: o });
    if (live.has(id)) return out({ status: "active" });
    if (done.some((d) => d.id === id)) return out({ status: "done" });
    return out({ status: "unknown" });
  }
  if (parts[0] === "mine" && parts[1]) {
    const a = lc(parts[1]);
    return out({
      open: [...open.values()].filter((g) => g.p1 === a).sort((x, y) => y.id - x.id),
      // партии, по которым ещё не подтверждён результат в блокчейне (включая уже сыгранные)
      active: [...live.values()]
        .filter((g) => !g.reported && (g.white === a || g.black === a))
        .map((g) => ({ id: g.id, bet: g.bet, duration: g.duration, white: g.white, black: g.black, startedAt: g.startedAt, over: g.over })),
    });
  }
  if (parts[0] === "history" && parts[1]) return out(stats(lc(parts[1])));
  // запись завершённой партии для просмотра: игроки, итог и все ходы (SAN)
  if (parts[0] === "pgn" && parts[1] && /^\d+$/.test(parts[1])) {
    const d = done.find((x) => x.id === Number(parts[1]));
    if (!d) { res.writeHead(404).end("{}"); return; }
    const c = new Chess();
    try { c.loadPgn(d.pgn); } catch { /* пустая запись */ }
    const { pgn: _pgn, ...info } = d;
    return out({ ...info, san: c.history() });
  }
  // подпись для NFT выбранного момента партии: /nft/номер_партии/номер_хода (без хода = итоговая позиция).
  // Игроков, ставку и победителя контракт GameNFT берёт из эскроу сам; сервер подтверждает только позицию, ход и запись ходов.
  if (parts[0] === "nft" && parts[1] && /^[0-9]+$/.test(parts[1])) {
    if (!NFT) { res.writeHead(503).end(JSON.stringify({ error: "nft_off" })); return; }
    const id = Number(parts[1]);
    const d = done.find((x) => x.id === id);
    if (!d) { res.writeHead(404).end(JSON.stringify({ error: "not_finished" })); return; }
    const full = new Chess();
    try { full.loadPgn(d.pgn); } catch { /* пустая запись */ }
    const moves = full.history({ verbose: true });
    const total = moves.length;
    const ply = parts[2] && /^[0-9]+$/.test(parts[2]) ? Number(parts[2]) : total;
    if (ply < 1 || ply > total) { res.writeHead(400).end(JSON.stringify({ error: "bad_ply" })); return; }
    const c = new Chess();
    for (let i = 0; i < ply; i++) c.move(moves[i].san);
    const m = moves[ply - 1];
    const sq = (x: string) => (8 - Number(x[1])) * 8 + (x.charCodeAt(0) - 97); // 0 = a8, 63 = h1
    const pgn = c.history().map((x, i) => (i % 2 === 0 ? String(i / 2 + 1) + ". " + x : x)).join(" ").slice(0, 2000);
    const snap = { gameId: id, ply, total, from: sq(m.from), to: sq(m.to), san: m.san, fen: c.fen(), pgn };
    const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "tuple(uint64 gameId,uint16 ply,uint16 total,uint8 from,uint8 to,string san,string fen,string pgn)"],
      [NFT, net.chainId, snap]));
    wallet.signMessage(ethers.getBytes(digest))
      .then((sig) => out({ ...snap, sig, nft: NFT }))
      .catch(() => { res.writeHead(500).end(JSON.stringify({ error: "sign_failed" })); });
    return;
  }
  res.writeHead(404).end("{}");
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/ws" || geoBlocked(req) || !originOk(req.headers.origin as string | undefined)) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});

type Conn = { addr?: string; gid?: number; nonce: string; win: number; n: number; lc?: number };

wss.on("connection", (ws: WebSocket) => {
  const c: Conn = { nonce: crypto.randomBytes(16).toString("hex"), win: Date.now(), n: 0 };
  const send = (o: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  const err = (m: string) => send({ t: "error", message: m });
  send({ t: "challenge", nonce: c.nonce });

  ws.on("message", (raw) => {
    const now = Date.now();
    if (now - c.win > 1000) { c.win = now; c.n = 0; }
    if (++c.n > 15) return err("rate_limit");
    let m: any;
    try { m = JSON.parse(raw.toString()); } catch { return err("bad_json"); }

    if (m.t === "auth") {
      try {
        const addr = String(m.address ?? "").toLowerCase();
        const msg = String(m.message ?? "");
        const exp = `ChessBet login\nAddress: ${m.address}\nNonce: ${c.nonce}`;
        if (msg !== exp) return err("bad_message");
        if (ethers.verifyMessage(msg, String(m.sig)).toLowerCase() !== addr) return err("bad_signature");
        c.addr = addr;
        return send({ t: "authed", address: addr });
      } catch { return err("bad_signature"); }
    }
    if (m.t === "resume") {
      const addr = String(m.address ?? "").toLowerCase();
      if (!checkSession(addr, m.token)) return err("bad_session");
      c.addr = addr;
      return send({ t: "authed", address: addr });
    }
    if (!c.addr) return err("not_authed");

    if (m.t === "join") {
      const id = Number(m.id);
      const g = live.get(id);
      if (g) {
        if (c.addr !== g.white && c.addr !== g.black) return err("not_player");
        if (c.gid && c.gid !== id) live.get(c.gid)?.socks.delete(ws);
        c.gid = id; g.socks.add(ws);
        return send(snap(g));
      }
      const d = done.find((x) => x.id === id);
      if (d && (c.addr === d.white || c.addr === d.black)) {
        const chess = new Chess(); chess.loadPgn(d.pgn);
        const h = chess.history({ verbose: true }); const lm = h[h.length - 1];
        return send({
          t: "state", id, fen: chess.fen(), history: h.map((x) => x.san), lastMove: lm ? { from: lm.from, to: lm.to } : null,
          white: d.white, black: d.black, bet: d.bet, duration: 0, turn: chess.turn(), clock: { w: 0, b: 0 },
          over: true, reason: d.reason, winner: d.winner, drawOffer: null, feeBps, pause: null, pausesLeft: { w: 0, b: 0 },
        });
      }
      return err("game_not_found");
    }

    const g = c.gid ? live.get(c.gid) : undefined;
    if (!g) return err("no_game");
    const me = c.addr;
    if (me !== g.white && me !== g.black) return err("not_player");
    if (m.t === "chat") {
      // чат партии: только двое игроков, до 200 символов, без ссылок, не чаще раза в секунду
      const text = String(m.text ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      if (!text || /https?:\/\/|www\./i.test(text)) return err("bad_chat");
      if (now - (c.lc ?? 0) < 1000) return err("rate_limit");
      c.lc = now;
      g.chat.push({ from: me, text, at: now });
      if (g.chat.length > 100) g.chat.shift();
      broadcast(g); save();
      return;
    }
    if (g.over) return err("game_over");

    if (m.t === "pause") {
      // только в свой ход, после первого хода (часы идут), не больше двух раз за партию — всё проверяется здесь, а не на клиенте
      if (g.pause) return err("already_paused");
      const turn = g.chess.turn();
      if ((turn === "w" ? g.white : g.black) !== me) return err("not_your_turn");
      if (g.chess.history().length === 0) return err("not_started");
      if (g.pausesLeft[turn] <= 0) return err("no_pauses");
      const t = Date.now();
      if (g.clock[turn] - (t - g.last) <= 0) return flag(g, turn);
      g.clock[turn] -= t - g.last; g.last = t; // фиксируем часы и замораживаем
      g.pausesLeft[turn] -= 1;
      g.pause = { by: me, color: turn, until: t + PAUSE_MS };
      g.drawOffer = null;
      broadcast(g); save();
      return;
    }
    if (m.t === "resume") {
      if (!g.pause) return err("not_paused");
      if (g.pause.by !== me) return err("not_pause_owner");
      g.pause = null; g.last = Date.now();
      broadcast(g); save();
      return;
    }
    if (m.t === "resign") return finish(g, me === g.white ? g.black : g.white, "resign");
    if (g.pause) return err("paused"); // на паузе доступны только «продолжить» и «сдаться»

    if (m.t === "move") {
      const turn = g.chess.turn();
      if ((turn === "w" ? g.white : g.black) !== me) return err("not_your_turn");
      const t = Date.now();
      const firstMove = g.chess.history().length === 0; // первый ход белых время не расходует
      if (!firstMove && g.clock[turn] - (t - g.last) <= 0) return flag(g, turn);
      try {
        g.chess.move({ from: String(m.from), to: String(m.to), promotion: m.promotion ? String(m.promotion) : undefined });
      } catch { return err("illegal_move"); }
      if (!firstMove) g.clock[turn] -= t - g.last;
      g.last = t;
      g.drawOffer = null;
      if (g.chess.isCheckmate()) finish(g, me, "checkmate");
      else if (g.chess.isStalemate()) finish(g, null, "stalemate");
      else if (g.chess.isInsufficientMaterial()) finish(g, null, "insufficient");
      else if (g.chess.isThreefoldRepetition()) finish(g, null, "repetition");
      else if (g.chess.isDraw()) finish(g, null, "draw_rule");
      else { broadcast(g); save(); }
      return;
    }
    if (m.t === "draw_offer") { g.drawOffer = me; broadcast(g); return; }
    if (m.t === "draw_decline") { if (g.drawOffer && g.drawOffer !== me) { g.drawOffer = null; broadcast(g); } return; }
    if (m.t === "draw_accept") { if (g.drawOffer && g.drawOffer !== me) finish(g, null, "agreement"); return; }
    err("unknown_message");
  });

  ws.on("close", () => { if (c.gid) live.get(c.gid)?.socks.delete(ws); });
});

// ---------- запуск ----------
async function main() {
  load();
  loadProfiles();
  try { feeBps = Number(await escrow.feeBps()); } catch (e) { console.error("feeBps:", (e as Error).message); }
  await sync();
  // для pending-отчётов после рестарта
  for (const g of live.values()) if (g.over && !g.reported) void report(g);
  ev("GameCreated", (id: bigint, p1: string, bet: bigint, duration: bigint, signer: string) => {
    open.set(Number(id), {
      id: Number(id), p1: lc(p1), bet: bet.toString(), duration: Number(duration),
      signer: signer === ethers.ZeroAddress ? null : lc(signer),
    });
  });
  ev("GameJoined", (id: bigint, p1: string, p2: string) => {
    const o = open.get(Number(id));
    if (o && !live.has(Number(id))) startLive(Number(id), lc(p1), lc(p2), o.bet, o.duration);
    else void sync().catch(console.error);
  });
  ev("GameCancelled", (id: bigint) => { open.delete(Number(id)); });
  setInterval(() => void sync().catch((e) => console.error("sync:", e.message)), Math.max(1000, Number(SYNC_MS) || 60_000));
  server.listen(Number(PORT), () => console.log(`server :${PORT}, oracle ${wallet.address}, fee ${feeBps} bps`));
}
main().catch((e) => { console.error(e); process.exit(1); });

import { API_URL } from "./config";

type Acc = { address: string; signMessage: (a: { message: string }) => Promise<string> };
type Saved = { token: string; exp: number };

const key = (a: string) => `cb_sess_${a.toLowerCase()}`;
const inflight = new Map<string, Promise<string | null>>();

/** Действующий токен из браузера (с запасом в 2 минуты) или null. */
export function getToken(addr: string): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(key(addr)) || "null") as Saved | null;
    if (s && typeof s.token === "string" && s.exp > Date.now() + 120_000) return s.token;
  } catch {}
  return null;
}

export function dropToken(addr: string) {
  try { localStorage.removeItem(key(addr)); } catch {}
}

async function create(account: Acc): Promise<string | null> {
  const ts = Date.now();
  const message = `ChessBet session\nAddress: ${account.address}\nTime: ${ts}`;
  const sig = await account.signMessage({ message }); // отказ от подписи пробрасываем наверх
  let r: Response;
  try {
    r = await fetch(API_URL + "/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: account.address, ts, sig }),
    });
  } catch { return null; }
  try {
    const j = (await r.json()) as { ok?: boolean; token?: string; exp?: number };
    if (j && j.ok && j.token && j.exp) {
      try { localStorage.setItem(key(account.address), JSON.stringify({ token: j.token, exp: j.exp })); } catch {}
      return j.token;
    }
  } catch {}
  return null; // старый сервер без /session: вызывающий код вернётся к подписи по-старому
}

/** Токен на 24 часа: берём сохранённый или просим ОДНУ подпись. null, если сервер сессий не поддерживает. */
export function ensureToken(account: Acc): Promise<string | null> {
  const have = getToken(account.address);
  if (have) return Promise.resolve(have);
  const k = account.address.toLowerCase();
  let p = inflight.get(k);
  if (!p) {
    p = create(account).finally(() => inflight.delete(k));
    inflight.set(k, p);
  }
  return p;
}

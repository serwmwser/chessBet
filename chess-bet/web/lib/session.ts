import { API_URL } from "./config";
import { alog } from "./authlog";

type Acc = { address: string; signMessage: (a: { message: string }) => Promise<string> };
type Saved = { token: string; exp: number };

const key = (a: string) => `cb_sess_${a.toLowerCase()}`;
const inflight = new Map<string, { p: Promise<string | null>; t: number }>();

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
  alog("запрос подписи отправлен в кошелёк");
  let sig: string;
  try { sig = await account.signMessage({ message }); } // отказ от подписи пробрасываем наверх
  catch (e) { alog("кошелёк вернул ошибку: " + String((e as Error)?.message || e).slice(0, 60)); throw e; }
  alog("подпись получена, отправляем на сервер");
  let r: Response;
  try {
    r = await fetch(API_URL + "/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: account.address, ts, sig }),
    });
  } catch { alog("нет связи с сервером"); throw new Error("network"); }
  alog("сервер ответил " + r.status);
  if (r.status === 403) throw new Error("origin"); // сервер не пускает с этого адреса сайта
  try {
    const j = (await r.json()) as { ok?: boolean; token?: string; exp?: number; error?: string };
    if (j && !j.ok && j.error) { alog("ошибка сервера: " + j.error); throw new Error(j.error); }
    if (j && j.ok && j.token && j.exp) {
      alog("вход выполнен");
      try { localStorage.setItem(key(account.address), JSON.stringify({ token: j.token, exp: j.exp })); } catch {}
      return j.token;
    }
  } catch (e) { if ((e as Error).message !== "Unexpected end of JSON input" && /^[a-z_]+$/.test((e as Error).message)) throw e; }
  return null; // старый сервер без /session: вызывающий код вернётся к подписи по-старому
}

/** Токен на 24 часа: берём сохранённый или просим ОДНУ подпись. null, если сервер сессий не поддерживает. */
export function ensureToken(account: Acc): Promise<string | null> {
  const have = getToken(account.address);
  if (have) return Promise.resolve(have);
  const k = account.address.toLowerCase();
  const cur = inflight.get(k);
  if (cur && Date.now() - cur.t < 15_000) return cur.p; // если ответ кошелька потерян, через 15 с запрос можно повторить
  const p: Promise<string | null> = create(account).finally(() => { if (inflight.get(k)?.p === p) inflight.delete(k); });
  inflight.set(k, { p, t: Date.now() });
  return p;
}

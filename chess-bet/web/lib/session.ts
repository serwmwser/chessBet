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

export const STALE_EVENT = "cb-stale-wallet";

/** Ждёт результат, но не дольше ms миллисекунд ВИДИМОГО времени: пока страница в фоне (человек в кошельке), время не идёт. Иначе ошибка "stale". */
function waitVisible<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((res, rej) => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const end = () => { if (t) clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
    const fire = () => { if (done) return; done = true; end(); rej(new Error("stale")); };
    const arm = () => { if (t) clearTimeout(t); t = undefined; if (!document.hidden) t = setTimeout(fire, ms); };
    const vis = () => arm();
    document.addEventListener("visibilitychange", vis);
    arm();
    p.then((v) => { if (!done) { done = true; end(); res(v); } }, (e) => { if (!done) { done = true; end(); rej(e); } });
  });
}

async function create(account: Acc): Promise<string | null> {
  const ts = Date.now();
  const message = `ChessBet session\nAddress: ${account.address}\nTime: ${ts}`;
  alog("запрос подписи отправлен в кошелёк");
  let sig: string;
  try { sig = await waitVisible(account.signMessage({ message }), 25_000); } // отказ от подписи пробрасываем наверх
  catch (e) {
    if ((e as Error)?.message === "stale") {
      alog("кошелёк не ответил за 25 с: отключаем его, подключите заново");
      try { window.dispatchEvent(new Event(STALE_EVENT)); } catch { /* вне браузера */ }
    } else alog("кошелёк вернул ошибку: " + String((e as Error)?.message || e).slice(0, 60));
    throw e;
  }
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

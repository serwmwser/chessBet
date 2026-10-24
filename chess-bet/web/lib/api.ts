import { API_URL } from "./config";

export type OpenGame = { id: number; p1: string; bet: string; duration: number; signer: string | null };
export type LiveInfo = { id: number; bet: string; duration: number; white: string; black: string; startedAt: number; over: boolean };
export type DoneGame = { id: number; white: string; black: string; bet: string; winner: string | null; reason: string; payout: string; at: number };
export type Stats = { wins: number; losses: number; draws: number; net: number };

async function get<T>(path: string): Promise<T> {
  const r = await fetch(API_URL + path, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
export const fetchGames = () => get<{ feeBps: number; games: OpenGame[] }>("/games");
export const fetchGame = (id: number) => get<{ status: "open" | "active" | "done" | "unknown"; game?: OpenGame }>(`/game/${id}`);
export const fetchMine = (a: string) => get<{ open: OpenGame[]; active: LiveInfo[] }>(`/mine/${a}`);
export const fetchHistory = (a: string) => get<{ games: DoneGame[]; stats: Stats }>(`/history/${a}`);
/** Запись завершённой партии: игроки, итог и все ходы (SAN) */
export type SavedGame = DoneGame & { san: string[] };
export const fetchSaved = (id: number) => get<SavedGame>(`/pgn/${id}`);

export type ProfileData = { name: string; bio: string; link: string; avatar: string };
export const fetchProfile = (a: string) => get<ProfileData | null>(`/profile/${a}`);
export const fetchProfiles = (a: string[]) => get<Record<string, { name: string; avatar: string }>>(`/profiles?a=${a.join(",")}`);
export async function postProfile(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  // любой сбой (сервер недоступен, старая версия, чужой домен, не-JSON ответ) возвращаем как понятный код ошибки, а не молча
  let r: Response;
  try { r = await fetch(API_URL + "/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { return { ok: false, error: "network" }; }
  try {
    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (j && j.ok === true) return { ok: true };
    return { ok: false, error: j?.error || `http_${r.status}` };
  } catch { return { ok: false, error: `http_${r.status}` }; }
}
export async function postFaucet(address: string): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(API_URL + "/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
  return r.json();
}

export type RefStats = { friends: number; games: number; earned: string; owed: string; pct: number };
export const fetchRef = (a: string) => get<RefStats>(`/ref/${a}`);
export async function postRef(body: { address: string; ref: string; sig: string }): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(API_URL + "/ref", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

"use client";
// Шахматные задачи: клиент API (сервер: server/src/puzzles.ts).
import { API_URL } from "./config";

export type Level = 1 | 2 | 3;
export type PuzzleStart = { id: number; level: Level; fen: string; turn: "w" | "b"; moves: number; replay: boolean };
export type MoveResult =
  | { status: "wrong"; errors: number; fen: string }
  | { status: "continue"; san: string; reply: { from: string; to: string; san: string }; fen: string; left: number }
  | { status: "solved"; san: string; fen: string; xp: number; hinted: boolean; errors: number };
export type LevelStat = { level: Level; solved: number; total: number; xp: number };
export type PuzzleStats = { levels: LevelStat[]; xp: number };

/** Токен сайта имеет вид «адрес|токен»: в заголовки уходит и то и другое */
async function call<T>(path: string, opt: { post?: unknown; token?: string } = {}): Promise<T> {
  const [wallet, tok] = (opt.token || "").split("|");
  const r = await fetch(`${API_URL}${path}`, {
    method: opt.post !== undefined ? "POST" : "GET",
    cache: "no-store",
    headers: {
      ...(opt.post !== undefined ? { "content-type": "application/json" } : {}),
      ...(tok ? { authorization: `Bearer ${tok}`, "x-wallet": wallet } : {}),
    },
    body: opt.post !== undefined ? JSON.stringify(opt.post) : undefined,
  });
  const j = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!j.ok) throw new Error(j.error || "error");
  return j;
}

export const nextPuzzle = (token: string, level: Level, skip = 0) => call<PuzzleStart>(`/api/puzzles/next?level=${level}&skip=${skip}`, { token });
export const sendMove = (token: string, id: number, from: string, to: string, promotion?: string) =>
  call<MoveResult>("/api/puzzles/move", { post: { id, from, to, promotion }, token });
export const puzzleHint = (token: string, id: number) => call<{ from: string }>("/api/puzzles/hint", { post: { id }, token });
export const puzzleStats = (token: string) => call<PuzzleStats>("/api/puzzles/stats", { token });

/** Понятный текст ошибки сервера (ru/en) */
export function puzzleError(code: string, ru: boolean): string {
  const m: Record<string, [string, string]> = {
    auth: ["Войдите на сайт", "Please sign in"],
    no_attempt: ["Задача устарела — загрузите новую", "This puzzle expired — load a new one"],
    slow_down: ["Слишком часто, подождите немного", "Too fast, please wait a moment"],
    illegal: ["Так ходить нельзя", "That move is not legal"],
    empty: ["Задач пока нет", "No puzzles yet"],
  };
  const x = m[code];
  return x ? (ru ? x[0] : x[1]) : ru ? "Ошибка, попробуйте ещё раз" : "Error, please try again";
}

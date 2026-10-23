import { Chess } from "chess.js";

export type Kind = "blunder" | "mistake" | "inaccuracy";
export type MoveInfo = {
  /** номер хода с 1 (полуход) */
  ply: number;
  san: string;
  color: "w" | "b";
  /** потеря в сотых пешки относительно лучшего хода */
  loss: number;
  kind: Kind | null;
  /** лучший ход в этой позиции (SAN) */
  best: string | null;
};
export type Analysis = {
  /** оценка позиции в сотых пешки с точки зрения белых: evals[0] — начальная позиция, evals[i] — после i-го полухода */
  evals: number[];
  moves: MoveInfo[];
};

const MATE = 10000;
const CLAMP = 1500;
const MOVETIME = 250;

const kindOf = (loss: number): Kind | null => (loss >= 350 ? "blunder" : loss >= 200 ? "mistake" : loss >= 100 ? "inaccuracy" : null);

/**
 * Разбор партии движком Stockfish (в браузере игрока) — только ПОСЛЕ окончания партии.
 * onProgress(сделано, всего) вызывается после каждой позиции; cancel.stop = true останавливает разбор.
 */
export function analyzeGame(san: string[], onProgress?: (done: number, total: number) => void, cancel?: { stop: boolean }): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    // 1. позиции партии
    const c = new Chess();
    const fens = [c.fen()];
    const sans: string[] = [];
    const colors: ("w" | "b")[] = [];
    for (const s of san) {
      try {
        colors.push(c.turn());
        const m = c.move(s);
        sans.push(m.san);
        fens.push(c.fen());
      } catch {
        break;
      }
    }
    const total = fens.length;

    let worker: Worker;
    try {
      worker = new Worker(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/stockfish.js`);
    } catch (e) {
      reject(e);
      return;
    }
    const evals: number[] = new Array(total).fill(0);
    const bests: (string | null)[] = new Array(total).fill(null);
    let i = 0;
    let score: number | null = null; // с точки зрения стороны, которая ходит
    const finish = () => {
      worker.terminate();
      const moves: MoveInfo[] = sans.map((s, k) => {
        const a = Math.max(-CLAMP, Math.min(CLAMP, evals[k]));
        const b = Math.max(-CLAMP, Math.min(CLAMP, evals[k + 1]));
        const loss = Math.max(0, colors[k] === "w" ? a - b : b - a);
        return { ply: k + 1, san: s, color: colors[k], loss, kind: kindOf(loss), best: bests[k] };
      });
      resolve({ evals, moves });
    };
    const next = () => {
      if (cancel?.stop) { worker.terminate(); reject(new Error("cancelled")); return; }
      onProgress?.(i, total);
      if (i >= total) { finish(); return; }
      const g = new Chess(fens[i]);
      if (g.isCheckmate()) { evals[i] = g.turn() === "w" ? -MATE : MATE; i++; next(); return; }
      if (g.isDraw() || g.isStalemate() || g.isInsufficientMaterial()) { evals[i] = 0; i++; next(); return; }
      score = null;
      worker.postMessage("position fen " + fens[i]);
      worker.postMessage("go movetime " + MOVETIME);
    };
    worker.onerror = () => { worker.terminate(); reject(new Error("engine")); };
    worker.onmessage = (ev) => {
      const line = String(ev.data);
      if (line.startsWith("info") && line.includes(" score ")) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (cp) score = parseInt(cp[1], 10);
        else if (mate) { const n = parseInt(mate[1], 10); score = n === 0 ? -MATE : (n > 0 ? 1 : -1) * MATE; }
      } else if (line.startsWith("bestmove")) {
        const g = new Chess(fens[i]);
        const sc = score ?? 0;
        evals[i] = g.turn() === "w" ? sc : -sc;
        const mv = line.split(" ")[1];
        if (mv && mv !== "(none)") {
          try { bests[i] = g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] }).san; } catch { bests[i] = null; }
        }
        i++;
        next();
      }
    };
    worker.postMessage("uci");
    worker.postMessage("setoption name Skill Level value 20");
    next();
  });
}

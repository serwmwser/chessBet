"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useApp } from "@/lib/ctx";
import { nextPuzzle, puzzleError, puzzleHint, sendMove, type Level, type PuzzleStart } from "@/lib/puzzles";
import Board from "./Board";

type Msg = { kind: "info" | "ok" | "err"; text: string } | null;

/** Доска задачи: ход игрока проверяет сервер, ответ соперника появляется сам. Подсказка и пропуск. XP только за честное решение */
export default function PuzzleBoard({ token, level, onSolved }: { token: string; level: Level; onSolved?: () => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const [pz, setPz] = useState<PuzzleStart | null>(null);
  const [fen, setFen] = useState("");
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const movesWord = (n: number) => (ru ? (n === 1 ? "1 ход" : `${n} хода`) : n === 1 ? "1 move" : `${n} moves`);

  const load = useCallback(async (skip = 0) => {
    setBusy(true); setDone(false); setErrors(0); setLast(null); setMsg(null);
    try {
      const p = await nextPuzzle(token, level, skip);
      setPz(p); setFen(p.fen);
      setMsg({ kind: "info", text: ru
        ? `${p.turn === "w" ? "Белые" : "Чёрные"} начинают и ставят мат в ${movesWord(p.moves)}.`
        : `${p.turn === "w" ? "White" : "Black"} to move: mate in ${movesWord(p.moves)}.` });
    } catch (e) { toast(puzzleError((e as Error).message, ru), "err"); }
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, level, ru, toast]);

  useEffect(() => { void load(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [load]);

  const onMove = async (from: string, to: string, promotion?: string) => {
    if (!pz || busy || done) return;
    setBusy(true);
    try {
      const r = await sendMove(token, pz.id, from, to, promotion);
      if (r.status === "wrong") {
        setErrors(r.errors);
        setMsg({ kind: "err", text: ru ? "Не то. Подумайте ещё: ищите шахи и ходы, после которых у короля нет выхода." : "Not it. Look for checks and moves that leave the king no escape." });
        setBusy(false);
        return;
      }
      // сначала показываем свой ход, затем ответ соперника или мат
      const c = new Chess(fen);
      try { c.move({ from, to, promotion: promotion || "q" }); setFen(c.fen()); setLast({ from, to }); } catch { /* позицию возьмём у сервера */ }
      if (r.status === "solved") {
        timer.current = setTimeout(() => {
          setFen(r.fen); setDone(true);
          setMsg({ kind: "ok", text: ru ? `Мат! ${r.xp > 0 ? `+${r.xp} XP` : r.hinted ? "Решено с подсказкой — XP не начисляется." : "Эта задача уже решена раньше — XP не начисляется."}` : `Checkmate! ${r.xp > 0 ? `+${r.xp} XP` : r.hinted ? "Solved with a hint — no XP." : "Already solved before — no XP."}` });
          if (r.xp > 0) toast(ru ? `+${r.xp} XP за задачу` : `+${r.xp} XP for the puzzle`, "ok");
          onSolved?.();
          setBusy(false);
        }, 250);
        return;
      }
      setMsg({ kind: "ok", text: ru ? "Верно! Соперник отвечает…" : "Correct! The opponent replies…" });
      timer.current = setTimeout(() => {
        setFen(r.fen); setLast({ from: r.reply.from, to: r.reply.to });
        setMsg({ kind: "info", text: ru ? `Ваш ход: мат в ${movesWord(r.left)}.` : `Your move: mate in ${movesWord(r.left)}.` });
        setBusy(false);
      }, 550);
    } catch (e) {
      toast(puzzleError((e as Error).message, ru), "err");
      if ((e as Error).message === "no_attempt") void load();
      else setBusy(false);
    }
  };

  const askHint = async () => {
    if (!pz || busy || done) return;
    try {
      const h = await puzzleHint(token, pz.id);
      setMsg({ kind: "info", text: ru ? `Подсказка: ходите фигурой с поля ${h.from}. За задачу с подсказкой XP не начисляется.` : `Hint: move the piece on ${h.from}. A puzzle solved with a hint gives no XP.` });
    } catch (e) { toast(puzzleError((e as Error).message, ru), "err"); }
  };

  const tone = msg?.kind === "ok" ? "border-emerald-500/60 bg-emerald-500/10" : msg?.kind === "err" ? "border-red-500/60 bg-red-500/10" : "border-transparent bg-black/5 dark:bg-white/5";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs opacity-70">
        <span>{pz ? (ru ? `Задача №${pz.id} · ${movesWord(pz.moves)}` : `Puzzle #${pz.id} · mate in ${movesWord(pz.moves)}`) : "…"}</span>
        {errors > 0 && <span>{ru ? `Ошибок: ${errors}` : `Mistakes: ${errors}`}</span>}
      </div>
      {fen && <Board fen={fen} orientation={pz?.turn === "b" ? "black" : "white"} lastMove={last} disabled={busy || done} onMove={onMove} />}
      {msg && <div role="status" className={`rounded-2xl border px-4 py-2.5 text-sm ${tone}`}>{msg.text}</div>}
      <div className="flex flex-wrap gap-2">
        {done
          ? <button type="button" className="btn btn-primary" onClick={() => void load(pz?.id ?? 0)}>{ru ? "Следующая задача →" : "Next puzzle →"}</button>
          : <>
              <button type="button" className="btn btn-ghost" disabled={busy || !pz} onClick={askHint}>💡 {ru ? "Подсказка" : "Hint"}</button>
              <button type="button" className="btn btn-ghost" disabled={busy || !pz} onClick={() => void load(pz?.id ?? 0)}>⏭ {ru ? "Пропустить" : "Skip"}</button>
            </>}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { fetchSaved, SavedGame } from "@/lib/api";
import { shortAddr, usdc } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import Board from "./Board";
import { ReplayBar, useReplay } from "./Replay";
import AnalysisPanel from "./Analysis";

const EMPTY: string[] = [];

/** Просмотр записанной партии от первого хода до последнего с анализом. Открывается из истории в профиле. */
export default function GameReplay({ id, me, onClose }: { id: number; me: string; onClose: () => void }) {
  const { t, lang } = useApp();
  const ru = lang === "ru";
  const [g, setG] = useState<SavedGame | null>(null);
  const [fail, setFail] = useState(false);
  useEffect(() => {
    let off = false;
    fetchSaved(id).then((x) => { if (!off) setG(x); }).catch(() => { if (!off) setFail(true); });
    return () => { off = true; };
  }, [id]);
  const replay = useReplay(g?.san ?? EMPTY);
  // партия открывается с первого хода
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (g) replay.first(); }, [g]);
  const color: "w" | "b" | undefined = g ? (g.white === me ? "w" : g.black === me ? "b" : undefined) : undefined;
  const drawn = !!g && !g.winner;
  const won = !!g && g.winner === me;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-ink-950">
      <div className="mx-auto max-w-md p-3 space-y-3">
        <div className="sticky top-0 z-10 -mx-3 px-3 pb-2 pt-1 space-y-2 bg-white dark:bg-ink-950">
          <div className="flex items-center gap-2">
            <div className="me-auto min-w-0">
              <div className="font-bold">{ru ? "Партия" : "Game"} #{id}{g ? ` · ${usdc(g.bet)} USDC · ${drawn ? t("rDraw") : won ? t("won") : t("lost")}` : ""}</div>
              {g && <div className="text-xs opacity-60" dir="ltr">⚪ {shortAddr(g.white)} · ⚫ {shortAddr(g.black)} · {new Date(g.at).toLocaleDateString()}</div>}
            </div>
            <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={onClose} aria-label="close">✕</button>
          </div>
          {g && (
            <>
              <Board fen={replay.fen} orientation={color === "b" ? "black" : "white"} lastMove={replay.last} disabled mute onMove={() => {}} />
              <ReplayBar r={replay} />
            </>
          )}
        </div>
        {!g && !fail && <div className="skeleton h-40" />}
        {fail && <div className="card text-center text-sm opacity-80">{ru ? "Запись партии не найдена." : "Game record not found."}</div>}
        {g && <div className="card"><AnalysisPanel san={g.san} replay={replay} me={color} /></div>}
      </div>
    </div>
  );
}

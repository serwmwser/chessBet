"use client";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { DoneGame, fetchHistory, fetchSaved, SavedGame } from "@/lib/api";
import { shortAddr, usdc } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { FIGURES, MOODS, NFT_BGS } from "@/lib/nftArt";
import { takenPlies } from "@/lib/nft";
import NftCard from "./NftCard";
import { ReplayBar, useReplay } from "./Replay";

const EMPTY: string[] = [];

/** Студия NFT: игрок выбирает свою партию и ход, мультяшную фигуру, настроение и фон; половина картинки это позиция выбранного хода, половина это фигура. */
export default function NftStudio() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const me = useActiveAccount()?.address;
  const [games, setGames] = useState<DoneGame[] | null>(null);
  const [gid, setGid] = useState<number | null>(null);
  const [g, setG] = useState<SavedGame | null>(null);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const [figure, setFigure] = useState("clay-w-q");
  const [mood, setMood] = useState("cheer");
  const [bg, setBg] = useState("orange");

  useEffect(() => {
    if (!me) { setGames(null); return; }
    let off = false;
    fetchHistory(me.toLowerCase()).then((h) => { if (!off) setGames(h.games); }).catch(() => { if (!off) setGames([]); });
    return () => { off = true; };
  }, [me]);

  useEffect(() => {
    setG(null); setTaken(new Set());
    if (gid === null) return;
    let off = false;
    fetchSaved(gid).then((x) => {
      if (off) return;
      setG(x);
      takenPlies(gid, x.san.length).then((s) => { if (!off) setTaken(s); }).catch(() => { /* занятость проверит контракт */ });
    }).catch(() => { /* запись не найдена */ });
    return () => { off = true; };
  }, [gid]);

  const replay = useReplay(g?.san ?? EMPTY);
  // партия открывается на последнем ходе
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (g) replay.toLive(); }, [g]);

  if (!me) {
    return <div className="card text-center space-y-2"><div className="text-3xl">🎨</div><div className="font-bold">{ru ? "Студия NFT" : "NFT Studio"}</div><div className="text-sm opacity-70">{ru ? "Подключите кошелёк, чтобы выбрать ход из своих партий." : "Connect your wallet to pick a move from your games."}</div></div>;
  }

  const ply = replay.cur;
  const mine = (x: DoneGame) => (x.white.toLowerCase() === me.toLowerCase() || x.black.toLowerCase() === me.toLowerCase());
  const result = !g ? "" : g.winner ? (g.winner === g.white ? "White won" : "Black won") : "Draw";
  const sel = "w-full rounded-xl px-3 py-2 bg-black/5 dark:bg-violet-300/10";

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl" aria-hidden="true">🎨</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">{ru ? "Студия NFT" : "NFT Studio"}</div>
            <div className="text-xs opacity-70">{ru ? "Половина картинки это ваш ход, половина это мультяшная фигура." : "Half the picture is your move, half is a cartoon piece."}</div>
          </div>
        </div>
        <div className="text-sm font-semibold">{ru ? "1. Выберите свою партию" : "1. Pick your game"}</div>
        {games === null && <div className="skeleton h-12" />}
        {games && games.filter(mine).length === 0 && <div className="text-sm opacity-70">{ru ? "Пока нет сыгранных партий со ставкой." : "No finished staked games yet."}</div>}
        <div className="grid gap-2 max-h-56 overflow-y-auto">
          {(games ?? []).filter(mine).map((x) => (
            <button key={x.id} type="button" onClick={() => setGid(x.id)} className={`btn btn-ghost !justify-between ${gid === x.id ? "ring-2 ring-emerald-400" : ""}`}>
              <span>#{x.id} · {usdc(x.bet)} USDC</span>
              <span className="text-xs opacity-70">{new Date(x.at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      </section>

      {gid !== null && !g && <div className="skeleton h-40" />}

      {g && (
        <>
          <section className="card space-y-3">
            <div className="text-sm font-semibold">{ru ? "2. Выберите ход" : "2. Pick a move"}</div>
            <ReplayBar r={replay} />
            <input type="range" min={1} max={Math.max(1, replay.total)} value={Math.max(1, ply)} onChange={(e) => replay.goto(Number(e.target.value))} className="w-full" aria-label="move" />
            {ply < 1 && <div className="text-xs opacity-70">{ru ? "Выберите ход от первого." : "Pick a move from the first one."}</div>}
            {taken.has(ply) && <div className="text-xs text-amber-500">{ru ? "На этот ход NFT уже создан, выберите другой." : "An NFT already exists for this move, pick another."}</div>}
          </section>

          <section className="card space-y-3">
            <div className="text-sm font-semibold">{ru ? "3. Фигура, настроение, фон" : "3. Piece, mood, background"}</div>
            <select className={sel} value={figure} onChange={(e) => setFigure(e.target.value)} aria-label="figure">
              {FIGURES.map((f) => <option key={f.id} value={f.id}>{ru ? f.ru : f.en}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m.id} type="button" onClick={() => setMood(m.id)} className={`btn btn-ghost !py-2 ${mood === m.id ? "ring-2 ring-emerald-400" : ""}`}>{ru ? m.ru : m.en}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {NFT_BGS.map((b) => (
                <button key={b.id} type="button" onClick={() => setBg(b.id)} aria-label={ru ? b.ru : b.en} className={`w-9 h-9 rounded-full border-2 ${bg === b.id ? "border-white ring-2 ring-emerald-400" : "border-transparent"}`} style={{ background: b.color }} />
              ))}
            </div>
          </section>

          <section className="card space-y-3">
            <div className="text-sm font-semibold">{ru ? "Предпросмотр" : "Preview"}</div>
            <NftCard
              fen={replay.fen}
              from={replay.last?.from}
              to={replay.last?.to}
              figureId={figure}
              mood={mood}
              bgId={bg}
              title={`CHESS BET #${g.id}`}
              sub={ply >= 1 ? `Move ${ply}/${replay.total} · ${g.san[ply - 1]}${ply === replay.total ? " (final)" : ""}` : ""}
              line1={`${result} | ${usdc(g.bet)} USDC`}
              line2={`${shortAddr(g.white)} vs ${shortAddr(g.black)}`}
              animate
            />
            <button type="button" className="btn btn-primary w-full" disabled>{ru ? "Создать NFT (скоро)" : "Mint NFT (soon)"}</button>
            <div className="text-xs opacity-60 text-center">{ru ? "Создание NFT подключим после утверждения вида." : "Minting will be enabled once the look is approved."}</div>
          </section>
        </>
      )}
    </div>
  );
}

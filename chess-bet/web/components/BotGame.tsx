"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOT_TIMES } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { usePT } from "@/lib/pauseTxt";
import { cartoonBot, mainBot, Res } from "@/lib/botStore";
import Board, { Clock, Moves } from "./Board";
import CartoonBoard from "./cartoon/CartoonBoard";
import Piece from "./cartoon/Pieces";
import type { Mood } from "./cartoon/Character";
import { playNeigh } from "@/lib/neigh";
import { cheerFor, speak } from "@/lib/cheers";
import PausePage, { PauseButton } from "./PausePage";
import { LoseSplash, WinSplash } from "./Splash";
import { ReplayBar, useReplay } from "./Replay";
import Captured from "./Captured";
import AdvantageBar from "./AdvantageBar";
import { analyze } from "@/lib/material";

const PAWNS_W = [["Ниндзя", "Ninja"], ["Полицейский", "Police"], ["Леди", "Lady"], ["Бандит", "Bandit"]];
const PAWNS_B = [["Ниндзя", "Ninja"], ["Полицейский", "Police"], ["Леди", "Lady"], ["Бандит", "Bandit"]];

/** cartoon = мультяшная вкладка: свои фигуры и своя, отдельная партия с ботом */
export default function BotGame({ cartoon = false }: { cartoon?: boolean }) {
  const { t, lang } = useApp();
  const ru = lang === "ru";
  const B = cartoon ? cartoonBot : mainBot;
  const [pawnW, setPawnW] = useState(1);
  const [pawnB, setPawnB] = useState(3);
  const BoardX = (cartoon ? CartoonBoard : Board) as unknown as typeof CartoonBoard;
  const pt = usePT();
  const s = B.useBot(); // партия хранится в lib/botStore и не теряется при смене вкладки
  const [minutes, setMinutes] = useState(s.minutes);
  const [level, setLevel] = useState(s.level);
  const [pick, setPick] = useState<"w" | "b" | "r">("w");
  const [hide, setHide] = useState(false); // окно результата закрыто крестиком: видна доска с итоговой позицией
  const again = () => { setHide(false); B.botReset(); };
  const san = s.chess.history();
  const replay = useReplay(san);
  // взятые фигуры и перевес в той позиции, которая сейчас на доске (при просмотре истории тоже)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => analyze(san.slice(0, replay.cur)), [replay.cur, san.length]);
  // мимика фигур (мультяшная вкладка): после хода или взятия на 1,5 секунды; когда ходит конь, он ржёт
  const [react, setReact] = useState<{ by: "w" | "b"; piece: string; cap?: string } | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem("cb_voice") !== "0"; } catch { return true; } });
  useEffect(() => {
    if (!say) return undefined;
    const id = setTimeout(() => setSay(null), 3500);
    return () => clearTimeout(id);
  }, [say]);
  const lastLen = useRef(san.length);
  useEffect(() => {
    const grew = san.length > lastLen.current;
    lastLen.current = san.length;
    if (!grew || !cartoon) return undefined;
    const m = s.chess.history({ verbose: true }).slice(-1)[0];
    if (!m) return undefined;
    if (m.piece === "n") playNeigh();
    if (m.color === s.me) {
      const line = cheerFor({ san: m.san, piece: m.piece, captured: m.captured, promotion: m.promotion }, ru ? "ru" : "en");
      if (line) { setSay(line); if (voice) speak(line, ru ? "ru-RU" : "en-US"); }
    }
    setReact({ by: m.color, piece: m.piece, cap: m.captured });
    const id = setTimeout(() => setReact(null), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [san.length]);

  const resText = (r: Res) => ({
    text: r.kind === "draw" ? t("rDraw") : r.kind === "win" ? t("won") : t("lost"),
    sub: r.why === "chk" ? t("rChk") : r.why === "time" ? t("rTime") : r.why === "timeDraw" ? t("rTimeDraw") : r.why === "res" ? t("rRes") : r.why === "pause" ? pt.lostPause : "",
  });

  if (!s.playing && !s.res) {
    return (
      <section className="card space-y-5">
        <h2 className="text-lg font-bold">{cartoon ? (ru ? "Мультяшные шахматы" : "Cartoon chess") : t("bot")}</h2>
        <div>
          <div className="text-sm opacity-70 mb-1">{t("time")}</div>
          <div className="flex gap-2 flex-wrap">
            {BOT_TIMES.map((m) => <button key={m} className={`chip ${minutes === m ? "chip-on" : ""}`} onClick={() => setMinutes(m)}>{m} {t("min")}</button>)}
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1"><span className="opacity-70">{t("level")}</span><b className="mono">{level}</b></div>
          <input type="range" min={1} max={8} value={level} onChange={(e) => setLevel(+e.target.value)} className="w-full h-8" aria-label={t("level")} />
        </div>
        <div>
          <div className="text-sm opacity-70 mb-1">{t("color")}</div>
          <div className="flex gap-2 flex-wrap">
            {([["w", t("white")], ["b", t("black")], ["r", t("random")]] as const).map(([k, l]) => (
              <button key={k} className={`chip ${pick === k ? "chip-on" : ""}`} onClick={() => setPick(k)}>{l}</button>
            ))}
          </div>
        </div>
        {cartoon && (
          <>
            <div>
              <div className="text-sm opacity-70 mb-1">{ru ? "Пешки белых" : "White pawns"}</div>
              <div className="flex gap-2 flex-wrap">
                {PAWNS_W.map((n, i) => <button key={i} className={"chip " + (pawnW === i ? "chip-on" : "")} onClick={() => setPawnW(i)}>{ru ? n[0] : n[1]}</button>)}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">{ru ? "Пешки чёрных" : "Black pawns"}</div>
              <div className="flex gap-2 flex-wrap">
                {PAWNS_B.map((n, i) => <button key={i} className={"chip " + (pawnB === i ? "chip-on" : "")} onClick={() => setPawnB(i)}>{ru ? n[0] : n[1]}</button>)}
              </div>
            </div>
          </>
        )}
        <button className="btn btn-primary w-full" onClick={() => B.startBot(minutes, level, pick)}>{t("newGame")}</button>
      </section>
    );
  }

  const c = s.chess;
  const botColor = s.me === "w" ? "b" : "w";
  const started = san.length > 0;
  const myTurn = s.playing && !s.over && !s.pause && c.turn() === s.me;
  const res = s.res ? resText(s.res) : null;
  // настроение по ключу «цвет+тип»: ходившая фигура радуется, потерянная пугается (пешки не в счёт), король ещё реагирует на шах и конец партии
  const moods: Record<string, Mood> = {};
  if (react) {
    if (react.piece !== "p") moods[react.by + react.piece.toUpperCase()] = "cheer";
    if (react.cap && react.cap !== "p") moods[(react.by === "w" ? "b" : "w") + react.cap.toUpperCase()] = "scream";
  }
  const kingMood = (col: "w" | "b"): Mood => {
    if (s.res) return s.res.kind === "draw" ? "idle" : (s.res.kind === "win") === (col === s.me) ? "cheer" : "sad";
    if (c.inCheck() && c.turn() === col) return "scream";
    return moods[col + "K"] ?? "idle";
  };
  moods.wK = kingMood("w");
  moods.bK = kingMood("b");
  const kingIcon = (col: "w" | "b") => (cartoon ? <span className="inline-flex w-9 shrink-0 justify-center"><Piece type="k" side={col} size={30} mood={kingMood(col)} /></span> : undefined);

  return (
    <div className="space-y-3">
      {s.pause && s.playing && (
        <PausePage mode="bot" until={s.pause.until} byMe color={s.pause.color} left={s.pausesLeft[s.pause.color]} onResume={B.botResume} />
      )}
      <Clock ms={s[botColor]} active={s.playing && !s.pause && c.turn() === botColor} label={`🤖 ${t("level")} ${s.level}`} icon={kingIcon(botColor)} />
      <Captured taken={mat.taken[botColor]} color={s.me} plus={Math.max(0, botColor === "w" ? mat.diff : -mat.diff)} cartoon={cartoon} pawn={s.me === "w" ? pawnW : pawnB} />
      <AdvantageBar diff={mat.diff} />
      <BoardX
        pawnW={pawnW}
        pawnB={pawnB}
        moods={moods}
        fen={replay.fen}
        orientation={s.me === "w" ? "white" : "black"}
        lastMove={replay.last}
        disabled={!myTurn || !replay.isLive}
        mute={!replay.isLive}
        onMove={B.botMove}
      />
      <Clock ms={s[s.me]} active={myTurn} label={s.me === "w" ? t("white") : t("black")} icon={kingIcon(s.me)} />
      <Captured taken={mat.taken[s.me]} color={botColor} plus={Math.max(0, s.me === "w" ? mat.diff : -mat.diff)} cartoon={cartoon} pawn={botColor === "w" ? pawnW : pawnB} />
      {cartoon && (
        <div className="flex items-center gap-2">
          <button type="button" className="chip shrink-0" aria-label={ru ? "Голос" : "Voice"} onClick={() => { const v = !voice; setVoice(v); try { localStorage.setItem("cb_voice", v ? "1" : "0"); } catch { /* без сохранения */ } if (!v) window.speechSynthesis?.cancel(); }}>{voice ? "🔊" : "🔇"}</button>
          <div className="flex-1 min-h-9 flex items-center rounded-2xl px-3 text-sm font-bold text-emerald-500">{say ? "💬 " + say : ""}</div>
        </div>
      )}
      <ReplayBar r={replay} />
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium min-h-5">{s.thinking ? t("thinking") : myTurn ? t("yourTurn") : ""}</div>
        {!s.over && <PauseButton left={s.pausesLeft[s.me]} active={myTurn && started} onClick={B.botPause} />}
      </div>
      <Moves san={san} />
      {res ? (
        hide ? (
          <button className="btn btn-primary w-full" onClick={again}>{t("newGame")}</button>
        ) : (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-slate-900 text-white shadow-2xl ring-4 ring-brand-500/40 p-5 text-center space-y-3">
              <button type="button" aria-label="close" className="absolute top-2 end-3 text-2xl leading-none text-white/60 hover:text-white" onClick={() => setHide(true)}>✕</button>
              {s.res?.kind === "win" && <WinSplash sub={pt.botWin} />}
              {s.res?.kind === "lose" && <LoseSplash sub={pt.botLose} />}
              {s.res?.kind === "draw" && <div className="text-2xl font-extrabold py-4">{res.text}</div>}
              {cartoon && s.res && (
                <div className="flex justify-center items-end gap-8 pt-1">
                  <Piece type="k" side={s.me} size={84} mood={s.res.kind === "win" ? "cheer" : s.res.kind === "lose" ? "sad" : "idle"} />
                  <Piece type="k" side={s.me === "w" ? "b" : "w"} size={84} mood={s.res.kind === "win" ? "sad" : s.res.kind === "lose" ? "cheer" : "idle"} />
                </div>
              )}
              {res.sub && <div className="text-sm text-white/70">{res.sub}</div>}
              <button className="btn btn-primary w-full" onClick={again}>{t("newGame")}</button>
            </div>
          </div>
        )
      ) : (
        <button className="btn btn-danger w-full" onClick={B.botResign}>{t("resign")}</button>
      )}
    </div>
  );
}

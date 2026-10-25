"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";
import { Chess } from "chess.js";
import { ARENA_MIN, shortAddr, usdc, WS_URL } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { dropToken, ensureToken, getToken } from "@/lib/session";
import { useProfile } from "@/lib/profile";
import { usePT } from "@/lib/pauseTxt";
import { Key } from "@/lib/i18n";
import Board, { Clock, Moves } from "./Board";
import { LoseSplash, StartSplash, WaitingSplash, WinSplash } from "./Splash";
import Claim from "./Claim";
import PausePage, { PauseButton } from "./PausePage";
import { ReplayBar, useReplay } from "./Replay";
import Captured from "./Captured";
import AnalysisPanel from "./Analysis";
import { analyze } from "@/lib/material";
import { playCastle, playCheck, playLose, playPromo, playVoice, playWin, useEndDelay } from "@/lib/sfx";
import { playNeigh } from "@/lib/neigh";
import { cheerFor, PITCH, shoutFor, speak } from "@/lib/cheers";
import CartoonBoard from "./cartoon/CartoonBoard";
import Piece from "./cartoon/Pieces";
import type { Mood } from "./cartoon/Character";

type State = {
  t: "state"; id: number; fen: string; history: string[]; lastMove: { from: string; to: string } | null;
  white: string; black: string; bet: string; turn: "w" | "b"; clock: { w: number; b: number };
  over: boolean; reason: string | null; winner: string | null; drawOffer: string | null; feeBps: number;
  pause?: { by: string; color: "w" | "b"; left: number } | null; pausesLeft?: { w: number; b: number };
  chat?: { from: string; text: string; at: number }[];
};
type Phase = "connect" | "sign" | "load" | "fail";

const REASON: Record<string, Key> = { checkmate: "rChk", timeout: "rTime", resign: "rRes", timeout_draw: "rTimeDraw", abort: "rAbort" };
const EMPTY: string[] = [];

export default function OnlineGame({ id, onExit }: { id: number; onExit: () => void }) {
  const { t, toast, lang } = useApp();
  const ru = lang === "ru";
  const pt = usePT();
  const ptRef = useRef(pt);
  ptRef.current = pt;
  const account = useActiveAccount();
  const [st, setSt] = useState<State | null>(null);
  const [, tick] = useState(0);
  const recv = useRef(0);
  const ws = useRef<WebSocket | null>(null);
  const [phase, setPhase] = useState<Phase>("connect");
  const [failMsg, setFailMsg] = useState("");
  const [attempt, setAttempt] = useState(0);
  const me = account?.address.toLowerCase();
  const oppAddr = st ? (st.white === me ? st.black : st.white) : undefined;
  const oppProf = useProfile(oppAddr);
  const myProf = useProfile(me);
  const replay = useReplay(st?.history ?? EMPTY);
  // взятые фигуры в той позиции, которая сейчас на доске (подсказок и оценки движка во время партии нет)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => analyze((st?.history ?? EMPTY).slice(0, replay.cur)), [replay.cur, st?.history.length]);
  const [intro, setIntro] = useState(true);
  const [endOpen, setEndOpen] = useState(true);
  // окно результата после мата или ничьей на доске появляется через 5 секунд; сдача, время, пауза и отмена — сразу
  const instantEnd = ["resign", "timeout", "timeout_draw", "abort", "pause_timeout"].includes(st?.reason ?? "");
  const endGate = useEndDelay(!!st?.over, instantEnd ? 0 : 5000);
  // фанфара или тромбон в момент окончания (не при открытии уже законченной партии)
  const sawLive = useRef(false);
  useEffect(() => {
    if (st && !st.over) sawLive.current = true;
    if (st?.over && sawLive.current) {
      sawLive.current = false;
      if (st.winner && st.winner === me) playWin(); else if (st.winner) playLose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.over]);
  // мульт-арена: партии со ставкой от 25.5 USDC идут с мультяшными фигурами, голосами и реакциями
  const cartoon = !!st && Number(st.bet) >= ARENA_MIN;
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem("cb_voice") !== "0"; } catch { return true; } });
  const [say, setSay] = useState<string | null>(null);
  const [react, setReact] = useState<{ by: "w" | "b"; piece: string; cap?: string } | null>(null);
  useEffect(() => {
    if (!say) return undefined;
    const id = setTimeout(() => setSay(null), 3500);
    return () => clearTimeout(id);
  }, [say]);
  const lastLen = useRef<number | null>(null);
  useEffect(() => {
    if (!st) return undefined;
    const h = st.history;
    if (lastLen.current === null) { lastLen.current = h.length; return undefined; } // при открытии партии не озвучиваем старые ходы
    const grew = h.length > lastLen.current;
    lastLen.current = h.length;
    if (!grew || !cartoon) return undefined;
    const c = new Chess();
    try { h.forEach((x) => c.move(x)); } catch { return undefined; }
    const m = c.history({ verbose: true }).slice(-1)[0];
    if (!m) return undefined;
    const mine = st.white === me ? "w" : "b";
    if (voice && !m.san.endsWith("#")) {
      if (m.san.endsWith("+")) playCheck();
      else if (m.promotion) playPromo();
      else if (m.san.startsWith("O-O")) playCastle();
      else if (m.captured) playVoice(m.captured, "scream");
      else if (m.piece === "n") playNeigh();
      else playVoice(m.piece, "cheer");
    }
    if (m.captured && !m.san.endsWith("#")) {
      const line = shoutFor(m.piece, ru ? "ru" : "en");
      setSay(line);
      if (voice) setTimeout(() => speak(line, ru ? "ru-RU" : "en-US", PITCH[m.piece] ?? 1.2), 450);
    } else if (m.color === mine) {
      const line = cheerFor({ san: m.san, piece: m.piece, captured: m.captured, promotion: m.promotion }, ru ? "ru" : "en");
      if (line) { setSay(line); if (voice) speak(line, ru ? "ru-RU" : "en-US"); }
    }
    setReact({ by: m.color, piece: m.piece, cap: m.captured });
    const id = setTimeout(() => setReact(null), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.history.length]);
  const [msg, setMsg] = useState("");
  const chatBox = useRef<HTMLDivElement>(null);
  const chatLen = st?.chat?.length ?? 0;
  useEffect(() => { const el = chatBox.current; if (el) el.scrollTop = el.scrollHeight; }, [chatLen]);

  useEffect(() => {
    if (!account) return;
    let closed = false;
    let retried = false;
    let retry: ReturnType<typeof setTimeout>;
    setPhase("connect");
    setFailMsg("");
    const connect = () => {
      const sock = new WebSocket(WS_URL);
      ws.current = sock;
      const join = () => sock.send(JSON.stringify({ t: "join", id }));
      sock.onmessage = async (ev) => {
        const m = JSON.parse(ev.data);
        if (m.t === "challenge") {
          setPhase(getToken(account.address) ? "load" : "sign");
          try {
            const token = await ensureToken(account); // одна подпись на 24 часа
            if (token) {
              sock.send(JSON.stringify({ t: "resume", address: account.address, token }));
            } else {
              const message = `ChessBet login\nAddress: ${account.address}\nNonce: ${m.nonce}`;
              const sig = await account.signMessage({ message });
              sock.send(JSON.stringify({ t: "auth", address: account.address, message, sig }));
            }
            setPhase("load");
          } catch (e) {
            setPhase("fail");
            setFailMsg(((e as Error)?.message || "signature rejected").slice(0, 140));
          }
        } else if (m.t === "authed") { setPhase("load"); join(); }
        else if (m.t === "state") { setSt(m); recv.current = Date.now(); }
        else if (m.t === "error") {
          if (m.message === "game_not_found") setTimeout(() => sock.readyState === 1 && join(), 1500);
          else if (m.message === "bad_session" && !retried) { retried = true; dropToken(account.address); setAttempt((a) => a + 1); }
          else if (m.message === "bad_signature" || m.message === "bad_message" || m.message === "bad_session") { setPhase("fail"); setFailMsg(m.message); }
          else if (m.message === "bad_chat") toast(ru ? "Сообщение не отправлено: ссылки и пустые сообщения запрещены" : "Message not sent: links and empty messages are not allowed", "err");
          else if (m.message !== "not_your_turn") toast(ptRef.current.err[m.message] ?? m.message, "err");
        }
      };
      sock.onclose = () => { if (!closed) { setPhase((p) => (p === "fail" ? p : "connect")); retry = setTimeout(connect, 2000); } };
    };
    connect();
    return () => { closed = true; clearTimeout(retry); ws.current?.close(); };
  }, [account, id, toast, attempt]);

  // часы обновляются локально между сообщениями сервера
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(i); }, []);

  const send = (o: object) => ws.current?.readyState === 1 && ws.current.send(JSON.stringify(o));

  if (!st || !account) {
    const msg = !account
      ? (ru ? "Подключите кошелёк" : "Connect your wallet")
      : phase === "connect" ? (ru ? "Соединение с сервером игры…" : "Connecting to the game server…")
      : phase === "sign" ? (ru ? "Подтвердите подпись входа в вашем кошельке. Это бесплатно, не списывает деньги и нужна один раз в сутки. Если запроса не видно, откройте приложение кошелька." : "Approve the sign-in signature in your wallet. It is free, moves no money and is needed only once a day. If you see no prompt, open your wallet app.")
      : phase === "fail" ? (ru ? "Подпись не получена: " : "Signature failed: ") + failMsg
      : (ru ? "Загружаем партию…" : "Loading the game…");
    return (
      <div className="space-y-3">
        <WaitingSplash />
        <div className="card text-center text-sm space-y-2">
          <div>{msg}</div>
          {account && phase === "fail" && <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>{ru ? "Повторить" : "Retry"}</button>}
        </div>
      </div>
    );
  }

  const iAmWhite = st.white === me;
  const myColor = iAmWhite ? "w" : "b";
  const opp = iAmWhite ? st.black : st.white;
  // часы стоят до первого хода белых; первый ход время не расходует
  const started = st.history.length > 0;
  const paused = !st.over && !!st.pause; // на паузе основные часы заморожены
  const elapsed = st.over || !started || paused ? 0 : Date.now() - recv.current;
  const rem = (c: "w" | "b") => st.clock[c] - (!st.over && st.turn === c ? elapsed : 0);
  const myTurn = !st.over && !paused && st.turn === myColor;
  const pausesLeft = st.pausesLeft?.[myColor] ?? 0;
  // пауза закончится автопоражением; сервер присылает остаток, считаем локально от момента получения
  const pauseUntil = st.pause ? recv.current + st.pause.left : 0;
  const bet = Number(st.bet);
  const offerFromOpp = !!st.drawOffer && st.drawOffer !== me;
  const won = st.over && st.winner === me;
  const lost = st.over && !!st.winner && st.winner !== me;
  const drawn = st.over && !st.winner;
  const reasonText = st.reason === "pause_timeout" ? pt.lostPause : st.reason && REASON[st.reason] ? t(REASON[st.reason]) : drawn ? t("rDraw") : "";

  const BoardX = (cartoon ? CartoonBoard : Board) as unknown as typeof CartoonBoard;
  const pawnOf = (col: "w" | "b") => (col === "w" ? 1 : 3);
  const moods: Record<string, Mood> = {};
  if (react) {
    if (react.piece !== "p") moods[react.by + react.piece.toUpperCase()] = "cheer";
    if (react.cap && react.cap !== "p") moods[(react.by === "w" ? "b" : "w") + react.cap.toUpperCase()] = "scream";
  }
  const kingMood = (col: "w" | "b"): Mood => {
    if (st.over) return !st.winner ? "idle" : st.winner === (col === "w" ? st.white : st.black) ? "cheer" : "sad";
    try { const g = new Chess(replay.fen); if (g.inCheck() && g.turn() === col) return "scream"; } catch { /* позиция не разобрана */ }
    return moods[col + "K"] ?? "idle";
  };
  moods.wK = kingMood("w");
  moods.bK = kingMood("b");
  const kingIcon = (col: "w" | "b") => (cartoon ? <span className="inline-flex w-9 shrink-0 justify-center"><Piece type="k" side={col} size={30} mood={kingMood(col)} /></span> : undefined);

  // итог партии показываем поверх доски
  const overlay = st.over && endGate && endOpen ? (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 z-20 grid place-items-center overflow-y-auto rounded-xl bg-ink-950/85 backdrop-blur-sm p-2 text-white text-center">
      <button aria-label="close" onClick={() => setEndOpen(false)} className="absolute top-2 end-2 z-30 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25">✕</button>
      <div className="w-full max-w-sm space-y-2 py-2">
        {won && <WinSplash />}
        {lost && <LoseSplash />}
        {drawn && <><div className="text-5xl">🤝</div><div className="text-xl font-bold">{t("drawn")}</div></>}
        {reasonText && <div className="text-sm opacity-70">{reasonText}</div>}
        {(won || drawn) && <Claim id={st.id} who={account.address} />}
        <button className="btn btn-ghost w-full !bg-white/10" onClick={onExit}>{t("backLobby")}</button>
      </div>
    </motion.div>
  ) : null;

  return (
    <div className="space-y-3">
      {st.pause && !st.over && (
        <PausePage mode="pvp" until={pauseUntil} byMe={st.pause.by === me} color={st.pause.color} left={st.pausesLeft?.[st.pause.color] ?? 0} onResume={() => send({ t: "resume" })} />
      )}
      {cartoon && <div className="text-center text-xs font-bold text-amber-400">{ru ? "🎭👑 Мульт-арена" : "🎭👑 Cartoon arena"}</div>}
      {intro && !st.over && st.history.length === 0 && <StartSplash white={iAmWhite} onDone={() => setIntro(false)} />}
      {/* таймер каждого игрока: общее время на партию, идёт только на своём ходу */}
      <Clock ms={rem(iAmWhite ? "b" : "w")} active={started && !st.over && !paused && st.turn !== myColor} label={`${oppProf?.name || shortAddr(opp)} · ${iAmWhite ? t("black") : t("white")}`} who={{ name: oppProf?.name || opp, avatar: oppProf?.avatar }} icon={kingIcon(iAmWhite ? "b" : "w")} />
      <Captured taken={mat.taken[iAmWhite ? "b" : "w"]} color={myColor} plus={0} cartoon={cartoon} pawn={pawnOf(myColor)} />
      <div className="relative">
      <BoardX
        fen={replay.fen}
        orientation={iAmWhite ? "white" : "black"}
        lastMove={replay.last}
        disabled={!myTurn || !replay.isLive}
        mute={!replay.isLive && !replay.playing}
        onMove={(from, to, promotion) => send({ t: "move", from, to, promotion })}
        {...(cartoon ? { pawnW: 1, pawnB: 3, moods } : {})}
      />
      {overlay}
      </div>
      <Clock ms={rem(myColor)} active={started && myTurn} label={`${myProf?.name || (me ? shortAddr(me) : t("profile"))} · ${iAmWhite ? t("white") : t("black")}`} who={{ name: myProf?.name || me, avatar: myProf?.avatar }} icon={kingIcon(myColor)} />
      <Captured taken={mat.taken[myColor]} color={iAmWhite ? "b" : "w"} plus={0} cartoon={cartoon} pawn={pawnOf(iAmWhite ? "b" : "w")} />
      {cartoon && (
        <div className="flex items-center gap-2">
          <button type="button" className="chip shrink-0" aria-label={ru ? "Голос" : "Voice"} onClick={() => { const v = !voice; setVoice(v); try { localStorage.setItem("cb_voice", v ? "1" : "0"); } catch { /* без сохранения */ } if (!v) window.speechSynthesis?.cancel(); }}>{voice ? "🔊" : "🔇"}</button>
          <div className="flex-1 min-h-9 flex items-center rounded-2xl px-3 text-sm font-bold text-emerald-500">{say ? "💬 " + say : ""}</div>
        </div>
      )}

      <ReplayBar r={replay} auto={st.over} />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{st.over ? "" : myTurn ? t("yourTurn") : t("oppTurn")}</span>
        <span className="opacity-70">{t("pot")}: <b className="mono">{usdc(bet * 2)}</b> USDC</span>
      </div>
      {!st.over && <PauseButton left={pausesLeft} active={myTurn && started} onClick={() => send({ t: "pause" })} />}
      <Moves san={st.history} />
      {st.over && <div className="card"><AnalysisPanel san={st.history} replay={replay} me={myColor} /></div>}

      {st.chat && (
        <div className="card space-y-2">
          <div ref={chatBox} className="max-h-32 overflow-y-auto space-y-1 text-sm">
            {st.chat.length === 0 && <div className="opacity-50 text-xs">{ru ? "Чат партии: его видите только вы и соперник" : "Game chat: only you and your opponent can see it"}</div>}
            {st.chat.map((c, i) => (
              <div key={i} className={c.from === me ? "text-end" : ""}>
                <span className={"inline-block rounded-2xl px-3 py-1 " + (c.from === me ? "bg-emerald-500/20" : "bg-black/5 dark:bg-white/10")}>{c.text}</span>
              </div>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const text = msg.trim(); if (!text) return; send({ t: "chat", text }); setMsg(""); }}>
            <input value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 200))} maxLength={200} placeholder={ru ? "Сообщение…" : "Message…"} className="flex-1 rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2 text-sm" />
            <button className="btn btn-primary !py-2" type="submit">{ru ? "Отправить" : "Send"}</button>
          </form>
        </div>
      )}

      {!st.over && (
        <div className="grid grid-cols-2 gap-2">
          {offerFromOpp ? (
            <>
              <button className="btn btn-primary" onClick={() => send({ t: "draw_accept" })}>{t("acceptDraw")}</button>
              <button className="btn btn-ghost" onClick={() => send({ t: "draw_decline" })}>{t("cancel")}</button>
            </>
          ) : (
            <button className="btn btn-ghost" disabled={st.drawOffer === me} onClick={() => send({ t: "draw_offer" })}>{st.drawOffer === me ? "…" : t("offerDraw")}</button>
          )}
          <button className="btn btn-danger" onClick={() => window.confirm(t("resign") + "?") && send({ t: "resign" })}>{t("resign")}</button>
        </div>
      )}

      {st.over && endGate && !endOpen && (
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="card text-center space-y-3 !bg-gradient-to-br from-brand-500/15 to-brand-violet/15">
          {won && <WinSplash />}
          {lost && <LoseSplash />}
          {drawn && <><div className="text-4xl">🤝</div><div className="text-xl font-bold">{t("drawn")}</div></>}
          {reasonText && <div className="text-sm opacity-70">{reasonText}</div>}
          {(won || drawn) && <Claim id={st.id} who={account.address} />}
          <button className="btn btn-ghost w-full" onClick={onExit}>{t("backLobby")}</button>
        </motion.div>
      )}
    </div>
  );
}

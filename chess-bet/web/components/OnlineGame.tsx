"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";
import { shortAddr, usdc, WS_URL } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { useProfile } from "@/lib/profile";
import { usePT } from "@/lib/pauseTxt";
import { Key } from "@/lib/i18n";
import Board, { Clock, Moves } from "./Board";
import { LoseSplash, StartSplash, WaitingSplash, WinSplash } from "./Splash";
import Claim from "./Claim";
import PausePage, { PauseButton } from "./PausePage";
import { ReplayBar, useReplay } from "./Replay";

type State = {
  t: "state"; id: number; fen: string; history: string[]; lastMove: { from: string; to: string } | null;
  white: string; black: string; bet: string; turn: "w" | "b"; clock: { w: number; b: number };
  over: boolean; reason: string | null; winner: string | null; drawOffer: string | null; feeBps: number;
  pause?: { by: string; color: "w" | "b"; left: number } | null; pausesLeft?: { w: number; b: number };
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
  const replay = useReplay(st?.history ?? EMPTY);
  const [intro, setIntro] = useState(true);
  const [endOpen, setEndOpen] = useState(true);

  useEffect(() => {
    if (!account) return;
    let closed = false;
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
          setPhase("sign");
          try {
            const message = `ChessBet login\nAddress: ${account.address}\nNonce: ${m.nonce}`;
            const sig = await account.signMessage({ message });
            sock.send(JSON.stringify({ t: "auth", address: account.address, message, sig }));
            setPhase("load");
          } catch (e) {
            setPhase("fail");
            setFailMsg(((e as Error)?.message || "signature rejected").slice(0, 140));
          }
        } else if (m.t === "authed") { setPhase("load"); join(); }
        else if (m.t === "state") { setSt(m); recv.current = Date.now(); }
        else if (m.t === "error") {
          if (m.message === "game_not_found") setTimeout(() => sock.readyState === 1 && join(), 1500);
          else if (m.message === "bad_signature" || m.message === "bad_message") { setPhase("fail"); setFailMsg(m.message); }
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
      : phase === "sign" ? (ru ? "Подтвердите подпись входа в вашем кошельке. Это бесплатно и не списывает деньги. Если запроса не видно, откройте приложение кошелька." : "Approve the sign-in signature in your wallet. It is free and moves no money. If you see no prompt, open your wallet app.")
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

  // итог партии показываем поверх доски
  const overlay = st.over && endOpen ? (
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
      {intro && !st.over && st.history.length === 0 && <StartSplash white={iAmWhite} onDone={() => setIntro(false)} />}
      {/* таймер каждого игрока: общее время на партию, идёт только на своём ходу */}
      <Clock ms={rem(iAmWhite ? "b" : "w")} active={started && !st.over && !paused && st.turn !== myColor} label={`${oppProf?.name || shortAddr(opp)} · ${iAmWhite ? t("black") : t("white")}`} />
      <div className="relative">
      <Board
        fen={replay.fen}
        orientation={iAmWhite ? "white" : "black"}
        lastMove={replay.last}
        disabled={!myTurn || !replay.isLive}
        mute={!replay.isLive}
        onMove={(from, to, promotion) => send({ t: "move", from, to, promotion })}
      />
      {overlay}
      </div>
      <Clock ms={rem(myColor)} active={started && myTurn} label={`${t("profile")} · ${iAmWhite ? t("white") : t("black")}`} />

      <ReplayBar r={replay} />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{st.over ? "" : myTurn ? t("yourTurn") : t("oppTurn")}</span>
        <span className="opacity-70">{t("pot")}: <b className="mono">{usdc(bet * 2)}</b> USDC</span>
      </div>
      {!st.over && <PauseButton left={pausesLeft} active={myTurn && started} onClick={() => send({ t: "pause" })} />}
      <Moves san={st.history} />

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

      {st.over && !endOpen && (
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

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useApp } from "@/lib/ctx";
import { Color, removeMyRoom, roomLink, useRoom } from "@/lib/room";
import { inTelegram, tgRoomLink } from "@/lib/telegram";
import { usePT } from "@/lib/pauseTxt";
import { analyze } from "@/lib/material";
import { playCastle, playCheck, playLose, playPromo, playVoice, playWin } from "@/lib/sfx";
import { playNeigh } from "@/lib/neigh";
import { cheerFor, PITCH, shoutFor, speak } from "@/lib/cheers";
import { packOf, useCartoonPrefs } from "@/lib/cartoonPrefs";
import AnalysisPanel from "./Analysis";
import Board, { Clock, Moves } from "./Board";
import Captured from "./Captured";
import CartoonSettings from "./CartoonSettings";
import CartoonBoard from "./cartoon/CartoonBoard";
import Piece from "./cartoon/Pieces";
import type { Mood } from "./cartoon/Character";
import PausePage, { PauseButton } from "./PausePage";
import { ReplayBar, useReplay } from "./Replay";
import Share from "./Share";
import { LoseSplash, StartSplash, WinSplash } from "./Splash";

const EMPTY: string[] = [];

/** Бесплатная партия с другом по ссылке: без кошелька и без ставок, но со всем остальным как в партии на токены (часы, паузы, чат, голоса, мульт-фигуры, реванш). roomId пустой — создаём новую комнату. */
export default function FriendGame({ roomId, color = "r", minutes = 60, onExit, onRoom }: { roomId: string | null; color?: Color | "r"; minutes?: number; onExit: () => void; onRoom?: (id: string) => void }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const pt = usePT();
  const room = useRoom(roomId, color, minutes);
  const { st, seat, id } = room;
  // номер комнаты запоминаем наверху: при возврате на эту страницу подключаемся к той же партии, а не создаём новую
  useEffect(() => { if (id) onRoom?.(id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => { if (room.error === "room_not_found" && roomId) removeMyRoom(roomId); }, [room.error, roomId]);
  const replay = useReplay(st?.history ?? EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now()); // для хода часов
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);
  const [intro, setIntro] = useState(true);
  const [msg, setMsg] = useState("");
  const chatBox = useRef<HTMLDivElement>(null);
  const chatLen = st?.chat?.length ?? 0;
  useEffect(() => { const el = chatBox.current; if (el) el.scrollTop = el.scrollHeight; }, [chatLen]);

  // ссылка в адресной строке: её можно скопировать, а при обновлении страницы партия сохранится
  useEffect(() => {
    if (id) { try { history.replaceState(null, "", `${location.pathname}?room=${id}`); } catch { /* адрес менять нельзя */ } }
  }, [id]);

  // подсказки об ошибках сервера (чат, пауза и т.д.)
  useEffect(() => {
    const c = room.notice?.code;
    if (!c || c === "not_your_turn" || c === "rate_limit") return;
    if (c === "bad_chat") toast(ru ? "Сообщение не отправлено: ссылки и пустые сообщения запрещены" : "Message not sent: links and empty messages are not allowed", "err");
    else if (c === "wait_opponent") toast(ru ? "Дождитесь соперника" : "Wait for your opponent", "err");
    else toast(pt.err[c] ?? c, "err");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.notice?.n]);

  // мультяшные фигуры, голоса фигур и реакции: можно включить и выключить
  const [cartoon, setCartoon] = useState(() => { try { return localStorage.getItem("cb_free_cartoon") !== "0"; } catch { return true; } });
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem("cb_voice") !== "0"; } catch { return true; } });
  const [say, setSay] = useState<string | null>(null);
  const [cp] = useCartoonPrefs();
  const [react, setReact] = useState<{ by: "w" | "b"; piece: string; cap?: string } | null>(null);
  useEffect(() => {
    if (!say) return undefined;
    const t = setTimeout(() => setSay(null), 3500);
    return () => clearTimeout(t);
  }, [say]);
  const mine = seat === "w" || seat === "b" ? seat : null;
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
      if (voice) setTimeout(() => speak(line, ru ? "ru-RU" : "en-US", (PITCH[m.piece] ?? 1.2) * packOf(cp.pack).pitch, packOf(cp.pack).rate), 450);
    } else if (m.color === mine) {
      const line = cheerFor({ san: m.san, piece: m.piece, captured: m.captured, promotion: m.promotion }, ru ? "ru" : "en");
      if (line) { setSay(line); if (voice) speak(line, ru ? "ru-RU" : "en-US", 1.2 * packOf(cp.pack).pitch, packOf(cp.pack).rate); }
    }
    setReact({ by: m.color, piece: m.piece, cap: m.captured });
    const t = setTimeout(() => setReact(null), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.history.length]);

  // фанфара или тромбон в момент окончания (не при открытии уже законченной партии)
  const sawLive = useRef(false);
  useEffect(() => {
    if (st && !st.over) sawLive.current = true;
    if (st?.over && sawLive.current) {
      sawLive.current = false;
      if (mine && st.winner === mine) playWin(); else if (mine && st.winner) playLose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.over]);

  // взятые фигуры в той позиции, которая сейчас на доске
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => analyze((st?.history ?? EMPTY).slice(0, replay.cur)), [replay.cur, st?.history.length]);

  const back = () => { try { history.replaceState(null, "", location.pathname); } catch { /* ничего */ } onExit(); };

  if (room.error === "room_not_found") {
    return (
      <div className="card space-y-3 text-center">
        <div className="text-lg font-bold">{ru ? "Комната не найдена" : "Room not found"}</div>
        <p className="text-sm opacity-75">{ru ? "Ссылка устарела: бесплатные партии хранятся 48 часов. Создайте новую." : "The link has expired: free games are kept for 48 hours. Create a new one."}</p>
        <button className="btn btn-primary w-full" onClick={back}>{ru ? "На главную" : "Home"}</button>
      </div>
    );
  }
  if (!st || !seat) {
    return (
      <div className="card space-y-2 text-center">
        <div className="skeleton h-24" />
        <div className="text-sm opacity-70">{room.error === "offline" ? (ru ? "Нет связи с сервером. Обновите страницу." : "No connection. Refresh the page.") : (ru ? "Подключаемся…" : "Connecting…")}</div>
      </div>
    );
  }

  const player = seat === "w" || seat === "b";
  const full = st.seats.w && st.seats.b;
  const paused = !st.over && !!st.pause;
  const myTurn = player && full && !st.over && !paused && st.turn === seat;
  const iWon = st.over && st.winner === seat;
  const iLost = st.over && st.winner !== null && st.winner !== seat && player;
  const names = (c: Color) => (c === "w" ? (ru ? "Белые" : "White") : (ru ? "Чёрные" : "Black"));
  const REASON: Record<string, [string, string]> = {
    checkmate: ["Мат", "Checkmate"], resign: ["Соперник сдался", "Resignation"], stalemate: ["Пат: ничья", "Stalemate: draw"],
    insufficient: ["Не хватает фигур для мата: ничья", "Insufficient material: draw"], repetition: ["Троекратное повторение: ничья", "Threefold repetition: draw"],
    fifty: ["Правило 50 ходов: ничья", "Fifty-move rule: draw"], timeout: ["Время вышло", "Time is up"], agreement: ["Ничья по соглашению", "Draw by agreement"],
  };
  const reasonText = st.reason === "pause_timeout" ? pt.lostPause : st.reason && REASON[st.reason] ? REASON[st.reason][ru ? 0 : 1] : "";
  const oppOffered = player && st.drawOffer !== null && st.drawOffer !== seat;
  const iOffered = player && st.drawOffer === seat;
  const link = inTelegram() ? tgRoomLink(st.id) : roomLink(st.id);
  const rem = (c: Color) => Math.max(0, st.clock[c] - (st.running && st.turn === c ? now - room.at : 0)); // остаток времени с учётом хода часов
  const topC: Color = seat === "b" ? "w" : "b";
  const botC: Color = seat === "b" ? "b" : "w";
  const iAmWhite = seat !== "b";
  const started = st.history.length > 0;
  const pausesLeft = player ? st.pausesLeft?.[seat as Color] ?? 0 : 0;
  const pauseUntil = st.pause ? room.at + st.pause.left : 0;
  const lim = Math.round(st.limit / 60000);
  const limText = lim >= 60 ? (lim % 60 === 0 ? lim / 60 + (ru ? " ч" : " h") : lim + (ru ? " мин" : " min")) : lim + (ru ? " мин" : " min");

  // мультяшная доска и настроение фигур
  const BoardX = (cartoon ? CartoonBoard : Board) as unknown as typeof CartoonBoard;
  const pawnOf = (c: Color) => (c === "w" ? cp.pawnW : cp.pawnB);
  const moods: Record<string, Mood> = {};
  if (react) {
    if (react.piece !== "p") moods[react.by + react.piece.toUpperCase()] = "cheer";
    if (react.cap && react.cap !== "p") moods[(react.by === "w" ? "b" : "w") + react.cap.toUpperCase()] = "scream";
  }
  const kingMood = (c: Color): Mood => {
    if (st.over) return !st.winner ? "idle" : st.winner === c ? "cheer" : "sad";
    try { const g = new Chess(replay.fen); if (g.inCheck() && g.turn() === c) return "scream"; } catch { /* позиция не разобрана */ }
    return moods[c + "K"] ?? "idle";
  };
  moods.wK = kingMood("w");
  moods.bK = kingMood("b");
  const kingIcon = (c: Color) => (cartoon ? <span className="inline-flex w-9 shrink-0 justify-center"><Piece type="k" side={c} size={30} mood={kingMood(c)} /></span> : undefined);
  const clk = (c: Color) => <Clock ms={rem(c)} active={st.running && !st.over && !paused && st.turn === c} label={names(c) + (player && c === seat ? (ru ? " (вы)" : " (you)") : "")} icon={kingIcon(c)} />;

  const rematchByMe = st.rematch === seat;
  const rematchByOpp = !!st.rematch && st.rematch !== seat;

  return (
    <div className="space-y-3">
      {st.pause && !st.over && (
        <PausePage mode="pvp" until={pauseUntil} byMe={st.pause.by === seat} color={st.pause.by} left={st.pausesLeft?.[st.pause.by] ?? 0} onResume={room.resume} />
      )}
      <div className="text-center text-xs font-bold text-emerald-500">🤝 {ru ? "Партия с другом: бесплатно, без ставок" : "Game with a friend: free, no stakes"} · ⏱ {limText}</div>
      {st.hold && !st.over && player && st.turn !== seat && <div className="rounded-xl px-3 py-2 text-center text-xs font-semibold bg-amber-400/15 text-amber-500">⏳ {ru ? "Соперник ещё не зашёл в партию после вашего хода. Его время не идёт и начнётся, когда он зайдёт." : "Your opponent has not opened the game since your move. Their clock is stopped and will start when they join."}</div>}
      {intro && player && full && !st.over && st.history.length === 0 && <StartSplash white={seat === "w"} onDone={() => setIntro(false)} />}

      {player && !full && !st.over && (
        <div className="card space-y-3" style={{ border: "1px solid #d4a017" }}>
          <div className="font-bold">{ru ? "Отправьте ссылку другу" : "Send the link to your friend"}</div>
          <p className="text-sm opacity-80">{ru ? "Друг откроет ссылку и сразу окажется за доской, кошелёк и регистрация не нужны. Эту страницу не закрывайте." : "Your friend opens the link and is at the board right away: no wallet or sign-up needed. Keep this page open."}</p>
          <div className="mono text-xs break-all rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2 select-all" dir="ltr">{link}</div>
          <Share url={link} text={ru ? "Сыграем партию в шахматы?" : "Shall we play a chess game?"} />
          <div className="text-xs opacity-60">{ru ? "Вы играете за: " : "You play: "}<b>{names(seat as Color)}</b>. {ru ? "Ждём друга…" : "Waiting for your friend…"}</div>
        </div>
      )}

      {seat === "s" && <div className="card text-center text-sm">👀 {ru ? "Вы смотрите партию как зритель" : "You are watching this game"}</div>}

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {st.over ? "" : !full ? "" : paused ? (ru ? "Пауза" : "Paused") : myTurn ? (ru ? "Ваш ход" : "Your move") : player ? (ru ? "Ход соперника" : "Opponent's move") : (ru ? "Ход: " : "To move: ") + names(st.turn)}
        </span>
        <span className="opacity-60 text-xs">
          {player ? (ru ? "Вы: " : "You: ") + names(seat as Color) : ""}
          {player && full ? ` · ${ru ? "друг " : "friend "}${(seat === "w" ? st.online.b : st.online.w) ? "🟢" : "⚪"}` : ""}
          {st.watchers > 0 ? ` · 👀 ${st.watchers}` : ""}
        </span>
      </div>

      {clk(topC)}
      <Captured taken={mat.taken[iAmWhite ? "b" : "w"]} color={botC} plus={0} cartoon={cartoon} pawn={pawnOf(botC)} />
      <div className="relative">
        <BoardX
          fen={replay.fen}
          orientation={seat === "b" ? "black" : "white"}
          lastMove={replay.last}
          disabled={!myTurn || !replay.isLive}
          mute={!replay.isLive && !replay.playing}
          onMove={(from, to, promotion) => room.move(from, to, promotion)}
          {...(cartoon ? { pawnW: cp.pawnW, pawnB: cp.pawnB, moods } : {})}
        />
      </div>
      {clk(botC)}
      <Captured taken={mat.taken[botC]} color={topC} plus={0} cartoon={cartoon} pawn={pawnOf(topC)} />

      <div className="flex items-center gap-2">
        <button type="button" className="chip shrink-0" onClick={() => { const v = !cartoon; setCartoon(v); try { localStorage.setItem("cb_free_cartoon", v ? "1" : "0"); } catch { /* без сохранения */ } }}>🎭 {cartoon ? (ru ? "Мульт: вкл" : "Cartoon: on") : (ru ? "Мульт: выкл" : "Cartoon: off")}</button>
        {cartoon && (
          <>
            <button type="button" className="chip shrink-0" aria-label={ru ? "Голос" : "Voice"} onClick={() => { const v = !voice; setVoice(v); try { localStorage.setItem("cb_voice", v ? "1" : "0"); } catch { /* без сохранения */ } if (!v) window.speechSynthesis?.cancel(); }}>{voice ? "🔊" : "🔇"}</button>
            <div className="flex-1 min-h-9 flex items-center rounded-2xl px-3 text-sm font-bold text-emerald-500">{say ? "💬 " + say : ""}</div>
          </>
        )}
      </div>

      <ReplayBar r={replay} auto={st.over} />
      {cartoon && <CartoonSettings />}
      {!st.over && player && full && <PauseButton left={pausesLeft} active={myTurn && started} onClick={room.pause} />}
      <Moves san={st.history} />

      {player && st.chat && (
        <div className="card space-y-2">
          <div ref={chatBox} className="max-h-32 overflow-y-auto space-y-1 text-sm">
            {st.chat.length === 0 && <div className="opacity-50 text-xs">{ru ? "Чат партии: его видите только вы и друг" : "Game chat: only you and your friend can see it"}</div>}
            {st.chat.map((c, i) => (
              <div key={i} className={c.from === seat ? "text-end" : ""}>
                <span className={"inline-block rounded-2xl px-3 py-1 " + (c.from === seat ? "bg-emerald-500/20" : "bg-black/5 dark:bg-white/10")}>{c.text}</span>
              </div>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const text = msg.trim(); if (!text) return; room.chat(text); setMsg(""); }}>
            <input value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 200))} maxLength={200} placeholder={ru ? "Сообщение…" : "Message…"} className="flex-1 rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2 text-sm" />
            <button className="btn btn-primary !py-2" type="submit">{ru ? "Отправить" : "Send"}</button>
          </form>
        </div>
      )}

      {st.over && (
        <div className="card space-y-3 text-center">
          {st.winner === null && <><div className="text-4xl">🤝</div><div className="text-xl font-bold">{ru ? "Ничья" : "Draw"}</div></>}
          {st.winner !== null && !player && <div className="text-xl font-bold">🏁 {names(st.winner)}{ru ? " победили" : " won"}</div>}
          {iWon && <WinSplash />}
          {iLost && <LoseSplash />}
          {reasonText && <div className="text-sm opacity-70">{reasonText}</div>}
          {player && (
            <div className="space-y-2">
              {rematchByOpp && <div className="text-sm font-semibold">{ru ? "Друг предлагает реванш" : "Your friend wants a rematch"}</div>}
              <button className="btn btn-primary w-full" disabled={rematchByMe} onClick={room.rematch}>
                {rematchByMe ? (ru ? "Ждём согласия друга…" : "Waiting for your friend…") : rematchByOpp ? (ru ? "Принять реванш" : "Accept the rematch") : (ru ? "🔁 Реванш (поменяемся цветами)" : "🔁 Rematch (swap colors)")}
              </button>
            </div>
          )}
          <button className="btn btn-ghost w-full" onClick={back}>{ru ? "Новая партия" : "New game"}</button>
        </div>
      )}

      {!st.over && player && full && (
        <div className="card space-y-2">
          {oppOffered && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">{ru ? "Друг предлагает ничью" : "Your friend offers a draw"}</div>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-primary" onClick={room.acceptDraw}>{ru ? "Принять" : "Accept"}</button>
                <button className="btn btn-ghost" onClick={room.declineDraw}>{ru ? "Отклонить" : "Decline"}</button>
              </div>
            </div>
          )}
          {!oppOffered && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-ghost" disabled={iOffered || paused} onClick={room.offerDraw}>{iOffered ? (ru ? "Ничья предложена" : "Draw offered") : (ru ? "Предложить ничью" : "Offer a draw")}</button>
              {confirm
                ? <button className="btn btn-primary" onClick={() => { room.resign(); setConfirm(false); }}>{ru ? "Точно сдаться?" : "Really resign?"}</button>
                : <button className="btn btn-ghost" onClick={() => { setConfirm(true); setTimeout(() => setConfirm(false), 4000); }}>{ru ? "Сдаться" : "Resign"}</button>}
            </div>
          )}
        </div>
      )}

      {st.over && st.history.length > 0 && <div className="card"><AnalysisPanel san={st.history} replay={replay} me={player ? (seat as Color) : undefined} /></div>}

      <div className="card text-center text-xs opacity-75 space-y-2">
        <div>{ru ? "Хотите играть на USDC? Подключите кошелёк на главной и выберите ставку." : "Want to play for USDC? Connect a wallet on the home page and pick a stake."}</div>
        <button className="btn btn-ghost w-full" onClick={back}>{ru ? "На главную" : "Home"}</button>
      </div>
    </div>
  );
}

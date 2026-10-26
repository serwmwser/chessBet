"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { Color, roomLink, useRoom } from "@/lib/room";
import AnalysisPanel from "./Analysis";
import Board, { Clock, Moves } from "./Board";
import { ReplayBar, useReplay } from "./Replay";
import Share from "./Share";

const EMPTY: string[] = [];

/** Бесплатная партия с другом по ссылке: без кошелька и без ставок. roomId пустой — создаём новую комнату. */
export default function FriendGame({ roomId, color = "r", minutes = 60, onExit }: { roomId: string | null; color?: Color | "r"; minutes?: number; onExit: () => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const room = useRoom(roomId, color, minutes);
  const { st, seat, id } = room;
  const replay = useReplay(st?.history ?? EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now()); // для хода часов
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);

  // ссылка в адресной строке: её можно скопировать, а при обновлении страницы партия сохранится
  useEffect(() => {
    if (id) { try { history.replaceState(null, "", `${location.pathname}?room=${id}`); } catch { /* адрес менять нельзя */ } }
  }, [id]);

  const back = () => { try { history.replaceState(null, "", location.pathname); } catch { /* ничего */ } onExit(); };

  if (room.error === "room_not_found") {
    return (
      <div className="card space-y-3 text-center">
        <div className="text-lg font-bold">{ru ? "Комната не найдена" : "Room not found"}</div>
        <p className="text-sm opacity-75">{ru ? "Ссылка устарела: бесплатные партии хранятся недолго. Создайте новую." : "The link has expired: free games are kept for a short time. Create a new one."}</p>
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
  const myTurn = player && full && !st.over && st.turn === seat;
  const iWon = st.over && st.winner === seat;
  const iLost = st.over && st.winner !== null && st.winner !== seat && player;
  const names = (c: Color) => (c === "w" ? (ru ? "Белые" : "White") : (ru ? "Чёрные" : "Black"));
  const REASON: Record<string, [string, string]> = {
    checkmate: ["Мат", "Checkmate"], resign: ["Соперник сдался", "Resignation"], stalemate: ["Пат: ничья", "Stalemate: draw"],
    insufficient: ["Не хватает фигур для мата: ничья", "Insufficient material: draw"], repetition: ["Троекратное повторение: ничья", "Threefold repetition: draw"],
    fifty: ["Правило 50 ходов: ничья", "Fifty-move rule: draw"], timeout: ["Время вышло", "Time is up"], agreement: ["Ничья по соглашению", "Draw by agreement"],
  };
  const reasonText = st.reason && REASON[st.reason] ? REASON[st.reason][ru ? 0 : 1] : "";
  const oppOffered = player && st.drawOffer !== null && st.drawOffer !== seat;
  const iOffered = player && st.drawOffer === seat;
  const link = roomLink(st.id);
  const rem = (c: Color) => Math.max(0, st.clock[c] - (st.running && st.turn === c ? now - room.at : 0)); // остаток времени с учётом хода часов
  const topC: Color = seat === "b" ? "w" : "b";
  const botC: Color = seat === "b" ? "b" : "w";
  const clk = (c: Color) => <Clock ms={rem(c)} active={st.running && !st.over && st.turn === c} label={names(c) + (player && c === seat ? (ru ? " (вы)" : " (you)") : "")} />;
  const lim = Math.round(st.limit / 60000);
  const limText = lim >= 60 ? (lim % 60 === 0 ? lim / 60 + (ru ? " ч" : " h") : lim + (ru ? " мин" : " min")) : lim + (ru ? " мин" : " min");

  return (
    <div className="space-y-3">
      <div className="text-center text-xs font-bold text-emerald-500">🤝 {ru ? "Партия с другом: бесплатно, без ставок" : "Game with a friend: free, no stakes"} · ⏱ {limText}</div>

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
          {st.over ? "" : !full ? "" : myTurn ? (ru ? "Ваш ход" : "Your move") : player ? (ru ? "Ход соперника" : "Opponent's move") : (ru ? "Ход: " : "To move: ") + names(st.turn)}
        </span>
        <span className="opacity-60 text-xs">
          {player ? (ru ? "Вы: " : "You: ") + names(seat as Color) : ""}
          {player && full ? ` · ${ru ? "друг " : "friend "}${(seat === "w" ? st.online.b : st.online.w) ? "🟢" : "⚪"}` : ""}
          {st.watchers > 0 ? ` · 👀 ${st.watchers}` : ""}
        </span>
      </div>

      {clk(topC)}
      <div className="relative">
        <Board
          fen={replay.fen}
          orientation={seat === "b" ? "black" : "white"}
          lastMove={replay.last}
          disabled={!myTurn || !replay.isLive}
          mute={!replay.isLive && !replay.playing}
          onMove={(from, to, promotion) => room.move(from, to, promotion)}
        />
      </div>

      {clk(botC)}
      <ReplayBar r={replay} auto={st.over} />
      <Moves san={st.history} />

      {st.over && (
        <div className="card space-y-3 text-center">
          <div className="text-xl font-bold">
            {st.winner === null ? "🤝 " + (ru ? "Ничья" : "Draw") : !player ? "🏁 " + names(st.winner) + (ru ? " победили" : " won") : iWon ? "🏆 " + (ru ? "Вы победили!" : "You won!") : iLost ? (ru ? "Вы проиграли" : "You lost") : ""}
          </div>
          {reasonText && <div className="text-sm opacity-70">{reasonText}</div>}
          <button className="btn btn-primary w-full" onClick={back}>{ru ? "Новая партия" : "New game"}</button>
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
              <button className="btn btn-ghost" disabled={iOffered} onClick={room.offerDraw}>{iOffered ? (ru ? "Ничья предложена" : "Draw offered") : (ru ? "Предложить ничью" : "Offer a draw")}</button>
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

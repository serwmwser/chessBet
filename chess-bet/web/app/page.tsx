"use client";
import { useEffect, useRef, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import BotGame from "@/components/BotGame";
import BottomNav, { Tab } from "@/components/BottomNav";
import RefBanner from "@/components/RefBanner";
import FriendCard from "@/components/FriendCard";
import LobbyLinks from "@/components/LobbyLinks";
import Roadmap from "@/components/Roadmap";
import FriendGame from "@/components/FriendGame";
import MyFriendRooms from "@/components/MyFriendRooms";
import PieceShowcase from "@/components/PieceShowcase";
import type { Color } from "@/lib/room";
import Header from "@/components/Header";
import Earn from "@/components/Earn";
import FaucetBar from "@/components/FaucetBar";
import Hero from "@/components/Hero";
import Invite from "@/components/Invite";
import Lobby from "@/components/Lobby";
import OnlineGame from "@/components/OnlineGame";
import { WaitingSplash } from "@/components/Splash";
import Profile from "@/components/Profile";
import { fetchMine } from "@/lib/api";
import { TERMS_URL } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { captureRef, registerRef } from "@/lib/ref";
import { cartoonBot, useBotActive } from "@/lib/botStore";

/** Сигнал о начале партии: звук, вибрация, системное уведомление и заголовок вкладки, если она в фоне */
function alertJoin(title: string, body: string) {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* не поддерживается */ }
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC(); const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.08;
      o.frequency.setValueAtTime(1175, ctx.currentTime + 0.15);
      o.start(); o.stop(ctx.currentTime + 0.35);
    }
  } catch { /* звук заблокирован браузером */ }
  try {
    if (document.hidden) {
      if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
      const old = document.title;
      document.title = "♞ " + title;
      const back = () => { if (!document.hidden) { document.title = old; document.removeEventListener("visibilitychange", back); } };
      document.addEventListener("visibilitychange", back);
    }
  } catch { /* уведомления недоступны */ }
}

export default function Home() {
  const { t, toast, lang } = useApp();
  const ru = lang === "ru";
  const notified = useRef<number | null>(null);
  const [notifPerm, setNotifPerm] = useState<string>("unsupported");
  useEffect(() => { setNotifPerm("Notification" in window ? Notification.permission : "unsupported"); }, []);
  const account = useActiveAccount();
  const [tab, setTab] = useState<Tab>("lobby");
  const [gid, setGid] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [cartMode, setCartMode] = useState<"bot" | "arena">("bot");
  const [inviteId, setInviteId] = useState<number | null>(null);
  const [friend, setFriend] = useState<{ room: string | null; color: Color | "r"; minutes: number; n: number } | null>(null); // бесплатная партия с другом
  const addr = account?.address.toLowerCase();
  const botActive = useBotActive();
  const cartActive = cartoonBot.useBotActive();
  const openRoom = (id: string) => { setFriend((f) => ({ room: id, color: "r", minutes: 60, n: (f?.n ?? 0) + 1 })); setTab("friend"); }; // вернуться в свою бесплатную партию

  useEffect(() => { captureRef(); }, []);
  useEffect(() => { if (account) void registerRef(account as never); }, [account]);

  // Ссылка-приглашение: /?game=ID (для приватных игр ключ в #k=...)
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("game");
    if (p && /^\d+$/.test(p)) setInviteId(Number(p));
    const r = new URLSearchParams(location.search).get("room"); // ссылка в бесплатную комнату: /?room=ID
    if (r && /^[0-9a-f]{10}$/.test(r)) { setFriend({ room: r, color: "r", minutes: 60, n: 1 }); setTab("friend"); }
  }, []);

  // Следим за своими играми: как только соперник принял вызов, переключаемся на доску
  useEffect(() => {
    if (!addr) { setGid(null); setOpenCount(0); return; }
    const poll = async () => {
      try {
        const m = await fetchMine(addr);
        setOpenCount(m.open.length);
        const playing = m.active.find((x) => !x.over);
        if (gid === null && playing) {
          setGid(playing.id); setTab("play");
          if (notified.current !== playing.id) {
            notified.current = playing.id;
            const white = playing.white === addr;
            const title = ru ? "Соперник принял вызов!" : "Your opponent joined!";
            const body = white
              ? (ru ? "Вы играете белыми: сделайте первый ход." : "You play White: make the first move.")
              : (ru ? "Вы играете чёрными: ждите первого хода соперника." : "You play Black: wait for the first move.");
            toast(title + " " + body, "ok");
            alertJoin(title, body);
          }
        }
      } catch { /* сервер временно недоступен */ }
    };
    poll();
    const i = setInterval(poll, 3000);
    return () => clearInterval(i);
  }, [addr, gid, toast, t, ru]);

  const openGame = (id: number) => { setGid(id); setTab("play"); };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-3 pt-4 pb-32">
        <FaucetBar />
        {openCount > 0 && gid === null && (
          <div className="card mb-4 space-y-2 text-sm">
            <div>{ru ? "Вы ждёте соперника. Оставьте вкладку открытой: когда он присоединится, сайт сам откроет доску и подаст звук. Белыми ходит создатель игры, а если первый ход не сделан за время партии, игра отменяется и ставки возвращаются." : "You are waiting for an opponent. Keep this tab open: when they join, the site opens the board and plays a sound. The game creator plays White; if no first move is made within the game time, the game is cancelled and stakes are returned."}</div>
            {notifPerm === "default" && (
              <button className="btn btn-ghost" onClick={async () => setNotifPerm(await Notification.requestPermission())}>
                {ru ? "Включить уведомления браузера" : "Enable browser notifications"}
              </button>
            )}
          </div>
        )}
        {inviteId !== null && <Invite id={inviteId} onClose={() => setInviteId(null)} />}
        {tab === "lobby" && <div className="space-y-4"><Hero onBot={() => setTab("bot")} onEarn={() => setTab("earn")} /><FriendCard onStart={(c, mins) => { setFriend((f) => ({ room: null, color: c, minutes: mins, n: (f?.n ?? 0) + 1 })); setTab("friend"); }} /><MyFriendRooms onOpen={openRoom} /><RefBanner onEarn={() => setTab("earn")} /><LobbyLinks onArena={() => { setCartMode("arena"); setTab("cartoon"); }} /><Lobby /></div>}
        {tab === "play" && (gid !== null
          ? <OnlineGame id={gid} onExit={() => { setGid(null); setTab("lobby"); }} />
          : openCount ? <WaitingSplash /> : <div className="card text-center space-y-1 py-10"><div className="text-4xl">♞</div><div className="font-medium">{t("noActive")}</div></div>)}
        {tab === "friend" && friend && <FriendGame key={friend.n} roomId={friend.room} color={friend.color} minutes={friend.minutes} onRoom={(id) => setFriend((f) => (f && f.room !== id ? { ...f, room: id } : f))} onExit={() => { setFriend(null); setTab("lobby"); }} />}
        {tab === "bot" && <BotGame />}
        {tab === "cartoon" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" className={"chip flex-1 justify-center " + (cartMode === "bot" ? "chip-on" : "")} onClick={() => setCartMode("bot")}>{ru ? "🤖 С ботом (бесплатно)" : "🤖 Vs bot (free)"}</button>
              <button type="button" className={"chip flex-1 justify-center " + (cartMode === "arena" ? "chip-on" : "")} style={cartMode === "arena" ? { background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00", fontWeight: 700 } : { border: "1px solid #d4a017", color: "#d4a017", fontWeight: 700 }} onClick={() => setCartMode("arena")}>{ru ? "🎭👑 Мульт-арена на токены" : "🎭👑 Cartoon arena (tokens)"}</button>
            </div>
            <PieceShowcase />
            {cartMode === "bot" ? <BotGame cartoon /> : <Lobby arena />}
          </div>
        )}
        {tab === "earn" && <Earn />}
        {tab === "roadmap" && (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">🗺 {ru ? "Дорожная карта" : "Roadmap"}</h1>
            <Roadmap open />
          </div>
        )}
        {tab === "profile" && <Profile onOpenGame={openGame} onOpenRoom={openRoom} />}
        <p className="text-center text-xs opacity-50 mt-8">18+ · <a className="underline" href={TERMS_URL}>Terms</a> · <a className="underline" href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/roadmap/"}>{ru ? "Дорожная карта" : "Roadmap"}</a> · Play responsibly</p>
      </main>
      <BottomNav tab={tab} setTab={setTab} badge={gid !== null} botBadge={botActive} cartBadge={cartActive} />
    </>
  );
}

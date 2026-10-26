"use client";
import { useEffect, useState } from "react";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { fetchHistory, fetchProfile, postFaucet, DoneGame, ProfileData, Stats } from "@/lib/api";
import { chain, client, FAUCET_ENABLED, shortAddr, usdc, USDC_ADDRESS } from "@/lib/config";
import { BOARDS, BoardName, useApp } from "@/lib/ctx";
import { PIECE_SETS, usePieceSet } from "@/lib/pieces";
import { PTHEMES, usePTheme } from "@/lib/ptheme";
import { gameUrl } from "@/lib/invite";
import Avatar from "./Avatar";
import GameReplay from "./GameReplay";
import BuyCrypto from "./BuyCrypto";
import HowTo from "./HowTo";
import MyGames from "./MyGames";
import MyFriendRooms from "./MyFriendRooms";
import MyNfts from "./MyNfts";
import ProfileEditor from "./ProfileEditor";
import Share from "./Share";

export default function Profile({ onOpenGame, onOpenRoom }: { onOpenGame: (id: number) => void; onOpenRoom?: (id: string) => void }) {
  const { t, board, setBoard, toast } = useApp();
  const uiLang = useApp().lang;
  const [pset, setPset] = usePieceSet();
  const [pth, setPth] = usePTheme();
  const account = useActiveAccount();
  const me = account?.address;
  const pol = useWalletBalance({ client, chain, address: me });
  const usd = useWalletBalance({ client, chain, address: me, tokenAddress: USDC_ADDRESS });
  const [data, setData] = useState<{ games: DoneGame[]; stats: Stats } | null>(null);
  const [prof, setProf] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<number | null>(null); // открытая для просмотра партия из истории
  const [faucetBusy, setFaucetBusy] = useState(false);
  const getTest = async () => {
    if (!me) return;
    setFaucetBusy(true);
    try { const r = await postFaucet(me); toast(r.ok ? t("testTokensDone") : t("testTokensFail"), r.ok ? "ok" : "err"); }
    catch { toast(t("testTokensFail"), "err"); }
    finally { setFaucetBusy(false); }
  };
  const [site, setSite] = useState("");
  useEffect(() => { setSite(`${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`); }, []);
  useEffect(() => {
    if (!me) { setProf(null); return; }
    fetchProfile(me.toLowerCase()).then(setProf).catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!me) { setData(null); return; }
    const load = () => fetchHistory(me.toLowerCase()).then(setData).catch(() => {});
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, [me]);

  const lowGas = !!pol.data && Number(pol.data.displayValue) < 0.01;
  const net = data ? data.stats.net : 0;

  return (
    <div className="space-y-4">
      {view !== null && me && <GameReplay id={view} me={me.toLowerCase()} onClose={() => setView(null)} />}
      {!me ? (
        <div className="card text-center opacity-80">{t("signIn")}</div>
      ) : (
        <>
          {editing ? (
            <ProfileEditor initial={prof} onSaved={(p) => { setProf(p); setEditing(false); }} onClose={() => setEditing(false)} />
          ) : (
            <section className="card space-y-2" style={pth.style}>
              <div className="flex items-center gap-3">
                <Avatar src={prof?.avatar} name={prof?.name || me.slice(2)} size={64} />
                <div className="min-w-0 me-auto">
                  <div className="text-lg font-bold truncate">{prof?.name || t("player")}</div>
                  <div className="mono text-xs opacity-60" dir="ltr">{shortAddr(me)}</div>
                </div>
                <button className="chip chip-on" onClick={() => setEditing(true)}>{t("editProfile")}</button>
              </div>
              {prof?.bio && <p className="text-sm opacity-80 break-words">{prof.bio}</p>}
              {prof?.link && <a className="text-sm text-emerald-600 dark:text-emerald-400 underline break-all" dir="ltr" href={prof.link} target="_blank" rel="noopener noreferrer nofollow">{prof.link.replace(/^https?:\/\//, "")}</a>}
            </section>
          )}

          <HowTo />
          <BuyCrypto />

          {FAUCET_ENABLED && (
            <section className="card space-y-2">
              <h2 className="text-lg font-bold">{t("testTokens")}</h2>
              <p className="text-sm opacity-70">{t("testTokensHint")}</p>
              <button className="btn btn-primary" disabled={faucetBusy} onClick={getTest}>{t("testTokensGet")}</button>
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="text-lg font-bold">{t("inviteFriend")}</h2>
            <p className="text-sm opacity-70">{t("inviteHint")}</p>
            {site && <Share url={site} text={t("inviteFriendText")} />}
          </section>

          <MyGames onOpenGame={onOpenGame} />
          {onOpenRoom && <MyFriendRooms onOpen={onOpenRoom} />}
          <MyNfts />
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("balance")}</h2>
              <span className="mono text-xs opacity-60" dir="ltr">{shortAddr(me)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-emerald-500/10 p-3"><div className="text-xs opacity-60">USDC</div><div className="mono text-xl font-bold">{usd.data ? Number(usd.data.displayValue).toFixed(2) : "…"}</div></div>
              <div className="rounded-2xl bg-violet-500/10 p-3"><div className="text-xs opacity-60">POL</div><div className="mono text-xl font-bold">{pol.data ? Number(pol.data.displayValue).toFixed(3) : "…"}</div></div>
            </div>
            {lowGas && <p className="text-sm rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 px-3 py-2">⛽ {t("lowGas")}</p>}
          </section>

          <section className="card space-y-3">
            <h2 className="text-lg font-bold">{t("stats")}</h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([[t("wins"), data?.stats.wins], [t("losses"), data?.stats.losses], [t("draws"), data?.stats.draws]] as const).map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-black/5 dark:bg-white/5 py-2"><div className="mono text-xl font-bold">{v ?? "–"}</div><div className="text-[11px] opacity-60">{l}</div></div>
              ))}
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 py-2">
                <div className={`mono text-xl font-bold ${net > 0 ? "text-emerald-500" : net < 0 ? "text-red-500" : ""}`}>{net > 0 ? "+" : ""}{usdc(net)}</div>
                <div className="text-[11px] opacity-60">{t("net")}</div>
              </div>
            </div>
          </section>

          <section className="card space-y-2">
            <h2 className="text-lg font-bold">{t("history")}</h2>
            {data === null && <div className="skeleton h-14" />}
            {data?.games.map((g) => {
              const mine = me.toLowerCase();
              const won = g.winner === mine, drawn = !g.winner;
              const opp = g.white === mine ? g.black : g.white;
              const delta = drawn ? 0 : won ? Number(g.payout) - Number(g.bet) : -Number(g.bet);
              return (
                <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2">
                  <span className="text-xl">{drawn ? "🤝" : won ? "🏆" : "♚"}</span>
                  <div className="me-auto min-w-0">
                    <div className="text-sm font-medium">{drawn ? t("rDraw") : won ? t("won") : t("lost")}</div>
                    <div className="text-xs opacity-60" dir="ltr">#{g.id} · {shortAddr(opp)} · {new Date(g.at).toLocaleDateString()}</div>
                  </div>
                  <button type="button" className="chip" onClick={() => setView(g.id)}>{uiLang === "ru" ? "Анализ игры" : "Game analysis"}</button>
                  <span className={`mono font-semibold ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "opacity-60"}`}>{delta > 0 ? "+" : ""}{usdc(delta)}</span>
                </div>
              );
            })}
          </section>
        </>
      )}

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{t("boardTheme")}</h2>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(BOARDS) as BoardName[]).map((b) => (
            <button key={b} onClick={() => setBoard(b)} aria-label={b} aria-pressed={board === b}
              className={`w-14 h-14 rounded-2xl overflow-hidden grid grid-cols-2 border-2 ${board === b ? "border-emerald-500" : "border-transparent"}`}>
              {[0, 1, 1, 0].map((c, i) => <span key={i} style={{ background: BOARDS[b][c] }} />)}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{uiLang === "ru" ? "Фигуры" : "Pieces"}</h2>
        <div className="flex gap-2 flex-wrap">
          {PIECE_SETS.map((p) => (
            <button key={p.id} onClick={() => setPset(p.id)} aria-pressed={pset === p.id}
              className={"chip " + (pset === p.id ? "chip-on" : "")}>{uiLang === "ru" ? p.ru : p.en}</button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">{uiLang === "ru" ? "Дизайн профиля" : "Profile design"}</h2>
        <div className="flex gap-2 flex-wrap">
          {PTHEMES.map((p) => (
            <button key={p.id} onClick={() => setPth(p.id)} aria-pressed={pth.id === p.id}
              className={"chip " + (pth.id === p.id ? "chip-on" : "")}>{uiLang === "ru" ? p.ru : p.en}</button>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] opacity-40">{uiLang === "ru" ? "Версия сайта" : "Site build"}: {process.env.NEXT_PUBLIC_BUILD}</p>
    </div>
  );
}

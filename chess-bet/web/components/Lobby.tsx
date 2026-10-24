"use client";
import { CSSProperties, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchGames, fetchMine, OpenGame } from "@/lib/api";
import { BETS, BIG_BETS, BIG_MAX, VIP_BETS, BET_MAX, DEFAULT_FEE_BPS, DURATIONS, shortAddr, TERMS_URL, usdc } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { gameUrl, newInvite } from "@/lib/invite";
import { Step, useEscrow } from "@/lib/tx";
import Share from "./Share";
import { useLT } from "@/lib/lobbyTxt";

export const durLabel = (sec: number, min: string, hr: string) => (sec < 3600 ? `${sec / 60} ${min}` : `${sec / 3600} ${hr}`);
const QUICK = [500_000, 1_000_000, 2_500_000, 5_000_000, 5_500_000, 7_500_000, 10_000_000, 12_500_000, 15_000_000, 17_500_000, 20_000_000, 22_500_000, 25_000_000, 25_500_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000];
/** Золотая кнопка VIP */
const vipStyle = (on: boolean): CSSProperties => on
  ? { background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00", fontWeight: 700, boxShadow: "0 4px 14px -2px rgba(245,179,1,.55)" }
  : { border: "1px solid #d4a017", color: "#d4a017", fontWeight: 700 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Lobby() {
  const { t, toast, agreed, setAgreed } = useApp();
  const { account, create, join, cancel } = useEscrow();
  const [games, setGames] = useState<OpenGame[] | null>(null);
  const [feeBps, setFeeBps] = useState(DEFAULT_FEE_BPS);
  const [betIdx, setBetIdx] = useState(1); // 1 USDC
  const [tier, setTier] = useState<0 | 1 | 2>(0); // 0 Стандарт, 1 Крупные, 2 VIP
  const big = tier === 1;
  const vip = tier === 2;
  const lt = useLT();
  const [dur, setDur] = useState(900);
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState<number | "create" | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [fMax, setFMax] = useState(0);
  const [fDur, setFDur] = useState(0);
  const [created, setCreated] = useState<{ id: number; url: string; bet: number } | null>(null);

  const refresh = useCallback(async () => {
    try { const r = await fetchGames(); setGames(r.games); setFeeBps(r.feeBps); } catch { setGames((g) => g ?? []); }
  }, []);
  useEffect(() => { refresh(); const i = setInterval(refresh, 4000); return () => clearInterval(i); }, [refresh]);

  const LIST = vip ? VIP_BETS : big ? BIG_BETS : BETS;
  const bet = LIST[Math.min(betIdx, LIST.length - 1)];
  const pot = bet * 2;
  const win = pot - Math.floor((pot * feeBps) / 10_000);
  const me = account?.address.toLowerCase();

  const errMsg = (e: unknown) => ((e as Error)?.message || "error").slice(0, 160);
  const guard = () => {
    if (!account) { toast(t("signIn"), "err"); return false; }
    if (!agreed) { toast(t("ageNote"), "err"); return false; }
    return true;
  };
  const stepText = step === "approve" ? lt.stepApprove : step === "confirm" ? lt.stepConfirm : "";
  const mineOpen = async (a: string) => { try { return (await fetchMine(a)).open; } catch { return [] as OpenGame[]; } };

  const onCreate = async () => {
    if (!guard() || !me) return;
    setBusy("create");
    try {
      const known = new Set((await mineOpen(me)).map((g) => g.id));
      const inv = priv ? newInvite() : null;
      await create(bet, dur, inv ? inv.signer : null, setStep);
      toast(t("waiting"), "ok");
      refresh();
      // ждём, пока сервер увидит игру, чтобы узнать её номер и показать ссылку-приглашение
      for (let i = 0; i < 10; i++) {
        const g = (await mineOpen(me)).find((x) => (inv ? x.signer === inv.signer.toLowerCase() : !known.has(x.id)));
        if (g) { setCreated({ id: g.id, bet: Number(g.bet), url: gameUrl(g.id, inv?.key) }); break; }
        await sleep(1500);
      }
    } catch (e) { toast(errMsg(e), "err"); }
    finally { setBusy(null); setStep("idle"); }
  };
  const onJoin = async (g: OpenGame) => {
    if (!guard()) return;
    setBusy(g.id);
    try { await join(g.id, Number(g.bet), "0x", setStep); await refresh(); }
    catch (e) { toast(errMsg(e), "err"); }
    finally { setBusy(null); setStep("idle"); }
  };
  const onCancel = async (g: OpenGame) => {
    setBusy(g.id);
    try { await cancel(g.id); await refresh(); } catch (e) { toast(errMsg(e), "err"); } finally { setBusy(null); }
  };

  const list = (games ?? []).filter((g) => (!fMax || Number(g.bet) <= fMax) && (!fDur || g.duration === fDur));

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <h2 className="text-lg font-bold">{t("createGame")}</h2>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="bet" className="text-sm opacity-70">{t("bet")}</label>
            <span className="mono text-2xl font-bold bg-gradient-to-r from-brand-400 to-brand-violet bg-clip-text text-transparent">{usdc(bet)} USDC</span>
          </div>
<div className="flex flex-wrap gap-2 mb-2"><button type="button" className={"chip " + (tier === 0 ? "chip-on" : "")} onClick={() => { setTier(0); setBetIdx(1); }}>{lt.stdName} 0.5-5</button>{BIG_BETS.length > 0 ? <button type="button" className={"chip " + (big ? "chip-on" : "")} onClick={() => { setTier(1); setBetIdx(0); }}>{lt.bigName} 5.5-{BIG_MAX / 1e6}</button> : null}{VIP_BETS.length > 0 ? <button type="button" className="chip" style={vipStyle(vip)} onClick={() => { setTier(2); setBetIdx(0); }}>👑 {lt.vipName} 25.5-{BET_MAX / 1e6}</button> : null}</div>
<p className="text-xs opacity-70 mb-2">{vip ? lt.vipInfo(String(BET_MAX / 1e6)) : big ? lt.bigInfo(String(BIG_MAX / 1e6)) : lt.stdInfo}</p>
<p className="text-xs opacity-70 mb-2">{lt.switchHint} {vip ? lt.quickVip(String(BET_MAX / 1e6)) : big ? lt.quickBig(String(BIG_MAX / 1e6)) : lt.quickStd}</p>
          <input id="bet" type="range" min={0} max={LIST.length - 1} value={betIdx} onChange={(e) => setBetIdx(+e.target.value)} className="w-full h-8" />
          <div className="flex flex-wrap gap-2 mt-1">
            {QUICK.filter((q) => LIST.includes(q)).map((q) => (
              <button key={q} className={`chip ${bet === q ? "chip-on" : ""}`} onClick={() => setBetIdx(LIST.indexOf(q))}>{usdc(q)}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm opacity-70 mb-1">{t("time")}</div>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d} className={`chip ${dur === d ? "chip-on" : ""}`} onClick={() => setDur(d)}>{durLabel(d, t("min"), t("hr"))}</button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="accent-emerald-500 w-4 h-4" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
          <span>🔒 {t("privateGame")}</span>
        </label>

        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-2xl bg-black/5 dark:bg-white/5 py-2"><dt className="opacity-60 text-xs">{t("pot")}</dt><dd className="mono font-semibold">{usdc(pot)}</dd></div>
          <div className="rounded-2xl bg-black/5 dark:bg-white/5 py-2"><dt className="opacity-60 text-xs">{t("fee")} {feeBps / 100}%</dt><dd className="mono font-semibold">{usdc(pot - win)}</dd></div>
          <div className="rounded-2xl bg-emerald-500/15 py-2"><dt className="opacity-70 text-xs">{t("winnerGets")}</dt><dd className="mono font-bold text-emerald-500">{usdc(win)}</dd></div>
        </dl>

        {!agreed && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-emerald-500" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>{t("ageNote")} · <a className="underline" href={TERMS_URL} target="_blank" rel="noreferrer">Terms</a></span>
          </label>
        )}

        <button className="btn btn-primary w-full" disabled={busy !== null} onClick={onCreate}>
          {busy === "create" ? stepText || "…" : t("create")}
        </button>
        <p className="text-xs opacity-70">{lt.signHint}</p>
        <p className="text-xs opacity-60">{lt.walletNote}</p>
        {!account && <p className="text-sm opacity-70 text-center">{t("signIn")}</p>}
      </section>

      {created && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-2 !border-emerald-500/40">
          <div className="flex items-center justify-between">
            <div className="font-semibold">⏳ #{created.id} · {usdc(created.bet)} USDC · {t("waiting")}</div>
            <button className="text-xl leading-none opacity-60" aria-label="Close" onClick={() => setCreated(null)}>×</button>
          </div>
          <div className="mono text-xs break-all opacity-70" dir="ltr">{created.url}</div>
          <Share url={created.url} text={`${t("inviteText")} · ${usdc(created.bet)} USDC`} />
        </motion.section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold me-auto">{t("lobby")}</h2>
          <select aria-label={t("bet")} value={fMax} onChange={(e) => setFMax(+e.target.value)} className="rounded-xl bg-black/5 dark:bg-white/10 px-2 py-1.5 text-sm">
            <option value={0} className="text-slate-900">{t("bet")}: {t("any")}</option>
            {[500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000].map((v) => <option key={v} value={v} className="text-slate-900">≤ {usdc(v)}</option>)}
          </select>
          <select aria-label={t("time")} value={fDur} onChange={(e) => setFDur(+e.target.value)} className="rounded-xl bg-black/5 dark:bg-white/10 px-2 py-1.5 text-sm">
            <option value={0} className="text-slate-900">{t("time")}: {t("any")}</option>
            {DURATIONS.map((d) => <option key={d} value={d} className="text-slate-900">{durLabel(d, t("min"), t("hr"))}</option>)}
          </select>
        </div>

        {games === null && [0, 1, 2].map((i) => <div key={i} className="skeleton h-[72px]" />)}
        {games !== null && list.length === 0 && <div className="card text-center opacity-70 text-sm">{t("noGames")}</div>}

        <AnimatePresence initial={false}>
          {list.map((g) => {
            const mine = g.p1 === me;
            return (
              <motion.div key={g.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card flex items-center gap-3 !py-3">
                <div className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500/25 to-brand-violet/25 text-xl">♟</div>
                <div className="me-auto min-w-0">
                  <div className="mono font-bold">{usdc(g.bet)} USDC</div>
                  <div className="text-xs opacity-60 truncate" dir="ltr">{durLabel(g.duration, t("min"), t("hr"))} · {shortAddr(g.p1)}</div>
                </div>
                {mine
                  ? <button className="btn btn-ghost !py-2" disabled={busy !== null} onClick={() => onCancel(g)}>{t("cancel")}</button>
                  : <button className="btn btn-primary !py-2" disabled={busy !== null} onClick={() => onJoin(g)}>{busy === g.id ? stepText || "…" : t("join")}</button>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </section>
    </div>
  );
}

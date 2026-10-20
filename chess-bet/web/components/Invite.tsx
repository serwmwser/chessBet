"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchGame, OpenGame } from "@/lib/api";
import { shortAddr, TERMS_URL, usdc } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { gameUrl, keyFromHash, keyMatches, signJoin } from "@/lib/invite";
import { useLT } from "@/lib/lobbyTxt";
import { Step, useEscrow } from "@/lib/tx";
import { durLabel } from "./Lobby";
import Share from "./Share";

/** Страница приглашения: открывается по ссылке ?game=ID (для приватных игр ключ лежит в #k=...). */
export default function Invite({ id, onClose }: { id: number; onClose: () => void }) {
  const { t, toast, agreed, setAgreed } = useApp();
  const lt = useLT();
  const { account, join } = useEscrow();
  const [g, setG] = useState<OpenGame | null | undefined>(undefined); // undefined — загрузка, null — не найдена
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);
  const key = useMemo(() => (typeof window === "undefined" ? null : keyFromHash()), []);

  useEffect(() => {
    let stop = false, tries = 0;
    const run = async () => {
      try {
        const r = await fetchGame(id);
        if (stop) return;
        if (r.status === "open" && r.game) setG(r.game);
        else if (r.status === "unknown" && tries++ < 5) setTimeout(run, 1500); // сервер мог ещё не увидеть новую игру
        else setG(null);
      } catch { if (!stop) setG(null); }
    };
    run();
    return () => { stop = true; };
  }, [id]);

  const close = () => { history.replaceState(null, "", location.pathname); onClose(); };

  if (g === undefined) return <div className="skeleton h-40 mb-4" />;
  if (g === null) {
    return (
      <div className="card mb-4 text-center space-y-3">
        <div>{t("inviteBad")}</div>
        <button className="btn btn-ghost" onClick={close}>{t("backLobby")}</button>
      </div>
    );
  }

  const mine = !!account && g.p1 === account.address.toLowerCase();
  const badKey = !!g.signer && !mine && (!key || !keyMatches(key, g.signer));

  const onJoin = async () => {
    if (!account) { toast(t("signIn"), "err"); return; }
    if (!agreed) { toast(t("ageNote"), "err"); return; }
    setBusy(true);
    try {
      const sig = g.signer ? await signJoin(key as string, id, account.address) : "0x";
      await join(id, Number(g.bet), sig, setStep);
      close();
    } catch (e) { toast(((e as Error).message || "error").slice(0, 160), "err"); }
    finally { setBusy(false); setStep("idle"); }
  };

  const stepText = step === "approve" ? lt.stepApprove : step === "confirm" ? lt.stepConfirm : "…";

  return (
    <section className="card mb-4 space-y-3 !border-emerald-500/40 !bg-gradient-to-br from-brand-500/10 to-brand-violet/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("inviteTitle")}</h2>
        <button className="text-xl leading-none opacity-60" aria-label="Close" onClick={close}>×</button>
      </div>
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/25 to-brand-violet/25 text-2xl">♟</div>
        <div className="me-auto">
          <div className="mono text-xl font-bold">{usdc(g.bet)} USDC</div>
          <div className="text-xs opacity-70" dir="ltr">#{g.id} · {durLabel(g.duration, t("min"), t("hr"))} · {shortAddr(g.p1)}{g.signer ? ` · 🔒 ${t("priv")}` : ""}</div>
        </div>
      </div>

      {mine ? (
        <>
          <div className="text-sm opacity-80">{t("waiting")}</div>
          <Share url={gameUrl(g.id, key ?? undefined)} text={`${t("inviteText")} · ${usdc(g.bet)} USDC`} />
        </>
      ) : badKey ? (
        <div className="text-sm text-red-500">{t("inviteBad")}</div>
      ) : (
        <>
          {!agreed && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-emerald-500" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>{t("ageNote")} · <a className="underline" href={TERMS_URL} target="_blank" rel="noreferrer">Terms</a></span>
            </label>
          )}
          <button className="btn btn-primary w-full" disabled={busy} onClick={onJoin}>{busy ? stepText : t("join")}</button>
          <p className="text-xs opacity-70">{lt.signHint}</p>
          <p className="text-xs opacity-60">{lt.walletNote}</p>
          {!account && <p className="text-sm opacity-70 text-center">{t("signIn")}</p>}
        </>
      )}
    </section>
  );
}

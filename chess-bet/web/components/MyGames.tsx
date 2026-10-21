"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHistory, fetchMine, LiveInfo, OpenGame } from "@/lib/api";
import { usdc } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import { gameUrl, keyForSigner } from "@/lib/invite";
import { readClaimInfo, useEscrow } from "@/lib/tx";
import Claim from "./Claim";
import { durLabel } from "./Lobby";
import Share from "./Share";

const GRACE_MS = 3 * 86_400_000;

/** Раздел профиля: мои созданные игры, идущие партии, невостребованные выплаты и возврат ставок по зависшим партиям (кнопка появляется только когда срок вышел). */
export default function MyGames({ onOpenGame }: { onOpenGame: (id: number) => void }) {
  const { t, toast, lang } = useApp();
  const { account, cancel, refund } = useEscrow();
  const me = account?.address;
  const [mine, setMine] = useState<{ open: OpenGame[]; active: LiveInfo[] } | null>(null);
  const [claims, setClaims] = useState<{ id: number }[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadMine = useCallback(async () => {
    if (!me) return;
    try { setMine(await fetchMine(me.toLowerCase())); setNow(Date.now()); } catch { /* сервер недоступен */ }
  }, [me]);
  useEffect(() => { loadMine(); const i = setInterval(loadMine, 4000); return () => clearInterval(i); }, [loadMine]);

  // выплаты, которые игрок ещё не забрал, — по последним 20 завершённым играм.
  // Игры, по которым всё забрано или забирать нечего, запоминаем и больше не проверяем; остальные читаем по очереди,
  // чтобы не создавать всплесков запросов к блокчейну (у бесплатного RPC есть лимит запросов в секунду).
  const settled = useRef<Set<number>>(new Set());
  useEffect(() => { settled.current = new Set(); }, [me]);
  const loadClaims = useCallback(async () => {
    if (!me) return;
    try {
      const h = await fetchHistory(me.toLowerCase());
      const found: { id: number }[] = [];
      for (const g of h.games.slice(0, 20)) {
        if (settled.current.has(g.id)) continue;
        const i = await readClaimInfo(g.id, me).catch(() => null);
        if (!i) continue;
        if (i.claimed || (i.amount === 0 && i.status >= 3)) { settled.current.add(g.id); continue; }
        if (i.amount > 0) found.push({ id: g.id });
      }
      setClaims(found);
    } catch { /* повторим позже */ }
  }, [me]);
  useEffect(() => { loadClaims(); const i = setInterval(loadClaims, 30000); return () => clearInterval(i); }, [loadClaims]);

  if (!me) return null;

  const errMsg = (e: unknown) => ((e as Error)?.message || "error").slice(0, 160);
  const playing = (mine?.active ?? []).filter((g) => !g.over);
  const stuck = (mine?.active ?? []).filter((g) => now > g.startedAt + (2 * g.duration * 1000 + GRACE_MS));

  const doCancel = async (id: number) => {
    setBusy(id);
    try { await cancel(id); await loadMine(); } catch (e) { toast(errMsg(e), "err"); } finally { setBusy(null); }
  };
  const doRefund = async (id: number) => {
    setBusy(id);
    try { await refund(id); toast(t("claim"), "ok"); await loadClaims(); } catch (e) { toast(errMsg(e), "err"); } finally { setBusy(null); }
  };

  return (
    <>
      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{t("myGames")}</h2>
        {mine === null && <div className="skeleton h-14" />}
        {mine && mine.open.length === 0 && playing.length === 0 && <p className="text-sm opacity-70">{t("noMyGames")}</p>}

        {playing.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-3 py-2">
            <span className="text-xl">♞</span>
            <div className="me-auto"><div className="mono font-semibold">#{g.id} · {usdc(g.bet)} USDC</div><div className="text-xs opacity-60">{t("live")}</div></div>
            <button className="btn btn-primary !py-2" onClick={() => onOpenGame(g.id)}>{t("resume")}</button>
          </div>
        ))}

        {mine && mine.open.length > 0 && (
          <p className="text-xs opacity-70">
            {lang === "ru"
              ? "Игра без соперника хранится без ограничения по времени. Кнопка «Отмена» сразу возвращает вашу ставку целиком на ваш кошелёк (одной транзакцией, нужна небольшая комиссия сети в POL). Отменить можно только пока никто не присоединился. Токены лежат в смарт-контракте, ни у кого, кроме вас, доступа к ним нет."
              : "A game without an opponent is kept with no time limit. The Cancel button returns your full stake to your wallet right away (one transaction, a small network fee in POL is needed). You can cancel only while nobody has joined. The tokens sit in the smart contract and nobody but you can take them out."}
          </p>
        )}

        {mine?.open.map((g) => {
          const k = g.signer ? keyForSigner(g.signer) : undefined;
          return (
            <div key={g.id} className="rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">{g.signer ? "🔒" : "⏳"}</span>
                <div className="me-auto">
                  <div className="mono font-semibold">#{g.id} · {usdc(g.bet)} USDC</div>
                  <div className="text-xs opacity-60">{durLabel(g.duration, t("min"), t("hr"))} · {g.signer ? `${t("priv")} · ` : ""}{t("waiting")}</div>
                </div>
                <button className="btn btn-ghost !py-2" disabled={busy === g.id} onClick={() => doCancel(g.id)}>{t("cancel")}</button>
              </div>
              {(!g.signer || k) && <Share url={gameUrl(g.id, k)} text={`${t("inviteText")} · ${usdc(g.bet)} USDC`} />}
            </div>
          );
        })}
      </section>

      {claims.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-lg font-bold">{t("unclaimed")}</h2>
          {claims.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <span className="mono text-sm pt-3">#{c.id}</span>
              <div className="flex-1"><Claim id={c.id} who={me} onClaimed={loadClaims} /></div>
            </div>
          ))}
        </section>
      )}

      {stuck.length > 0 && (
        <section className="card space-y-2">
          <p className="text-sm opacity-80">{t("stuckNote")}</p>
          {stuck.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="mono me-auto">#{g.id} · {usdc(g.bet)} USDC</span>
              <button className="btn btn-primary !py-2" disabled={busy === g.id} onClick={() => doRefund(g.id)}>{t("refund")}</button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

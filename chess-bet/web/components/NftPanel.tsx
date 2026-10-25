"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { isTaken, nftEnabled, NftStep, openSeaCollection, openSeaUrl, readMintFee, useNft } from "@/lib/nft";
import type { useReplay } from "./Replay";

const GOLD = { background: "linear-gradient(90deg,#fde68a,#f5b301,#b8860b)", color: "#2b1a00", fontWeight: 700 } as const;

/** Создание NFT любого хода сыгранной партии: игрок листает партию (как в анализе), выбирает ход и платит за NFT. */
export default function NftPanel({ id, san, replay }: { id: number; san: string[]; replay: ReturnType<typeof useReplay> }) {
  const { lang, toast } = useApp();
  const ru = lang === "ru";
  const { account, mint } = useNft();
  const ply = replay.cur;
  const total = replay.total;
  const [taken, setTaken] = useState<boolean | null>(null);
  const [fee, setFee] = useState(1);
  const [step, setStep] = useState<NftStep>("idle");
  const [done, setDone] = useState<{ ply: number; token: number | null } | null>(null);

  useEffect(() => { readMintFee().then((f) => setFee(Number(f) / 1e6)).catch(() => { /* остаётся 1 USDC */ }); }, []);
  useEffect(() => {
    let off = false;
    setTaken(null);
    if (ply >= 1) isTaken(id, ply).then((t) => { if (!off) setTaken(t); });
    return () => { off = true; };
  }, [id, ply, done]);

  if (!nftEnabled || total === 0) return null;

  const errText = (e: unknown) => {
    const m = ((e as Error)?.message || "error").toString();
    if (m.includes("not_finished") || m.includes("not finished")) return ru ? "Результат партии ещё записывается в блокчейн. Повторите через минуту." : "The result is still being recorded on the blockchain. Try again in a minute.";
    if (m.includes("taken")) return ru ? "Этот ход уже превращён в NFT. Выберите другой." : "This move is already an NFT. Pick another one.";
    if (m.includes("not player")) return ru ? "Создать NFT могут только игроки этой партии." : "Only the players of this game can create an NFT.";
    if (m.includes("nft_off")) return ru ? "NFT пока выключены." : "NFTs are not enabled yet.";
    return m.slice(0, 140);
  };
  const busy = step !== "idle";
  const move = ply >= 1 ? ply + ". " + (san[ply - 1] ?? "") : "";
  const stepText = step === "sign" ? (ru ? "Готовим NFT…" : "Preparing the NFT…")
    : step === "approve" ? (ru ? "Подтвердите в кошельке разрешение на " + fee + " USDC" : "Approve " + fee + " USDC in your wallet")
    : step === "confirm" ? (ru ? "Подтвердите создание NFT в кошельке" : "Confirm the NFT in your wallet") : "";

  const create = async () => {
    if (!account) { toast(ru ? "Подключите кошелёк" : "Connect your wallet", "err"); return; }
    try {
      const token = await mint(id, ply, setStep);
      setDone({ ply, token });
      toast(ru ? "NFT создан" : "NFT created", "ok");
    } catch (e) { toast(errText(e), "err"); }
    finally { setStep("idle"); }
  };

  return (
    <section className="card space-y-3" style={{ border: "1px solid #d4a017" }}>
      <h3 className="font-bold">🖼 {ru ? "NFT партии" : "Game NFT"}</h3>
      <p className="text-sm opacity-80">
        {ru
          ? "Листайте партию кнопками ◀ ▶ (или нажмите на ошибку в анализе), выберите любой понравившийся ход или итоговую позицию с матом и создайте NFT этой картинки. Один ход партии можно превратить в NFT только один раз."
          : "Step through the game with ◀ ▶ (or tap a mistake in the analysis), pick any move you like or the final checkmate position and create an NFT of that picture. Each move of a game can become an NFT only once."}
      </p>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{ply >= 1 ? (ru ? "Выбран ход " : "Selected move ") + move + " / " + total : (ru ? "Выберите ход партии" : "Pick a move of the game")}</span>
        <button type="button" className="chip" onClick={() => replay.toLive()}>{ru ? "Итоговая позиция" : "Final position"}</button>
      </div>
      {ply >= 1 && taken === true && !done && (
        <p className="text-sm text-amber-500">
          {ru ? "Этот ход уже превращён в NFT. Выберите другой." : "This move is already an NFT. Pick another one."}{" "}
          <a className="underline" href={openSeaCollection()} target="_blank" rel="noreferrer">OpenSea</a>
        </p>
      )}
      {done ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-500">✅ {ru ? "NFT создан" : "NFT created"}{done.token ? " #" + done.token : ""} ({ru ? "ход" : "move"} {done.ply})</p>
          <div className="grid grid-cols-2 gap-2">
            <a className="btn btn-primary text-center" style={GOLD} href={done.token ? openSeaUrl(done.token) : openSeaCollection()} target="_blank" rel="noreferrer">{ru ? "Продать на OpenSea" : "Sell on OpenSea"}</a>
            <button type="button" className="btn btn-ghost" onClick={() => setDone(null)}>{ru ? "Создать ещё" : "Create another"}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary w-full" style={GOLD} disabled={busy || ply < 1 || taken === true} onClick={create}>
          {busy ? stepText || "…" : (ru ? "Создать NFT этого хода за " + fee + " USDC" : "Create NFT of this move for " + fee + " USDC")}
        </button>
      )}
      <p className="text-xs opacity-60">
        {ru
          ? "NFT создают только игроки этой партии, после того как результат записан в блокчейне. Плата идёт на баланс приложения. Картинка и данные хранятся в самом блокчейне Polygon. При перепродаже на OpenSea 5% получает приложение. NFT не обещает прибыли."
          : "Only the players of this game can create NFTs, after the result is recorded on the blockchain. The fee goes to the app balance. The picture and data are stored on the Polygon blockchain. 5% of resales on OpenSea goes to the app. An NFT does not promise profit."}
      </p>
    </section>
  );
}

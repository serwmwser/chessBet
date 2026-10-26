"use client";
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { listMyNfts, MyNft, nftEnabled, openSeaUrl } from "@/lib/nft";
import { useApp } from "@/lib/ctx";

/** Раздел профиля «Мои NFT»: NFT партий, которые лежат в кошельке игрока, и кнопка «Продать на OpenSea». */
export default function MyNfts() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const me = useActiveAccount()?.address;
  const [list, setList] = useState<MyNft[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    if (!me || !nftEnabled) return;
    try { setList(await listMyNfts(me)); setErr(false); } catch { setErr(true); }
  }, [me]);
  useEffect(() => { load(); }, [load]);

  if (!me || !nftEnabled) return null;
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🖼 {ru ? "Мои NFT" : "My NFTs"}</h2>
        <button type="button" onClick={load} className="text-xs underline opacity-70">{ru ? "Обновить" : "Refresh"}</button>
      </div>
      {err && <p className="text-sm text-amber-600 dark:text-amber-300">{ru ? "Не удалось загрузить NFT. Нажмите «Обновить»." : "Could not load NFTs. Press Refresh."}</p>}
      {list === null && !err && <p className="text-sm opacity-60">…</p>}
      {list !== null && list.length === 0 && (
        <p className="text-sm opacity-70">{ru ? "Пока нет NFT. Сыграйте партию на ставку и после неё нажмите «Анализ игры»: там можно создать NFT любого хода." : "No NFTs yet. Play a staked game, then press Game analysis: you can create an NFT of any move there."}</p>
      )}
      {list !== null && list.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {list.map((n) => (
            <div key={n.id} className="rounded-2xl bg-black/5 dark:bg-white/5 p-2 space-y-2">
              {n.image ? <img src={n.image} alt={`NFT #${n.id}`} className="w-full aspect-square rounded-xl object-cover" /> : <div className="w-full aspect-square rounded-xl bg-black/10 dark:bg-white/10 grid place-items-center text-3xl">♟</div>}
              <div className="text-xs">
                <div className="font-bold">NFT #{n.id}</div>
                <div className="opacity-70">{ru ? "Партия" : "Game"} #{n.gameId} · {ru ? "ход" : "move"} {n.ply}/{n.total}{n.san ? ` · ${n.san}` : ""}</div>
              </div>
              <a href={openSeaUrl(n.id)} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full text-sm py-2 text-center block">🌊 {ru ? "Продать на OpenSea" : "Sell on OpenSea"}</a>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] opacity-60">{ru ? "NFT хранится в вашем кошельке. Кнопка открывает его страницу на OpenSea: там нажмите «Sell» и укажите цену. Пока NFT выставлен на продажу, он остаётся в кошельке и здесь виден; после продажи исчезнет из списка." : "The NFT is stored in your wallet. The button opens its OpenSea page: press Sell and set a price. While listed it stays in your wallet and shows here; after a sale it leaves the list."}</p>
    </section>
  );
}

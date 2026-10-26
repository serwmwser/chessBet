"use client";
import Roadmap from "@/components/Roadmap";
import { useApp } from "@/lib/ctx";
import { NFT_ADDRESS, openSeaCollection } from "@/lib/nft";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Публичная страница: дорожная карта приложения и информация об NFT партий. Видна без входа и кошелька. */
export default function RoadmapPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const nft = ru
    ? [
        ["Что это", "NFT партии — это картинка выбранного хода (или итоговой позиции) вашей партии на токены. Картинка и данные хранятся прямо в блокчейне Polygon, а не на нашем сервере."],
        ["Кто может создать", "Только игроки этой партии, после её окончания и записи результата в блокчейн. Можно выбрать любой ход, в том числе из проигранной партии. Один ход партии — один NFT."],
        ["Цена", "Создание стоит 1 USDC, они идут на баланс приложения. Нужен небольшой запас POL на комиссию сети."],
        ["Как создать", "Откройте партию, нажмите «Анализ игры», листайте ходы стрелками, выберите ход и нажмите «Создать NFT»."],
        ["Продажа", "Готовый NFT можно выставить на OpenSea. Приложение получает 5% с каждой перепродажи."],
        ["Важно", "NFT не обещает прибыли, цена не гарантирована, и никто не обязан его покупать."],
      ]
    : [
        ["What it is", "A game NFT is a picture of a chosen move (or the final position) of your game played for tokens. The picture and data are stored on the Polygon blockchain itself, not on our server."],
        ["Who can create", "Only the players of that game, after it has ended and the result is recorded on the blockchain. You can pick any move, including from a lost game. One move of a game is one NFT."],
        ["Price", "Creating costs 1 USDC, which goes to the app balance. You need a small reserve of POL for the network fee."],
        ["How to create", "Open the game, press Game analysis, step through the moves with the arrows, pick a move and press Create NFT."],
        ["Selling", "A finished NFT can be listed on OpenSea. The app receives 5% of every resale."],
        ["Important", "An NFT does not promise profit, its price is not guaranteed and nobody is obliged to buy it."],
      ];
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <a className="text-sm underline" href={BASE + "/"}>← {ru ? "На главную" : "Home"}</a>
      <h1 className="text-2xl font-bold">🗺 {ru ? "Дорожная карта ChessBet" : "ChessBet roadmap"}</h1>
      <p className="text-sm opacity-80">
        {ru ? "Шахматы со ставками в USDC на Polygon, мульт-арена и NFT партий. Здесь наши планы до III квартала 2027 года." : "Chess with USDC stakes on Polygon, a cartoon arena and game NFTs. Here are our plans until Q3 2027."}
      </p>
      <Roadmap open />
      <section className="card space-y-3">
        <h2 className="text-lg font-bold">🖼 {ru ? "NFT партий: как это работает" : "Game NFTs: how it works"}</h2>
        {nft.map(([h, p]) => (
          <div key={h} className="text-sm space-y-0.5">
            <div className="font-semibold">{h}</div>
            <div className="opacity-85">{p}</div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <a className="chip chip-on" href={openSeaCollection()} target="_blank" rel="noreferrer">OpenSea</a>
          <a className="chip" href={"https://polygonscan.com/address/" + NFT_ADDRESS} target="_blank" rel="noreferrer">{ru ? "Контракт на Polygonscan" : "Contract on Polygonscan"}</a>
        </div>
      </section>
      <p className="text-xs opacity-60">18+ · {ru ? "Ставки связаны с риском проигрыша. Играйте ответственно." : "Stakes carry the risk of losing. Play responsibly."}</p>
    </main>
  );
}

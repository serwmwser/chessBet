"use client";
import NftStudio from "@/components/NftStudio";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { openSeaCollection } from "@/lib/nft";

/** Отдельная страница студии NFT со своим адресом /nft/ */
export default function NftPage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const steps = ru
    ? ["Сыграйте партию на токены и дождитесь её окончания.", "Откройте студию и выберите свою партию и нужный ход.", "Подберите фигуру, настроение и фон: получится 960 вариантов на каждый ход.", "Создайте NFT и при желании выставьте его на продажу на OpenSea."]
    : ["Play a staked game and wait until it finishes.", "Open the studio and pick your game and the move you like.", "Choose a piece, a mood and a background: 960 variants for every move.", "Mint the NFT and, if you want, list it for sale on OpenSea."];
  return (
    <PageShell
      title={ru ? "Студия шахматных NFT" : "Chess NFT Studio"}
      intro={ru ? "Превратите лучший ход вашей партии в NFT: половина картинки это позиция на доске, половина это мультяшная фигура, которую вы выбираете сами." : "Turn the best move of your game into an NFT: half of the picture is the board position, half is a cartoon piece you choose yourself."}
    >
      <NftStudio />
      <section className="card space-y-2 text-sm">
        <h2 className="text-lg font-bold">{ru ? "Как это работает" : "How it works"}</h2>
        <ol className="list-decimal ps-5 space-y-1 opacity-85">{steps.map((x) => <li key={x}>{x}</li>)}</ol>
        <ul className="list-disc ps-5 space-y-1 opacity-85">
          <li>{ru ? "Стандарт ERC-721 в сети Polygon, роялти создателю 5% (ERC-2981)." : "ERC-721 standard on the Polygon network, 5% creator royalties (ERC-2981)."}</li>
          <li>{ru ? "Каждый ход партии можно превратить в NFT только один раз." : "Each move of a game can become an NFT only once."}</li>
          <li>{ru ? "Создать NFT можно только из партии, в которой вы играли." : "You can only mint NFTs from games you played yourself."}</li>
        </ul>
        <a className="underline" href={openSeaCollection()} target="_blank" rel="noopener noreferrer">{ru ? "Коллекция на OpenSea" : "View the collection on OpenSea"}</a>
      </section>
    </PageShell>
  );
}

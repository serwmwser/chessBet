/** Видимый текст «О сервисе» на английском: его читают поисковики и люди. Разметка JSON-LD для поисковиков лежит в app/layout.tsx. */
export default function SeoAbout() {
  return (
    <section className="card space-y-3 text-sm" aria-labelledby="about-h">
      <h2 id="about-h" className="text-lg font-bold">About Chess Bet: play chess online for USDC</h2>
      <p className="opacity-80">
        Chess Bet is a web app and Telegram Mini App where you play chess against real opponents for USDC stakes on the Polygon network, or practise against a chess bot for free.
        Both players put in the same stake, a smart contract holds the money, and the winner collects 94% of the pot with one button. A draw or a cancelled game returns every stake in full.
      </p>
      <h3 className="font-bold">A skill-based chess platform</h3>
      <p className="opacity-80">
        Chess Bet is a competitive, skill-based chess platform. Players compete with intellect, strategy and tactics. There are no dice, no cards and no hidden information: every result comes from the moves the players choose. Rules for games with money differ from country to country, and you are responsible for following the rules where you live.
      </p>
      <h3 className="font-bold">How it works</h3>
      <ol className="list-decimal ps-5 space-y-1 opacity-80">
        <li>Sign in with email, Google, Apple, Telegram, a passkey or your own crypto wallet.</li>
        <li>Create a game with a stake and a time control, or join an open game in the lobby.</li>
        <li>Play. Your result depends on your chess skill. The winner claims the prize from the smart contract.</li>
      </ol>
      <h3 className="font-bold">Features</h3>
      <ul className="list-disc ps-5 space-y-1 opacity-80">
        <li>Online chess with stakes in USDC, multiple time controls, private games and invite links</li>
        <li>Free chess against a bot and free games with a friend</li>
        <li>Cartoon animated pieces and an NFT Studio: turn a move from your own game into a collectible NFT</li>
        <li>Telegram Mini App and Telegram notifications when it is your move</li>
        <li>Referral program</li>
      </ul>
      <h3 className="font-bold">FAQ</h3>
      <dl className="space-y-2 opacity-80">
        <div><dt className="font-semibold">Which currency and network?</dt><dd>USDC on the Polygon network. You also need a small amount of POL for network fees.</dd></div>
        <div><dt className="font-semibold">What is the fee?</dt><dd>The app fee is 6% of the pot, so the winner receives 94%. There is no fee on draws or cancelled games.</dd></div>
        <div><dt className="font-semibold">Who holds the stakes?</dt><dd>A smart contract holds the stakes, not the app. Winnings are claimed by the winner.</dd></div>
        <div><dt className="font-semibold">Is it for adults only?</dt><dd>Yes, 18+. Results depend on your skill but winning is not guaranteed. Play responsibly and check the rules in your country.</dd></div>
      </dl>
    </section>
  );
}

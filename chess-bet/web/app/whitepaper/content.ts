// Белые книги на английском (для чтения на сайте и перевода переводчиком браузера):
// 1) приложение Chess Bet / Rook Club, 2) токен TCH. Только проверяемые факты, без обещаний дохода.
export type Section = { h: string; p?: string[]; ul?: string[]; rows?: [string, string, string][]; head?: [string, string, string] };
export type Doc = { id: "app" | "token"; tab: string; title: string; version: string; note: string; sections: Section[] };

export const CONTACT = "chessgrokearn@gmail.com";

export const APP: Doc = {
  id: "app",
  tab: "Chess Bet",
  title: "Chess Bet (Rook Club): Whitepaper",
  version: "Version 0.1 · 8 November 2026 · https://serwmwser.github.io",
  note: "This document describes the project as it works today and what is planned. It is not investment advice and does not promise any income.",
  sections: [
    { h: "1. Summary", p: [
      "Chess Bet is a social platform for chess players and their friends. It combines a social network called Rook Club, free classifieds for the whole world with chat translation, 18+ dating, puzzles, tournaments and online chess where players can put USDC stakes on the Polygon network.",
      "Stakes are held by an open smart contract, not by the website. The winner of a staked game receives 90% of the pot and the fee is 10%.",
    ] },
    { h: "2. The problem", ul: [
      "Chess players who want more than a casual game have few places where the result carries a stake and the money is held by a neutral party.",
      "Communities, classifieds and dating live in separate apps, and cross-border classifieds suffer from language barriers.",
    ] },
    { h: "3. What the platform offers", ul: [
      "Rook Club: a social feed, profiles, messages and voice messages.",
      "Classifieds: the first ad is free, with built-in chat translation between languages.",
      "Dating (18+): profiles and chat.",
      "Chess: free games against a bot or a friend, and games for USDC stakes.",
      "Puzzles and tournaments: free mate-in-1, mate-in-2 and mate-in-3 puzzles with XP, and free hourly arenas with points, badges and cups.",
      "Chess NFTs: a move from your own finished game can become an ERC-721 NFT on Polygon.",
      "Referral programme Eternal Gambit: invite friends with your personal link and receive a share of the fee from their paid games: 10%, 20% once you have 21 friends and 30% from 101 friends. A friend counts after their first paid game; income is not guaranteed.",
      "Languages: the interface is available in English and Russian; more languages are planned.",
    ] },
    { h: "4. How a staked game works", ul: [
      "Sign in or connect a wallet.",
      "Hold USDC and a little POL (for network fees) on the Polygon network.",
      "Create a game with a stake, or join one in the lobby. Both stakes go into the smart contract.",
      "The game server applies the rules of chess and reports the result to the contract.",
      "The winner presses Claim and receives 90% of the pot. A draw or a cancelled game is refunded in full.",
    ] },
    { h: "5. Smart contracts", p: [
      "ChessEscrow (stakes): 0xaf8714656261dc770A41857706FF4b2f495e92e9. GameNFT (chess NFTs): 0xD929546324c0d675C16C8005F2df59D79AEFf87B. Both are on Polygon and their source code is verified on Polygonscan.",
      "The maximum stake is limited by the contract. The contracts have not had a paid third-party audit. Game results are reported to the contract by a server-side oracle key, so players trust the game server to report results honestly.",
    ] },
    { h: "6. Money and fees", ul: [
      "Currency and network: USDC on Polygon; POL pays network fees.",
      "Chess stakes: 10% fee on the pot, the winner gets 90%.",
      "Classifieds: the first ad is free; extra ads 1 USDC per 30 days; renewal 1 USDC; top placement 3 USDC for 7 days.",
      "Chess NFT: 1 USDC plus the network fee; 5% creator royalties where marketplaces honour them.",
      "Signing in, the feed, dating, puzzles, tournaments and free chess are free.",
    ] },
    { h: "7. Safety and fair play", ul: [
      "Age 18+ only. Responsible play information is on the site.",
      "Wallet sign-in: the site never asks for a password and never sees your private keys.",
      "Moderation tools for posts, ads and profiles; blocking and reporting.",
      "Rules of chess are enforced by the game server, including clocks and draw rules.",
    ] },
    { h: "8. Planned features", ul: [
      "Calls between profiles.",
      "The TCH in-app token (see the TCH whitepaper).",
      "More interface languages.",
    ] },
    { h: "9. Risks", ul: [
      "You can lose your stake. Blockchain transactions cannot be undone.",
      "Smart contracts may contain errors; the contracts have not been independently audited.",
      "Results depend on a game server and its oracle key.",
      "Rules for cryptocurrencies and games differ by country; you are responsible for following the laws of yours. The service may be unavailable in some countries.",
      "Play only with money you can afford to lose.",
    ] },
    { h: "10. Contact", p: [CONTACT] },
  ],
};

export const TOKEN: Doc = {
  id: "token",
  tab: "TCH token",
  title: "TCH (ChessTalk Token): Whitepaper",
  version: "Version 0.3 · 8 November 2026 · https://serwmwser.github.io/token/",
  note: "Status: the token was issued on Polygon on 8 November 2026. Rewards for activity are not live yet, and TCH is not listed on any exchange or DEX. This is not an investment offer, advice or a promise of price growth.",
  sections: [
    { h: "1. Purpose", p: [
      "TCH (ChessTalk Token) is an in-app unit of Chess Bet. Members earn it for communication and activity, such as calls between profiles, and spend it on paid options. It is not money and not a share in a company.",
    ] },
    { h: "2. Parameters", ul: [
      "Name and ticker: ChessTalk Token, TCH.",
      "Network and standard: Polygon, ERC-20, 18 decimals.",
      "Total supply: 888,888,888 TCH, created once when the contract is deployed. There is no mint function and no owner of the token, so supply can never increase.",
      "Burning: any holder can destroy their own tokens; part of every payment in TCH is burned.",
      "Contracts on Polygon (issued 8 November 2026): token 0x14818b99E86fD4654Cb55BE57367d1BfaA2b0F82; RewardPool 0xE0A3309E1e36fEfEadF87c25767Ff5380afe35f5; owner lock 0xd4C725c183E25d27D8Aa38e0e7423Ab2b0B08e1C; team lock 0xF37D4f0E3674F206cf0C716c9a871ee95732F1Fa; exchange reserve lock 0x6F3987a2fe5045cF8BE561Dd02De5210bcA78b48. The source code of all contracts is verified on Polygonscan.",
    ] },
    { h: "3. Distribution", head: ["Allocation", "Share", "Tokens (TCH)"], rows: [
      ["Rewards reserve", "58%", "515,555,559"],
      ["DEX liquidity", "1%", "8,888,888"],
      ["Exchange reserve", "4%", "35,555,555"],
      ["App owner", "5%", "44,444,444"],
      ["Team and development", "10%", "88,888,888"],
      ["Treasury", "12%", "106,666,666"],
      ["Early users", "5%", "44,444,444"],
      ["Partners", "5%", "44,444,444"],
      ["Total", "100%", "888,888,888"],
    ], p: [
      "The rounding remainder is added to the rewards reserve.",
      "Locks: the app owner's share has a 6-month lock and then releases linearly over 24 months. The team share locks for 12 months and then releases linearly over 24 months. The exchange reserve is locked for 12 months. These locks are enforced by vesting contracts and cannot be changed after creation.",
      "DEX liquidity: a TCH/USDC pool with 1,000 USDC opens no earlier than 3 months after issue; the liquidity position is locked for 12 months.",
    ] },
    { h: "4. How tokens enter circulation", p: [
      "The rewards reserve is held by the RewardPool smart contract. Tokens leave it only as rewards, claimed by members with a signature from the game server. The contract checks the signature, a one-time number (nonce) and an expiry time, so a signature cannot be used twice.",
      "Release schedule: the reserve opens linearly over 10 years, up to about 51.5 million TCH per year. The contract refuses any payment above the schedule. The owner of the contract can only pause payouts and replace the signing key; there is no function to withdraw the reserve.",
    ], ul: [
      "Calls between profiles: a reward for call time, split 50/50 between the two people. Starting rate: 10 TCH per call hour per pair (may change).",
      "Games, posts, puzzles and invitations: smaller rewards.",
      "Anti-abuse: a minimum call length (60 seconds), daily limits per member and for the whole app, a limit on calls of the same pair, wallet confirmation, account age and blocking of suspicious pairs.",
    ] },
    { h: "5. How the token is used", ul: [
      "Paid options at a discount compared with USDC: boosting an ad, VIP profile, dating extras, more photos.",
      "Tournament entry fees; part of the fee is burned.",
      "Staking: locking TCH for a profile badge, lower fees and higher limits.",
    ] },
    { h: "6. Where value comes from", ul: [
      "Demand: TCH is needed to pay for services inside the app.",
      "Burning: 50% of every payment in TCH is destroyed and the rest returns to the rewards reserve.",
      "Buyback: a fixed share of platform fees is used to buy TCH on the market and half of it is burned.",
      "Limited supply and slow release from the reserve.",
      "The price is set by the market. Growth is not guaranteed or promised.",
    ] },
    { h: "7. What can trade", p: [
      "Only unlocked tokens can trade: the DEX pool, rewards that members have earned and withdrawn, shares unlocked by their schedules, and the exchange reserve after its lock ends. As an estimate, about 112 million TCH (about 12.6% of supply) could be in circulation after one year. This is an estimate, not a guarantee.",
    ] },
    { h: "8. Roadmap", ul: [
      "Stage 1: calls between profiles without tokens.",
      "Stage 2: TCH points on the site: balance, history, limits, anti-abuse.",
      "Stage 3: TCH and RewardPool contracts on Polygon and withdrawals of rewards.",
      "Stage 4: payments in TCH with burning, staking, tournament fees.",
      "Stage 5: a TCH/USDC pool on a DEX (not earlier than 3 months after issue). A centralized exchange is considered about a year later, with a community of 50,000 people.",
      "Dates depend on development and may change.",
    ] },
    { h: "9. Risks", ul: [
      "Crypto assets can lose all their value. Use only money you can afford to lose.",
      "The token contracts have not been audited by a security firm and cannot be changed after issue, so an error may be permanent. An AI-assisted review is described in section 11; it is not a substitute for a professional audit.",
      "Rules for tokens differ by country. Check the rules of your country before buying or trading.",
      "Liquidity may be low and the price may move sharply.",
      "The project may miss its goals for community size and listings.",
      "The app owner holds 5% of supply, locked by the schedule above.",
    ] },
    { h: "10. Referral program (Eternal Gambit for TCH)", p: [
      "TCH uses the same personal link and the same lifetime tie between friends as the Eternal Gambit programme of the app.",
    ], ul: [
      "A friend who joins through your link is tied to your wallet for life.",
      "A friend counts after their first TCH reward.",
      "Your bonus: 10% of every TCH reward your friends earn; 20% once you have 21 counted friends; 30% from 101 counted friends.",
      "The bonus is paid from the rewards reserve on top of the friend's reward; nothing is deducted from the friend.",
      "Bonuses obey the same release schedule and daily limits as other rewards, so they never increase the total release.",
      "Anti-abuse: no bonus for self-referral or linked wallets, and bonuses for rewards cancelled as abuse are cancelled too.",
      "Bonuses are claimed like other rewards. Income is not guaranteed and the terms can change.",
    ] },
    { h: "11. Security review (AI-assisted, not a third-party audit)", p: [
      "The TCH contracts (TCHToken, TCHRewardPool, TCHVesting) were written with Claude Sonnet 5.5 (Anthropic) and independently reviewed by a separate AI reviewer on 8 November 2026. The review found no critical or high-severity issues. Medium and low findings were fixed: a daily payout limit, disabled renounce of ownership, two-step ownership transfer and stricter deploy-script checks. 12 automated tests pass.",
      "This is not a professional audit by a security firm and does not guarantee the absence of errors. The contracts cannot be changed after deployment.",
    ] },
    { h: "12. Contact", p: [CONTACT] },
  ],
};

export const DOCS: Doc[] = [APP, TOKEN];

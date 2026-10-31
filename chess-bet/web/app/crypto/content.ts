// Тексты страницы /crypto/ (английский и русский). Используются и страницей, и разметкой FAQ в layout.tsx.
export const ESCROW_URL = "https://polygonscan.com/address/0xaf8714656261dc770A41857706FF4b2f495e92e9#code";

export type Sec = { h: string; p: string[] };
export type Content = {
  title: string; intro: string; crumb: string; cta: string; practice: string; contract: string; nft: string; terms: string;
  stepsH: string; steps: string[]; secs: Sec[]; faq: [string, string][]; risk: string;
};

export const EN: Content = {
  title: "Crypto Chess Game: Play Chess for USDC on Polygon",
  intro: "Chess Bet is a crypto chess game where two players put USDC on the line and a smart contract on Polygon holds the pot. The winner claims 90%. Stakes are optional, so you can practise for free first.",
  crumb: "Crypto chess",
  cta: "Play chess now",
  practice: "Practise for free",
  contract: "View the smart contract",
  nft: "Chess NFTs",
  terms: "Terms of use",
  stepsH: "How a crypto chess game works",
  steps: [
    "Sign in or connect a wallet.",
    "Get USDC and a little POL for network fees on the Polygon network.",
    "Create a game with a stake, or join one in the lobby. Both stakes go into the smart contract.",
    "Play. The game server applies the rules of chess and records the result.",
    "The winner presses Claim and receives 90% of the pot. A draw or a cancelled game is refunded in full.",
  ],
  secs: [
    { h: "Who holds the money?", p: [
      "The stakes are held by a smart contract on Polygon, not by the website. The source code of the contract is verified and public on Polygonscan, so anyone can read it.",
      "The winner collects the prize from the contract with the Claim button. The website cannot take a stake out of the contract on its own.",
    ] },
    { h: "Fees and limits", p: [
      "The fee is 10% of the pot, so the winner receives 90%. The contract limits the maximum stake. You also pay a small network fee in POL for each blockchain transaction.",
    ] },
    { h: "Why USDC on Polygon?", p: [
      "USDC is a stablecoin pegged to the US dollar, so a stake of 5 USDC stays about 5 dollars during the game. Polygon has fast confirmations and low network fees, which suits short chess games.",
    ] },
    { h: "Chess NFTs from your games", p: [
      "After a game with a stake, the players can turn a move from that game into an NFT on Polygon. NFTs follow the ERC-721 standard and carry 5% creator royalties where marketplaces honour them. An NFT is a collectible and does not promise any profit.",
    ] },
    { h: "Risks, honestly", p: [
      "You can lose your stake. Blockchain transactions cannot be undone, so check amounts and addresses in your wallet before you confirm. Smart contracts may contain errors despite checks. Cryptocurrency prices and rules differ by country, and you are responsible for following the laws of yours.",
      "Chess Bet is for adults (18+) and may be unavailable in some countries. Play only with money you can afford to lose, and take a break if it stops being fun.",
    ] },
  ],
  faq: [
    ["Which cryptocurrency does Chess Bet use?", "Stakes are paid in USDC on the Polygon network. You also need a small amount of POL to pay network fees."],
    ["How do I get USDC on Polygon?", "Buy USDC on an exchange or in your wallet and send it to your wallet address on the Polygon network. Always choose the Polygon network when you withdraw, otherwise the funds may be lost."],
    ["Who decides the winner of a crypto chess game?", "The game server applies the rules of chess and records the result in the smart contract. A draw or a cancelled game is refunded in full."],
    ["How much does the winner receive?", "The winner receives 90% of the pot. The fee is 10% and is taken by the contract when the prize is paid."],
    ["Can I lose more than my stake?", "No. The most you can lose in a game is your stake. In addition, you pay the small network fee for your transactions."],
    ["Can I try it without stakes?", "Yes. Games against a bot and free games with a friend need no stake and no money."],
  ],
  risk: "18+ · Stakes carry the risk of losing. Play responsibly.",
};

export const RU: Content = {
  title: "Крипто шахматы: играйте на USDC в сети Polygon",
  intro: "Chess Bet: крипто шахматы, где двое игроков ставят USDC, а смарт-контракт в сети Polygon хранит банк. Победитель забирает 90%. Ставки по желанию, сначала можно потренироваться бесплатно.",
  crumb: "Крипто шахматы",
  cta: "Играть в шахматы",
  practice: "Потренироваться бесплатно",
  contract: "Смотреть смарт-контракт",
  nft: "Шахматные NFT",
  terms: "Условия использования",
  stepsH: "Как проходит партия на крипту",
  steps: [
    "Войдите или подключите кошелёк.",
    "Получите USDC и немного POL для комиссии сети в сети Polygon.",
    "Создайте партию со ставкой или присоединитесь к чужой в лобби. Обе ставки попадают в смарт-контракт.",
    "Играйте. Игровой сервер применяет правила шахмат и записывает результат.",
    "Победитель нажимает «Забрать» и получает 90% банка. При ничьей или отмене партии ставки возвращаются полностью.",
  ],
  secs: [
    { h: "Кто хранит деньги?", p: [
      "Ставки хранит смарт-контракт в сети Polygon, а не сайт. Исходный код контракта опубликован и подтверждён на Polygonscan, его может прочитать любой желающий.",
      "Выигрыш победитель забирает из контракта кнопкой «Забрать». Сайт сам не может вынуть ставку из контракта.",
    ] },
    { h: "Комиссия и лимиты", p: [
      "Комиссия 10% от банка, победитель получает 90%. Максимальная ставка ограничена контрактом. Кроме того, за каждую транзакцию в блокчейне вы платите небольшую комиссию сети в POL.",
    ] },
    { h: "Почему USDC и Polygon?", p: [
      "USDC это стейблкоин, привязанный к доллару США, поэтому ставка в 5 USDC во время партии остаётся примерно пятью долларами. В Polygon быстрые подтверждения и низкие комиссии, это удобно для коротких шахматных партий.",
    ] },
    { h: "Шахматные NFT из ваших партий", p: [
      "После партии со ставкой игроки могут превратить ход из неё в NFT в сети Polygon. NFT работают по стандарту ERC-721 и несут 5% роялти автору там, где их выплачивают площадки. NFT это коллекционный предмет, он не обещает прибыли.",
    ] },
    { h: "О рисках честно", p: [
      "Ставку можно проиграть. Операции в блокчейне необратимы, поэтому проверяйте суммы и адреса в кошельке перед подтверждением. Смарт-контракты могут содержать ошибки, несмотря на проверки. Правила для криптовалют различаются по странам, и соблюдать законы своей страны должны вы.",
      "Chess Bet только для совершеннолетних (18+) и может быть недоступен в некоторых странах. Играйте только деньгами, которые не жалко потерять, и делайте паузу, если игра перестала радовать.",
    ] },
  ],
  faq: [
    ["Какая криптовалюта используется в Chess Bet?", "Ставки делаются в USDC в сети Polygon. Ещё нужно немного POL для оплаты комиссий сети."],
    ["Как получить USDC в сети Polygon?", "Купите USDC на бирже или в кошельке и отправьте на адрес своего кошелька в сети Polygon. При выводе всегда выбирайте сеть Polygon, иначе деньги можно потерять."],
    ["Кто определяет победителя в крипто шахматах?", "Игровой сервер применяет правила шахмат и записывает результат в смарт-контракт. При ничьей или отмене партии ставки возвращаются полностью."],
    ["Сколько получает победитель?", "Победитель получает 90% банка. Комиссия 10%, её удерживает контракт при выплате выигрыша."],
    ["Можно ли проиграть больше своей ставки?", "Нет. Максимум, что можно проиграть в партии, это ваша ставка. Кроме того, вы платите небольшую комиссию сети за свои транзакции."],
    ["Можно ли попробовать без ставок?", "Да. Партии с ботом и бесплатные партии с другом проходят без ставок и без денег."],
  ],
  risk: "18+ · Ставки связаны с риском проигрыша. Играйте ответственно.",
};

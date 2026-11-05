// Тексты страницы /about/ (английский и русский). Используются и самой страницей, и разметкой в layout.tsx.
// Только проверяемые факты о проекте: никаких выдуманных цифр, отзывов и реквизитов.
export const CONTACT_EMAIL = "chessgrokearn@gmail.com";

export type Content = {
  title: string; intro: string; crumb: string;
  missionH: string; mission: string[];
  howH: string; steps: [string, string][];
  whyH: string; why: string[];
  projectH: string; projectP: string; contactLabel: string; contractLabel: string; contractLink: string;
  cta: string; faq: string; terms: string; crypto: string; age: string;
};

export const EN: Content = {
  title: "About Chess Bet",
  intro: "Chess Bet is a chess platform where skill decides the game. Play for free, or put USDC on the line on the Polygon network, meet other chess and crypto fans in the Rook Club community, and use its international classifieds board with built-in translation.",
  crumb: "About",
  missionH: "Our mission",
  mission: [
    "Chess Bet was built for chess players who want a bit more than a casual game. Chess is a game of pure skill, with no dice and no luck, so a stronger player should be able to back their play with a stake if they choose to.",
    "You can play for free against a bot or a friend, or play for USDC against another player. Stakes are held by a smart contract on Polygon, not by the website, and the winner claims the pot directly to their own wallet.",
  ],
  howH: "How it works",
  steps: [
    ["Connect a wallet", "Sign in with your own crypto wallet. We never ask for a password and never see your keys."],
    ["Choose a game", "Play for free, or open a game with a USDC stake and wait for an opponent to join."],
    ["Play", "Play chess in your browser or in the Telegram Mini App, with clocks, draw offers and a game chat."],
    ["Get your result", "The winner claims 90% of the pot from the contract. A draw or a cancelled game is refunded."],
  ],
  whyH: "Why Chess Bet",
  why: [
    "A game of skill: chess has no hidden information and no chance element.",
    "Stakes are held by an open smart contract on Polygon, verified on Polygonscan.",
    "Free games with a friend by link, with no wallet and no stake.",
    "Chess NFTs: finished games can be saved as collectible NFTs.",
    "International classifieds with chat translation: sell, buy, rent and find work in any country and city.",
    "Daily quests, streaks, badges and free hourly tournaments with cups.",
    "Rook Club: profiles, posts, photos, comments and private messages for chess and crypto fans.",
    "Works on phone and desktop, in the browser and as a Telegram Mini App.",
    "For adults only (18+). Play responsibly and only with money you can afford to lose.",
  ],
  projectH: "Project details",
  projectP: "Chess Bet is an independent project. We keep the service simple and open: the contract that holds stakes is public, and the rules and fees are written in the Terms of use.",
  contactLabel: "Contact",
  contractLabel: "Smart contract",
  contractLink: "View on Polygonscan",
  cta: "Play chess now",
  faq: "FAQ",
  terms: "Terms of use",
  crypto: "Crypto chess for USDC",
  age: "Age 18+ and responsible play",
};

export const RU: Content = {
  title: "О Chess Bet",
  intro: "Chess Bet — шахматная платформа, где результат решает мастерство. Играйте бесплатно или ставьте USDC в сети Polygon и общайтесь с любителями шахмат и крипты в сообществе Rook Club.",
  crumb: "О нас",
  missionH: "Наша миссия",
  mission: [
    "Chess Bet создан для шахматистов, которым нужно чуть больше, чем обычная партия. Шахматы — игра чистого мастерства: в ней нет кубиков и удачи, и сильный игрок вправе подкрепить свою игру ставкой, если захочет.",
    "Можно играть бесплатно с ботом или другом, а можно на USDC против другого игрока. Ставки хранит смарт-контракт в сети Polygon, а не сайт, и победитель забирает банк сразу на свой кошелёк.",
  ],
  howH: "Как это работает",
  steps: [
    ["Подключите кошелёк", "Вход через ваш собственный крипто-кошелёк. Мы не просим пароль и не видим ваши ключи."],
    ["Выберите игру", "Играйте бесплатно или откройте партию со ставкой в USDC и дождитесь соперника."],
    ["Играйте", "Шахматы в браузере или в Telegram Mini App: часы, предложение ничьей, чат партии."],
    ["Получите результат", "Победитель забирает 90% банка из контракта. Ничья или отменённая партия возвращаются."],
  ],
  whyH: "Почему Chess Bet",
  why: [
    "Игра на мастерство: в шахматах нет скрытой информации и случайности.",
    "Ставки хранит открытый смарт-контракт в сети Polygon, он проверен на Polygonscan.",
    "Бесплатные партии с другом по ссылке: без кошелька и без ставки.",
    "Шахматные NFT: законченные партии можно сохранить как коллекционные NFT.",
    "Международная доска объявлений с переводом чата: продавайте, покупайте, сдавайте и ищите работу в любой стране и городе.",
    "Ежедневные задания, серии дней, значки и бесплатные турниры каждый час с кубками.",
    "Rook Club: профили, посты, фото, комментарии и личные сообщения для любителей шахмат и крипты.",
    "Работает на телефоне и компьютере, в браузере и как Telegram Mini App.",
    "Только для совершеннолетних (18+). Играйте ответственно и только теми деньгами, которые не жалко потерять.",
  ],
  projectH: "Сведения о проекте",
  projectP: "Chess Bet — независимый проект. Мы делаем сервис простым и открытым: контракт со ставками публичный, а правила и комиссии написаны в Условиях использования.",
  contactLabel: "Связь",
  contractLabel: "Смарт-контракт",
  contractLink: "Открыть на Polygonscan",
  cta: "Играть в шахматы",
  faq: "Вопросы и ответы",
  terms: "Условия использования",
  crypto: "Крипто шахматы на USDC",
  age: "Возраст 18+ и ответственная игра",
};

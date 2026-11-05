// Тексты страницы /faq/ (английский и русский). Используются и страницей, и разметкой FAQPage в layout.tsx.
export type Group = { h: string; items: [string, string][] };
export type Content = { title: string; intro: string; crumb: string; groups: Group[]; cta: string; chess: string; crypto: string; terms: string; note: string };

export const EN: Content = {
  title: "Chess Bet FAQ: Stakes, Fees, Safety and Fair Play",
  intro: "Short answers to the most common questions about Chess Bet: how USDC stakes work, the fee, payouts, age limits, fair play, chess NFTs and the Rook Club community.",
  crumb: "FAQ",
  cta: "Play chess now",
  chess: "Practise for free",
  crypto: "How crypto chess works",
  terms: "Terms of use",
  note: "18+ · Stakes carry the risk of losing. Play responsibly.",
  groups: [
    { h: "Basics", items: [
      ["What is Chess Bet?", "Chess Bet is an online chess game where you can play against a bot, against a friend by private link, or against other players for USDC stakes on the Polygon network."],
      ["Is it free?", "Opening the site and playing against a bot or a friend is free. Stakes are optional."],
      ["How do I sign in?", "You can connect a crypto wallet or sign in with email or Google. Signing in uses a free signature. No money is spent and no gas is needed. The session lasts about 14 days on the same device."],
      ["Does it work on a phone?", "Yes. It works in the mobile browser, can be added to the home screen and also runs as a Telegram Mini App."],
    ] },
    { h: "Stakes, fees and payouts", items: [
      ["How do stakes work?", "Both players put the same amount of USDC into a smart contract on Polygon. The game server records the result and the winner claims the prize from the contract."],
      ["What is the fee?", "The fee is 10% of the pot, so the winner receives 90%. The contract takes it when the prize is paid."],
      ["What happens on a draw or a cancelled game?", "Stakes are refunded in full on a draw, on a cancellation, and if the result cannot be recorded."],
      ["How do I receive my winnings?", "Press Claim after the game. This is a blockchain transaction, so you need a small amount of POL to pay the network fee."],
      ["Who holds the money?", "A smart contract holds the stakes, not the website. The contract source code is verified and public on Polygonscan."],
      ["Do you ask for my secret phrase or private key?", "Never. Nobody from Chess Bet will ever ask for your secret recovery phrase or private key. Do not share it with anyone, including in messages."],
    ] },
    { h: "Safety, age and the law", items: [
      ["Who can play?", "Only adults: 18 or older, or older if the law in your country requires a higher age."],
      ["Is it legal in my country?", "That depends on your country. You are responsible for checking that playing for money and using cryptocurrency are allowed where you live. The service may be unavailable in some countries."],
      ["Is playing for stakes safe?", "Any stake can be lost. Play only with money you can afford to lose. Smart contracts may contain errors despite checks, and blockchain transactions cannot be undone."],
      ["What about responsible play?", "Set a limit before you start, do not play under the influence or with borrowed money, and take a break if the game stops being fun."],
    ] },
    { h: "Fair play", items: [
      ["What counts as cheating?", "Using a chess engine or other people's help during a game, running several accounts, colluding with an opponent and any attempt to trick the service or the contract."],
      ["What happens to cheaters?", "Accounts can be blocked and access to the service refused. Funds already in the contract stay under the rules of the contract."],
    ] },
    { h: "Chess NFTs", items: [
      ["What is a chess NFT here?", "After a game with a stake, players can turn a move from that game into an ERC-721 NFT on Polygon. You choose a piece style, a mood and a background. Each move can become an NFT only once."],
      ["How much does it cost?", "Creating an NFT costs 1 USDC, plus a small network fee."],
      ["Can I sell it?", "NFTs are standard ERC-721 tokens with 5% creator royalties, so they can be listed on marketplaces such as OpenSea. An NFT is a collectible and does not promise any profit."],
    ] },
    { h: "Classifieds and translation", items: [
      ["What are Chess Bet classifieds?", "A free-to-start international classifieds board in the Rook Club community: for sale, wanted, rent, jobs and services in any country and city, with photos and a seller chat."],
      ["Are ads and chats translated?", "Yes. Ads and chat messages can be translated into your language with one tap, so a buyer and a seller who speak different languages can understand each other. Translation is automatic, available to signed-in users with fair-use limits, and may contain mistakes."],
      ["Is posting an ad free?", "Your first ad is free, plus one more free ad for every invited friend who starts using the site. After that an ad costs 1 USDC for 30 days. Renewal costs 1 USDC and top placement costs 3 USDC for 7 days. You pay by sending USDC on Polygon from your wallet."],
      ["Can I put my phone number or a link in an ad?", "No. Links, phone numbers and contacts are not allowed in ads: use the site chat. This protects buyers and sellers from fraud."],
    ] },
    { h: "Rook Club community", items: [
      ["What is Rook Club?", "Rook Club is the community of Chess Bet for chess, crypto and NFT fans. You get a public profile, posts with photos, a feed, comments, private messages and voice messages."],
      ["Are private messages encrypted?", "No. Messages are stored on the server and are not end-to-end encrypted. Never send your secret phrase, private keys or passwords in a message."],
      ["Can I earn by inviting friends?", "There is a referral programme: you receive a share of the fee from the paid games of friends you invite. Income is not guaranteed and the terms can change. See the terms of use."],
    ] },
  ],
};

export const RU: Content = {
  title: "Вопросы и ответы Chess Bet: ставки, комиссия, безопасность",
  intro: "Короткие ответы на частые вопросы о Chess Bet: как работают ставки в USDC, комиссия, выплаты, возраст, честная игра, шахматные NFT и сообщество Rook Club.",
  crumb: "Вопросы и ответы",
  cta: "Играть в шахматы",
  chess: "Потренироваться бесплатно",
  crypto: "Как работают крипто шахматы",
  terms: "Условия использования",
  note: "18+ · Ставки связаны с риском проигрыша. Играйте ответственно.",
  groups: [
    { h: "Основное", items: [
      ["Что такое Chess Bet?", "Chess Bet это шахматы онлайн: можно играть с ботом, с другом по личной ссылке или с другими игроками на ставки в USDC в сети Polygon."],
      ["Это бесплатно?", "Открыть сайт и играть с ботом или с другом бесплатно. Ставки по желанию."],
      ["Как войти?", "Можно подключить криптокошелёк или войти по почте или через Google. Вход использует бесплатную подпись: деньги не списываются и газ не нужен. Сессия действует около 14 дней на одном устройстве."],
      ["Работает ли на телефоне?", "Да. Работает в мобильном браузере, добавляется на главный экран и запускается как мини-приложение Telegram."],
    ] },
    { h: "Ставки, комиссия и выплаты", items: [
      ["Как работают ставки?", "Оба игрока вносят одинаковую сумму USDC в смарт-контракт в сети Polygon. Игровой сервер записывает результат, победитель забирает выигрыш из контракта."],
      ["Какая комиссия?", "Комиссия 10% от банка, победитель получает 90%. Контракт удерживает её при выплате выигрыша."],
      ["Что при ничьей или отмене партии?", "При ничьей, отмене и невозможности записать результат ставки возвращаются полностью."],
      ["Как получить выигрыш?", "После партии нажмите «Забрать». Это транзакция в блокчейне, поэтому нужен небольшой запас POL на комиссию сети."],
      ["Кто хранит деньги?", "Ставки хранит смарт-контракт, а не сайт. Исходный код контракта опубликован и подтверждён на Polygonscan."],
      ["Просите ли вы секретную фразу или приватный ключ?", "Никогда. Никто из Chess Bet не попросит вашу секретную фразу восстановления или приватный ключ. Никому их не сообщайте, в том числе в сообщениях."],
    ] },
    { h: "Безопасность, возраст и закон", items: [
      ["Кто может играть?", "Только совершеннолетние: 18 лет или старше, а если закон вашей страны требует больший возраст, то он."],
      ["Законно ли это в моей стране?", "Зависит от страны. Вы сами отвечаете за то, что игра на деньги и работа с криптовалютой разрешены там, где вы живёте. В некоторых странах сервис может быть недоступен."],
      ["Безопасно ли играть на ставки?", "Любую ставку можно проиграть. Играйте только деньгами, которые не жалко потерять. Смарт-контракты могут содержать ошибки, несмотря на проверки, а операции в блокчейне необратимы."],
      ["Что с ответственной игрой?", "Заранее определите лимит, не играйте в состоянии опьянения и на заёмные деньги, делайте паузу, если игра перестала радовать."],
    ] },
    { h: "Честная игра", items: [
      ["Что считается жульничеством?", "Помощь шахматного движка или других людей во время партии, несколько аккаунтов, сговор с соперником и любые попытки обмануть сервис или контракт."],
      ["Что бывает за жульничество?", "Аккаунт могут заблокировать, а доступ к сервису ограничить. Средства, уже находящиеся в контракте, остаются по правилам контракта."],
    ] },
    { h: "Шахматные NFT", items: [
      ["Что такое шахматный NFT здесь?", "После партии со ставкой игроки могут превратить ход из неё в NFT стандарта ERC-721 в сети Polygon. Вы выбираете стиль фигуры, настроение и фон. Каждый ход может стать NFT только один раз."],
      ["Сколько это стоит?", "Создание NFT стоит 1 USDC плюс небольшая комиссия сети."],
      ["Можно ли его продать?", "NFT это стандартные токены ERC-721 с 5% роялти автору, их можно выставить на площадках вроде OpenSea. NFT это коллекционный предмет, он не обещает прибыли."],
    ] },
    { h: "Объявления и перевод", items: [
      ["Что такое объявления Chess Bet?", "Международная доска объявлений в сообществе Rook Club с бесплатным стартом: продажа, покупка, аренда, работа и услуги в любой стране и городе, с фото и чатом с продавцом."],
      ["Переводятся ли объявления и чаты?", "Да. Объявления и сообщения в чате можно перевести на ваш язык одним нажатием, чтобы покупатель и продавец с разными языками понимали друг друга. Перевод автоматический, доступен вошедшим пользователям с разумными лимитами и может содержать ошибки."],
      ["Размещение объявления бесплатное?", "Первое объявление бесплатно, плюс ещё одно за каждого приглашённого друга, который начал пользоваться сайтом. Дальше объявление стоит 1 USDC за 30 дней, продление 1 USDC, закрепление вверху 3 USDC за 7 дней. Оплата переводом USDC в сети Polygon из вашего кошелька."],
      ["Можно ли указать в объявлении телефон или ссылку?", "Нет. Ссылки, телефоны и контакты в объявлениях запрещены: общайтесь в чате сайта. Так покупатели и продавцы защищены от мошенничества."],
    ] },
    { h: "Сообщество Rook Club", items: [
      ["Что такое Rook Club?", "Rook Club это сообщество Chess Bet для любителей шахмат, крипты и NFT. У вас есть публичный профиль, посты с фото, лента, комментарии, личные и голосовые сообщения."],
      ["Шифруются ли личные сообщения?", "Нет. Сообщения хранятся на сервере и не имеют сквозного шифрования. Никогда не отправляйте в сообщениях секретную фразу, приватные ключи и пароли."],
      ["Можно ли зарабатывать, приглашая друзей?", "Есть реферальная программа: вы получаете долю комиссии с платных партий приглашённых друзей. Доход не гарантирован, условия могут меняться. Подробности в условиях использования."],
    ] },
  ],
};

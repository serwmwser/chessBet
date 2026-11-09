// Тексты страницы /chess/ (английский и русский). Используются и самой страницей, и разметкой FAQ в layout.tsx.
export type Sec = { h: string; p: string[] };
export type Content = { title: string; intro: string; secs: Sec[]; faq: [string, string][]; cta: string; tg: string; terms: string; crumb: string };

export const EN: Content = {
  title: "Play Chess Online Free: vs Bot or a Friend",
  intro: "Practise on HiMeet without risking a cent. Play against a bot, or send a private link to a friend and play right in your browser. Stakes are optional and never required.",
  crumb: "Play chess free",
  cta: "Play chess now",
  tg: "Open in Telegram",
  terms: "Terms of use",
  secs: [
    { h: "Play chess against a bot", p: [
      "Start a game against the computer straight from the home page. It is the quickest way to warm up before you meet real opponents, test an opening or try a new set of pieces.",
    ] },
    { h: "Play chess with a friend by link", p: [
      "Create a free private game and send the link in any messenger. Your friend opens it in the browser and the game begins. Free games carry no stake and are not written to the blockchain.",
    ] },
    { h: "Chess in Telegram and on your phone", p: [
      "HiMeet also runs as a Telegram Mini App, so you can play from a chat on your phone. The website can be added to your home screen like an app.",
    ] },
    { h: "Cartoon chess pieces", p: [
      "Prefer something lighter than the classic set? Switch to playful cartoon pieces and play with the same rules of chess.",
    ] },
    { h: "Ready for stakes? Only when you want to", p: [
      "When you feel comfortable, you can play for USDC on the Polygon network. The stakes are held by a smart contract, and the winner receives 90% of the pot. A draw or a cancelled game is refunded in full.",
      "Stakes carry the risk of losing them, so play only with money you can afford to lose. The service is for adults (18+) and may be unavailable in some countries.",
    ] },
  ],
  faq: [
    ["Is HiMeet free to play?", "Yes. Games against a bot and free games with a friend need no stake. Playing for USDC is optional."],
    ["Can I play chess with a friend online?", "Yes. Create a free private game and send the link to your friend. They open it in the browser and you can start playing."],
    ["Do I need to install an app?", "No. HiMeet works in your browser, can be added to your home screen, and also runs as a Telegram Mini App."],
    ["What is the difference between a free game and a game with a stake?", "A free game has no money involved and is not recorded on the blockchain. In a game with a stake, both players put USDC into a smart contract on Polygon, and the winner claims 90% of the pot."],
    ["Is playing for stakes safe?", "The stakes are held by a smart contract rather than by the website, but any stake can be lost. Play responsibly, only with money you can afford to lose, and only if it is legal in your country."],
  ],
};

export const RU: Content = {
  title: "Играть в шахматы онлайн бесплатно: с ботом или другом",
  intro: "Тренируйтесь на HiMeet без риска. Играйте с ботом или отправьте другу личную ссылку и играйте прямо в браузере. Ставки по желанию, они никогда не обязательны.",
  crumb: "Шахматы бесплатно",
  cta: "Играть в шахматы",
  tg: "Открыть в Telegram",
  terms: "Условия использования",
  secs: [
    { h: "Шахматы с ботом", p: [
      "Начните партию с компьютером прямо на главной странице. Это самый быстрый способ размяться перед игрой с живыми соперниками, проверить дебют или попробовать новые фигуры.",
    ] },
    { h: "Шахматы с другом по ссылке", p: [
      "Создайте бесплатную личную партию и отправьте ссылку в любом мессенджере. Друг откроет её в браузере, и можно играть. Бесплатные партии без ставки и не записываются в блокчейн.",
    ] },
    { h: "Шахматы в Telegram и на телефоне", p: [
      "HiMeet работает и как мини-приложение Telegram: играйте прямо из чата на телефоне. Сайт можно добавить на главный экран, как обычное приложение.",
    ] },
    { h: "Мультяшные шахматные фигуры", p: [
      "Хочется чего-то повеселее классики? Переключитесь на мультяшные фигуры, правила шахмат остаются теми же.",
    ] },
    { h: "Готовы к ставкам? Только когда захотите", p: [
      "Когда освоитесь, можно играть на USDC в сети Polygon. Ставки хранит смарт-контракт, победитель получает 90% банка. При ничьей или отмене партии ставки возвращаются полностью.",
      "Ставка может быть проиграна, поэтому играйте только деньгами, которые не жалко потерять. Сервис только для совершеннолетних (18+) и может быть недоступен в некоторых странах.",
    ] },
  ],
  faq: [
    ["HiMeet бесплатный?", "Да. Партии с ботом и бесплатные партии с другом проходят без ставок. Игра на USDC необязательна."],
    ["Можно ли играть в шахматы с другом онлайн?", "Да. Создайте бесплатную личную партию и отправьте другу ссылку. Он откроет её в браузере, и вы сможете играть."],
    ["Нужно ли устанавливать приложение?", "Нет. HiMeet работает в браузере, добавляется на главный экран и запускается как мини-приложение Telegram."],
    ["Чем бесплатная партия отличается от партии со ставкой?", "В бесплатной партии нет денег, и она не записывается в блокчейн. В партии со ставкой оба игрока вносят USDC в смарт-контракт в сети Polygon, победитель забирает 90% банка."],
    ["Безопасно ли играть на ставки?", "Ставки хранит смарт-контракт, а не сайт, но любую ставку можно проиграть. Играйте ответственно, только деньгами, которые не жалко потерять, и только если это законно в вашей стране."],
  ],
};

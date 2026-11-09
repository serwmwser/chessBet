// Тексты страницы объявлений /ads/ (RU/EN): заголовки, разделы, шаги, правила безопасности, вопросы и ответы (они же идут в JSON-LD).
export type AdsText = {
  crumb: string; title: string; intro: string; seoTitle: string; seoDesc: string;
  kindsH: string; kinds: Record<"sale" | "buy" | "rent" | "job" | "service", [string, string]>;
  why: { h: string; p: string[] };
  stepsH: string; steps: [string, string][];
  safetyH: string; safety: string[];
  faqH: string; faq: [string, string][];
};

export const RU: AdsText = {
  crumb: "Объявления",
  title: "Международная доска объявлений",
  intro: "Купить и продать, снять и сдать, найти работу и услуги в любой стране и городе. Бесплатные объявления, общение в чате сайта с автоматическим переводом.",
  seoTitle: "Доска объявлений: купить, продать, аренда, работа по странам и городам | HiMeet",
  seoDesc: "Международная доска объявлений Rook Club: продажа, покупка, аренда, работа и услуги в любой стране и городе. Бесплатное размещение, фото, чат с продавцом и перевод сообщений. Без ссылок и телефонов в тексте для вашей безопасности.",
  kindsH: "Разделы",
  kinds: {
    sale: ["Продажа", "Электроника, транспорт, одежда, мебель и всё, что вы хотите продать."],
    buy: ["Куплю", "Расскажите, что ищете, и продавцы напишут вам сами."],
    rent: ["Аренда", "Жильё, техника и транспорт: снять или сдать в нужном городе."],
    job: ["Работа", "Вакансии и резюме: удалённо и в вашем городе."],
    service: ["Услуги", "Ремонт, перевозки, обучение, перевод и другие услуги рядом с вами."],
  },
  why: {
    h: "Почему эта доска объявлений",
    p: [
      "Объявления подаются по странам и городам, поэтому удобно искать и рядом с домом, и за границей: для переезда, путешествий и удалённой работы.",
      "Покупатель и продавец общаются в чате сайта на разных языках: сообщения можно перевести одним нажатием. Телефоны, ссылки и внешние мессенджеры в объявлениях запрещены, это защищает от мошенников.",
      "Доска входит в сообщество Rook Club: у продавца есть профиль, уровень и история на сайте, а при сомнениях можно позвонить в голосовом звонке из профиля.",
    ],
  },
  stepsH: "Как это работает",
  steps: [
    ["Выберите раздел, страну и город", "Откройте нужный раздел и отфильтруйте объявления по месту. Поиск работает по заголовку и описанию."],
    ["Напишите продавцу", "Нажмите «Написать продавцу» в объявлении, чтобы открыть чат. Если вы говорите на разных языках, включите перевод сообщений."],
    ["Подайте своё объявление", "Войдите на сайт, выберите раздел, добавьте заголовок, описание, цену и до 5 фото. Объявление живёт 30 дней, его можно продлить."],
    ["Сделка вне сайта на ваш риск", "Сайт не участвует в расчётах между людьми. Проверяйте товар и человека до оплаты."],
  ],
  safetyH: "Правила и безопасность",
  safety: [
    "Не переводите предоплату незнакомым людям и не сообщайте данные кошелька, seed-фразу и коды. Администрация никогда не просит их.",
    "В объявлениях и описаниях нельзя оставлять телефоны, ссылки и контакты мессенджеров: общайтесь в чате сайта.",
    "Запрещены поддельные, украденные и запрещённые законом товары, обман, спам и реклама сторонних сервисов.",
    "Объявление можно скрыть или удалить в любой момент. Три жалобы скрывают объявление до проверки модератором.",
    "Заметили мошенничество? Нажмите «Пожаловаться» в объявлении и прекратите общение.",
  ],
  faqH: "Частые вопросы",
  faq: [
    ["Размещение объявлений платное?", "Первое объявление бесплатно. За каждого приглашённого друга, который зарегистрировался и начал пользоваться сайтом, даётся ещё одно бесплатное. Сверх этого размещение платное: 1 USDC за объявление на 30 дней, продление 1 USDC, закрепление вверху страницы 3 USDC на неделю. Оплата переводом USDC (сеть Polygon) из вашего кошелька, комиссия сети платится в POL. Объявление живёт 30 дней, активных до 10."],
    ["Как подать объявление?", "Войдите на сайт (подключите кошелёк и подпишите вход), откройте вкладку «Подать объявление», заполните форму и нажмите «Опубликовать»."],
    ["В каких странах и городах работает доска?", "В любых. Страну и город вы указываете сами, а в списке можно фильтровать по месту."],
    ["Как общаться, если мы говорим на разных языках?", "В чате сайта у сообщений есть перевод на ваш язык. Это удобно для покупки и аренды за границей."],
    ["Можно ли указать телефон или Telegram?", "Нет. Контакты и ссылки в объявлениях запрещены, чтобы защитить участников от мошенников. Пишите в чат сайта."],
    ["Как продлить объявление?", "В разделе «Мои объявления» за 7 дней до окончания появится кнопка «Продлить». Продление стоит 1 USDC, объявление продлится ещё на 30 дней."],
    ["Что делать, если меня обманули?", "Прекратите общение и нажмите «Пожаловаться» в объявлении. Сайт не участвует в расчётах между людьми и не гарантирует сделки."],
  ],
};

export const EN: AdsText = {
  crumb: "Classifieds",
  title: "International classifieds",
  intro: "Buy and sell, rent, find a job or services in any country and city. Free ads, chat on the site with automatic translation.",
  seoTitle: "Classifieds: buy, sell, rent, jobs by country and city | HiMeet",
  seoDesc: "International classifieds in Rook Club: for sale, wanted, rent, jobs and services in any country and city. Free posting, photos, chat with the seller and message translation. No links or phone numbers in ads for your safety.",
  kindsH: "Categories",
  kinds: {
    sale: ["For sale", "Electronics, vehicles, clothing, furniture and anything you want to sell."],
    buy: ["Wanted", "Tell us what you are looking for and sellers will contact you."],
    rent: ["Rent", "Housing, equipment and vehicles: rent or let in the city you need."],
    job: ["Jobs", "Vacancies and résumés: remote and in your city."],
    service: ["Services", "Repairs, delivery, lessons, translation and other services near you."],
  },
  why: {
    h: "Why this classifieds board",
    p: [
      "Ads are organised by country and city, so it is easy to search near home and abroad: for moving, travel and remote work.",
      "Buyers and sellers talk in the site chat in different languages: messages can be translated with one tap. Phone numbers, links and external messengers are not allowed in ads, which protects you from scammers.",
      "The board is part of the Rook Club community: sellers have a profile, a level and a history on the site, and if in doubt you can make a voice call from the profile.",
    ],
  },
  stepsH: "How it works",
  steps: [
    ["Pick a category, country and city", "Open a category and filter ads by place. Search works on titles and descriptions."],
    ["Message the seller", "Press Message the seller in an ad to open the chat. If you speak different languages, turn on message translation."],
    ["Post your ad", "Sign in, choose a category, add a title, description, price and up to 5 photos. An ad lives 30 days and can be renewed."],
    ["Deals outside the site are at your own risk", "The site is not a party to payments between people. Check the item and the person before you pay."],
  ],
  safetyH: "Rules and safety",
  safety: [
    "Never prepay strangers and never share wallet details, seed phrases or codes. The team never asks for them.",
    "Phone numbers, links and messenger contacts are not allowed in ads: use the site chat.",
    "Counterfeit, stolen and illegal goods, fraud, spam and advertising of third-party services are banned.",
    "You can hide or delete your ad at any time. Three reports hide an ad until a moderator reviews it.",
    "Noticed a scam? Press Report in the ad and stop talking.",
  ],
  faqH: "FAQ",
  faq: [
    ["Is posting paid?", "Your first ad is free. For every invited friend who signs up and starts using the site you get one more free ad. Beyond that posting is paid: 1 USDC per ad for 30 days, 1 USDC to renew, 3 USDC for a week of top placement. You pay by sending USDC (Polygon network) from your wallet; the network fee is paid in POL. An ad lives 30 days, up to 10 active ads."],
    ["How do I post an ad?", "Sign in (connect your wallet and sign the login), open the Post an ad tab, fill in the form and press Publish."],
    ["Which countries and cities are supported?", "Any. You enter the country and city yourself, and the list can be filtered by place."],
    ["How do we talk if we speak different languages?", "Messages in the site chat have a translation into your language. It is handy for buying and renting abroad."],
    ["Can I add a phone number or Telegram?", "No. Contacts and links in ads are blocked to protect members from scammers. Use the site chat."],
    ["How do I renew an ad?", "In My ads a Renew button appears 7 days before expiry. Renewing costs 1 USDC and extends the ad by another 30 days."],
    ["What if someone scams me?", "Stop talking and press Report in the ad. The site is not a party to payments between people and does not guarantee deals."],
  ],
};

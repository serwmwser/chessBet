// Тексты и цифры страницы /token/ (RU/EN). Токен TCH пока в проекте, не выпущен: страница честно это говорит.
// Распределение: сумма всех долей = TOTAL. Остаток от округления отдан резерву наград.
export const TOTAL = 888_888_888;

export type Slice = { id: string; pct: number; amount: number; en: string; ru: string; noteEn: string; noteRu: string };

export const SLICES: Slice[] = [
  { id: "reserve", pct: 58, amount: 515_555_559, en: "Rewards reserve", ru: "Резерв наград",
    noteEn: "Locked in a contract; paid out gradually for calls and activity.", noteRu: "Заблокирован в контракте; выдаётся постепенно за звонки и активность." },
  { id: "dex", pct: 1, amount: 8_888_888, en: "DEX liquidity", ru: "Ликвидность на DEX",
    noteEn: "Pool with 1 000 USDC, opens no earlier than 3 months after issue; LP locked 12 months.", noteRu: "Пул с 1 000 USDC, открывается не раньше чем через 3 месяца после выпуска; LP заблокирован на 12 месяцев." },
  { id: "cex", pct: 4, amount: 35_555_555, en: "Exchange reserve", ru: "Резерв для биржи",
    noteEn: "Locked 12 months; for a centralized exchange listing and a market maker.", noteRu: "Заблокирован на 12 месяцев; для листинга на централизованной бирже и маркет-мейкера." },
  { id: "owner", pct: 5, amount: 44_444_444, en: "App owner", ru: "Владелец приложения",
    noteEn: "6-month lock, then linear release over 24 months.", noteRu: "Заморозка 6 месяцев, затем линейное открытие 24 месяца." },
  { id: "team", pct: 10, amount: 88_888_888, en: "Team and development", ru: "Команда и разработка",
    noteEn: "Vesting under a contract.", noteRu: "Открывается по графику в контракте." },
  { id: "treasury", pct: 12, amount: 106_666_666, en: "Treasury", ru: "Казна",
    noteEn: "Marketing, development, listings.", noteRu: "Маркетинг, разработка, листинги." },
  { id: "early", pct: 5, amount: 44_444_444, en: "Early users", ru: "Ранние пользователи",
    noteEn: "Rewards for the first members.", noteRu: "Награды первым участникам." },
  { id: "partners", pct: 5, amount: 44_444_444, en: "Partners", ru: "Партнёры",
    noteEn: "Support for partners and listings.", noteRu: "Поддержка партнёров и листингов." },
];

export type Content = {
  title: string; intro: string; crumb: string; status: string;
  factsH: string; facts: [string, string][];
  distH: string; distNote: string;
  earnH: string; earn: string[];
  spendH: string; spend: string[];
  valueH: string; value: string[];
  roadH: string; road: [string, string][];
  risksH: string; risks: string[];
  wp: string; back: string;
};

export const EN: Content = {
  title: "TCH token (ChessTalk Token)",
  intro: "TCH is the planned in-app token of Chess Bet: you earn it for calls and activity, and spend it inside the app.",
  crumb: "Token",
  status: "Status: in development. The token is not issued yet and is not for sale. Nothing here is investment advice or a promise of price growth.",
  factsH: "Key facts",
  facts: [
    ["Name / ticker", "ChessTalk Token / TCH"],
    ["Network", "Polygon (ERC-20), 18 decimals"],
    ["Total supply", "888 888 888 TCH, fixed"],
    ["Mint", "One time at issue; no mint function afterwards"],
    ["Burn", "Part of every payment in TCH is burned forever"],
  ],
  distH: "Distribution",
  distNote: "Only unlocked tokens can be traded. Reserve, exchange reserve, owner, team and liquidity tokens are locked by contracts and released by schedule.",
  earnH: "How to earn TCH",
  earn: [
    "Calls between profiles: reward for call time, split 50/50 between the two people.",
    "Games, posts, puzzles and invitations: smaller rewards.",
    "Anti-abuse: a minimum call length, daily limits, wallet confirmation and checks for suspicious pairs.",
    "Release speed: the reserve opens linearly over 10 years, up to about 51.5 million TCH per year, with a daily limit enforced by the contract.",
    "Invite friends (Eternal Gambit): you get a bonus of 10% of the TCH your friends earn, 20% once you have 21 friends and 30% from 101 friends. The bonus comes from the rewards reserve and is not taken from your friend.",
  ],
  spendH: "How to spend TCH",
  spend: [
    "Paid options: boosting an ad, VIP profile, dating extras, more photos, at a discount compared with USDC.",
    "Tournament entry fees; part of the fee is burned.",
    "Staking: lock TCH for a profile badge, lower fees and higher limits.",
  ],
  valueH: "Where the value comes from",
  value: [
    "Demand: people need TCH to pay for services inside the app.",
    "Burning: 50% of every payment in TCH is destroyed, the rest returns to the rewards reserve.",
    "Buyback: a fixed share of platform fees is used to buy TCH, half is burned.",
    "Limited supply and slow release from the reserve.",
    "The price is set by the market. We do not promise growth.",
  ],
  roadH: "Roadmap",
  road: [
    ["Stage 1", "Calls between profiles without tokens."],
    ["Stage 2", "TCH points on the site: balance, history, limits, anti-abuse."],
    ["Stage 3", "TCH and RewardPool contracts on Polygon, withdrawals."],
    ["Stage 4", "Payments in TCH with burning, staking, tournament fees."],
    ["Stage 5", "TCH/USDC pool on a DEX (not earlier than 3 months after issue). A centralized exchange is considered about a year later, with a community of 50 000 people."],
  ],
  risksH: "Risks",
  risks: [
    "Crypto assets can lose all their value. Play and trade only with money you can afford to lose.",
    "Rules for tokens differ between countries. Check the rules of your country before buying or trading.",
    "The token contracts have not been audited by a security firm and may contain errors. They had an AI-assisted review on 8 November 2026 (see the whitepaper), which is not a guarantee.",
  ],
  wp: "Read the whitepaper",
  back: "Home",
};

export const RU: Content = {
  title: "Токен TCH (ChessTalk Token)",
  intro: "TCH — планируемый внутренний токен Chess Bet: его зарабатывают за звонки и активность и тратят внутри приложения.",
  crumb: "Токен",
  status: "Статус: в разработке. Токен ещё не выпущен и не продаётся. Ничего здесь не является инвестиционным советом или обещанием роста цены.",
  factsH: "Главное",
  facts: [
    ["Название / тикер", "ChessTalk Token / TCH"],
    ["Сеть", "Polygon (ERC-20), 18 знаков"],
    ["Общая эмиссия", "888 888 888 TCH, фиксированная"],
    ["Выпуск", "Один раз при создании; функции mint потом нет"],
    ["Сжигание", "Часть каждой оплаты в TCH сжигается навсегда"],
  ],
  distH: "Распределение",
  distNote: "Торговаться могут только разблокированные токены. Резерв, резерв биржи, доли владельца, команды и ликвидности заблокированы контрактами и открываются по графику.",
  earnH: "Как заработать TCH",
  earn: [
    "Звонки между профилями: награда за время разговора, делится 50/50 между двумя участниками.",
    "Игры, посты, головоломки и приглашения: награды поменьше.",
    "Защита от накрутки: минимальная длительность звонка, дневные лимиты, подтверждение кошелька, проверка подозрительных пар.",
    "Скорость выдачи: резерв открывается линейно 10 лет, примерно до 51,5 млн TCH в год, плюс дневной лимит в контракте.",
    "Приглашайте друзей («Вечный гамбит»): бонус 10% от TCH, которые зарабатывают друзья, 20% с 21 друга и 30% со 101 друга. Бонус берётся из резерва наград и не вычитается у вашего друга.",
  ],
  spendH: "Как потратить TCH",
  spend: [
    "Платные опции: поднятие объявления, VIP-профиль, опции знакомств, больше фото; дешевле, чем за USDC.",
    "Вступительные взносы в турниры; часть взноса сгорает.",
    "Стейкинг: заморозка TCH даёт знак в профиле, скидку на комиссию и повышенные лимиты.",
  ],
  valueH: "Откуда берётся ценность",
  value: [
    "Спрос: TCH нужен, чтобы платить за услуги внутри приложения.",
    "Сжигание: 50% каждой оплаты в TCH уничтожается, остальное возвращается в резерв наград.",
    "Выкуп: фиксированная доля комиссии платформы идёт на выкуп TCH, половина сжигается.",
    "Ограниченная эмиссия и медленная выдача из резерва.",
    "Цену определяет рынок. Рост мы не обещаем.",
  ],
  roadH: "Дорожная карта",
  road: [
    ["Этап 1", "Звонки между профилями без токенов."],
    ["Этап 2", "Очки TCH на сайте: баланс, история, лимиты, защита от накрутки."],
    ["Этап 3", "Контракты TCH и RewardPool на Polygon, вывод наград."],
    ["Этап 4", "Оплата в TCH со сжиганием, стейкинг, взносы в турниры."],
    ["Этап 5", "Пул TCH/USDC на DEX (не раньше чем через 3 месяца после выпуска). Централизованная биржа рассматривается примерно через год при сообществе в 50 000 человек."],
  ],
  risksH: "Риски",
  risks: [
    "Криптоактивы могут полностью обесцениться. Играйте и торгуйте только теми деньгами, которые не жалко потерять.",
    "Правила для токенов отличаются в разных странах. Проверьте правила своей страны до покупки и торговли.",
    "Контракты токена не проходили аудит в специализированной компании и могут содержать ошибки. 8 ноября 2026 года их проверил ИИ (см. белую книгу), это не гарантия.",
  ],
  wp: "Читать белую книгу",
  back: "На главную",
};

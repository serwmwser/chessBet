# TCH (ChessTalk Token): белая книга / Whitepaper

Версия 0.1 · 8 ноября 2026 · Chess Bet (https://chessbet.lol)

Статус: проект в разработке. Токен не выпущен и не продаётся. Документ не является инвестиционным предложением, советом или обещанием дохода.

---

## Русский

### 1. Зачем нужен токен
Chess Bet — соцсеть с объявлениями, знакомствами, шахматами и звонками. TCH (ChessTalk Token) — внутренняя единица приложения: участники получают её за общение и активность и тратят на платные опции. Это не заменитель денег и не доля в компании.

### 2. Параметры
- Название и тикер: ChessTalk Token, TCH
- Сеть и стандарт: Polygon, ERC-20, 18 знаков
- Общая эмиссия: 888 888 888 TCH
- Выпуск: один раз при создании контракта. Функции создания новых токенов (mint) нет. Эмиссия не может быть увеличена.
- Сжигание: любой держатель может уничтожить свои токены; часть платежей в TCH сжигается автоматически.

### 3. Распределение
| Доля | % | Количество TCH | Условия |
|---|---|---|---|
| Резерв наград | 58% | 515 555 559 | Контракт RewardPool, выдача за активность по графику |
| Ликвидность на DEX | 1% | 8 888 888 | Пул TCH/USDC с 1 000 USDC, не раньше чем через 3 месяца после выпуска, LP заблокирован на 12 месяцев |
| Резерв для биржи | 4% | 35 555 555 | Блокировка 12 месяцев; листинг на централизованной бирже и маркет-мейкер |
| Владелец приложения | 5% | 44 444 444 | Заморозка 6 месяцев, затем линейно 24 месяца |
| Команда и разработка | 10% | 88 888 888 | Открывается по графику в контракте |
| Казна | 12% | 106 666 666 | Маркетинг, разработка, листинги |
| Ранние пользователи | 5% | 44 444 444 | Награды первым участникам |
| Партнёры | 5% | 44 444 444 | Поддержка партнёров и листингов |
| Итого | 100% | 888 888 888 | |

Остаток от округления отдан резерву наград.

### 4. Как токены попадают в оборот
Резерв наград лежит в контракте RewardPool. Токены выходят из него только как награды:
- Звонки между профилями: награда за время разговора, делится 50/50 между участниками.
- Игры, посты, головоломки, приглашения: меньшие награды.
- Стартовая ставка: 10 TCH за час звонка на пару (может меняться).
- Лимит выдачи из резерва: не более 40 000 000 TCH в 1-й год; в каждый следующий год лимит вдвое меньше.
- Дневной лимит на одного участника и на всё приложение.
- Защита от накрутки: минимальная длительность звонка (60 секунд), лимит звонков одной пары в сутки, подтверждённый кошелёк, возраст аккаунта, блокировка подозрительных пар с отменой начислений.

Награда сначала записывается на баланс профиля на сайте. Вывод на кошелёк участник делает сам: сервер подписывает начисление, контракт проверяет подпись и переводит токены из резерва.

### 5. Как токен используется
- Оплата платных опций со скидкой к USDC: поднятие объявления, VIP-профиль, опции знакомств, дополнительные фото.
- Вступительные взносы в турниры.
- Стейкинг: заморозка TCH даёт знак в профиле, скидку на комиссию и повышенные лимиты.

### 6. Откуда берётся ценность
1. Спрос: токен нужен, чтобы платить за услуги внутри приложения.
2. Сжигание: 50% каждого платежа в TCH уничтожается, остальное возвращается в резерв наград.
3. Выкуп: фиксированная доля комиссии платформы идёт на покупку TCH на рынке, половина купленного сжигается.
4. Ограниченная эмиссия и медленная выдача из резерва.
Цена определяется рынком. Рост цены не гарантируется и не обещается.

### 7. Что торгуется
Торговаться могут только разблокированные токены: пул DEX, заработанные и выведенные награды, разблокированные доли по графику, резерв для биржи после его открытия. Примерная оценка в обороте через год: около 100 млн TCH (около 11% эмиссии). Это оценка, а не гарантия.

### 8. Дорожная карта
1. Звонки между профилями без токенов.
2. Очки TCH на сайте: баланс, история, лимиты, защита от накрутки.
3. Контракты TCH и RewardPool на Polygon, вывод наград.
4. Оплата в TCH со сжиганием, стейкинг, взносы в турниры.
5. Пул TCH/USDC на DEX (не раньше чем через 3 месяца после выпуска). Централизованная биржа рассматривается примерно через год при сообществе в 50 000 человек.
Сроки зависят от разработки и могут меняться.

### 9. Риски
- Криптоактивы могут полностью обесцениться. Используйте только те средства, которые можете позволить себе потерять.
- Контракты токена не проходили независимый аудит и могут содержать ошибки. После выпуска контракт изменить нельзя.
- Правила для токенов различаются в разных странах. Проверьте правила своей страны до покупки и торговли.
- Ликвидность может быть низкой, цена может сильно колебаться.
- Проект может не достичь планов по сообществу и листингам.
- Владелец приложения получает 5% эмиссии; его доля заблокирована контрактом по графику выше.

### 10. Контакты
chessgrokearn@gmail.com

---

## English

### 1. Purpose
Chess Bet is a social network with classifieds, dating, chess and calls. TCH (ChessTalk Token) is an in-app unit: members earn it for communication and activity and spend it on paid options. It is not money and not a share in a company.

### 2. Parameters
- Name and ticker: ChessTalk Token, TCH
- Network and standard: Polygon, ERC-20, 18 decimals
- Total supply: 888,888,888 TCH, minted once at contract creation. No mint function exists, so supply can never increase.
- Burning: any holder can destroy their tokens; part of payments in TCH is burned automatically.

### 3. Distribution
- Rewards reserve 58% (515,555,559): RewardPool contract, paid out for activity on a schedule
- DEX liquidity 1% (8,888,888): TCH/USDC pool with 1,000 USDC, opens no earlier than 3 months after issue, LP locked 12 months
- Exchange reserve 4% (35,555,555): locked 12 months; for a centralized exchange listing and a market maker
- App owner 5% (44,444,444): 6-month lock, then linear release over 24 months
- Team and development 10% (88,888,888): vesting by contract
- Treasury 12% (106,666,666): marketing, development, listings
- Early users 5% (44,444,444)
- Partners 5% (44,444,444)
The rounding remainder is added to the rewards reserve.

### 4. How tokens enter circulation
Reward tokens leave the reserve only as rewards: call time (split 50/50), games, posts, puzzles and invitations. Starting rate: 10 TCH per call hour per pair (may change). The reserve releases no more than 40,000,000 TCH in year 1, and the limit halves every following year. Daily limits apply per member and for the whole app. Anti-abuse: minimum call length (60 seconds), daily limit per pair, confirmed wallet, account age, blocking of suspicious pairs. Rewards first appear on the profile balance on the site; the member withdraws them to their wallet with a server-signed claim verified by the contract.

### 5. Use
Paid options at a discount compared with USDC, tournament entry fees, staking for a badge, lower fees and higher limits.

### 6. Where value comes from
Demand for in-app payments; 50% of every TCH payment is burned and the rest returns to the reserve; a fixed share of platform fees buys TCH, half of it burned; limited supply with slow release. The price is set by the market and is not guaranteed.

### 7. What trades
Only unlocked tokens trade. Estimated circulation after one year: about 100 million TCH (about 11%). This is an estimate, not a guarantee.

### 8. Roadmap
1. Calls without tokens. 2. TCH points on the site. 3. TCH and RewardPool contracts on Polygon, withdrawals. 4. Payments in TCH with burning, staking, tournament fees. 5. DEX pool (not earlier than 3 months after issue); a centralized exchange is considered about a year later with a community of 50,000. Dates may change.

### 9. Risks
Crypto assets can lose all value. The contracts have not been independently audited and cannot be changed after issue. Rules differ between countries; check yours. Liquidity may be low and prices volatile. The project may miss its community and listing goals. The app owner holds 5% of supply, locked by the schedule above.

### 10. Contact
chessgrokearn@gmail.com

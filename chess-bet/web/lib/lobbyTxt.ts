import { useApp } from "./ctx";

const RU = {
  stdName: "Стандарт",
  bigName: "Крупные",
  vipName: "VIP",
  stdInfo: "Обычные партии со ставкой от 0.5 до 5 USDC. Подходят для первых игр и для тренировки на реальных ставках.",
  bigInfo: (max: string) =>
    `Партии с большой ставкой: от 5.5 до ${max} USDC (шаг 0.5). Бросьте вызов сильному сопернику и выиграйте больше! Получение выигрыша гарантирует смарт-контракт: после победы приз закрепляется за вами, и вы забираете 94% банка кнопкой в любой момент, без посредников. Если партия не завершилась, ставки возвращаются полностью.`,
  vipInfo: (max: string) =>
    `VIP-партии: ставки от 25.5 до 50 USDC (шаг 0.5), далее до ${max} USDC с шагом 25, для уверенных игроков. Выигрыш гарантирует смарт-контракт: после победы приз закрепляется за вами, и вы забираете 94% банка кнопкой в любой момент, без посредников. Если партия не завершилась, ставки возвращаются полностью. Играйте только на те деньги, которые готовы поставить.`,
  switchHint: "Разделы переключаются кнопками выше: выберите «Стандарт», «Крупные» или «VIP», затем ставку ползунком или быстрой кнопкой.",
  quickStd: "Быстрые ставки раздела «Стандарт»: 0.5, 1, 2.5 и 5 USDC.",
  quickBig: (max: string) => `Быстрые ставки раздела «Крупные»: от 5.5 до ${max} USDC. Остальные суммы с шагом 0.5 выбирайте ползунком.`,
  quickVip: (max: string) => `Быстрые ставки раздела VIP: 25.5, 50, 75, 100, 150, 200, 250 и ${max} USDC. Остальные суммы выбирайте ползунком (до 50 шаг 0.5, дальше шаг 25).`,
  signHint: "Кошелёк попросит две подписи подряд. Шаг 1 из 2: разрешите списание USDC игре (деньги ещё не списываются, при следующих играх этот шаг обычно не нужен). Шаг 2 из 2: подтвердите саму ставку, только тогда деньги уйдут в контракт.",
  walletNote: "Красное предупреждение кошелька о «рисках фишинга» появляется для всех новых сайтов, у которых нет собственного проверенного домена. Адрес контракта игры виден в подтверждении, а деньги можно вернуть: отмена своей игры возвращает ставку целиком.",
  stepApprove: "Шаг 1 из 2: подтвердите разрешение в кошельке…",
  stepConfirm: "Шаг 2 из 2: подтвердите ставку в кошельке…",
};

const EN: typeof RU = {
  stdName: "Standard",
  bigName: "High stakes",
  vipName: "VIP",
  stdInfo: "Regular games with a stake from 0.5 to 5 USDC. Good for your first games and for practice with real stakes.",
  bigInfo: (max: string) =>
    `Games with a big stake: from 5.5 to ${max} USDC (step 0.5). Challenge a strong opponent and win more! Receiving your winnings is guaranteed by the smart contract: after a win the prize is locked to you and you collect 94% of the pot with one button at any time, no middlemen. If a game does not finish, the stakes are returned in full.`,
  vipInfo: (max: string) =>
    `VIP games: stakes from 25.5 to 50 USDC (step 0.5), then up to ${max} USDC in steps of 25, for confident players. Your winnings are guaranteed by the smart contract: after a win the prize is locked to you and you collect 94% of the pot with one button at any time, no middlemen. If a game does not finish, the stakes are returned in full. Only play with money you are ready to stake.`,
  switchHint: "Switch sections with the buttons above: pick Standard, High stakes or VIP, then choose a stake with the slider or a quick button.",
  quickStd: "Quick stakes of the Standard section: 0.5, 1, 2.5 and 5 USDC.",
  quickBig: (max: string) => `Quick stakes of the High stakes section: from 5.5 to ${max} USDC. Use the slider for other amounts in steps of 0.5.`,
  quickVip: (max: string) => `Quick stakes of the VIP section: 25.5, 50, 75, 100, 150, 200, 250 and ${max} USDC. Use the slider for other amounts (up to 50 in steps of 0.5, then steps of 25).`,
  signHint: "Your wallet will ask for two signatures in a row. Step 1 of 2: allow the game to use your USDC (no money is taken yet, and later games usually skip this step). Step 2 of 2: confirm the stake itself, only then the money goes into the contract.",
  walletNote: "The red \"phishing risk\" warning in wallets appears for every new site without its own verified domain. The game contract address is shown in the confirmation, and you can get your money back: cancelling your own game returns the stake in full.",
  stepApprove: "Step 1 of 2: confirm the allowance in your wallet…",
  stepConfirm: "Step 2 of 2: confirm the stake in your wallet…",
};

export type LT = typeof RU;
/** Тексты разделов ставок в лобби: русский и английский (остальные языки показывают английский) */
export const useLT = (): LT => (useApp().lang === "ru" ? RU : EN);

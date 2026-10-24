import { useApp } from "./ctx";

type Item = { h: string; p: string };
type Rules = { title: string; items: Item[] };

const RU: Rules = {
  title: "Что подтверждать в кошельке, как забрать выигрыш и про паузы",
  items: [
    { h: "Подтверждение 1: разрешение (шаг 1 из 2)", p: "Кошелёк просит разрешить игре списывать USDC. Деньги на этом шаге не списываются. Разрешение выдаётся сразу на несколько ставок вперёд, поэтому в следующих играх этот шаг обычно пропускается." },
    { h: "Подтверждение 2: ставка (шаг 2 из 2)", p: "Это сама транзакция создания игры или присоединения к ней. Только здесь USDC уходит в смарт-контракт, и нужен небольшой запас POL для комиссии сети. Пока вы не подтвердили этот шаг, игра не создаётся и деньги не списываются." },
    { h: "Подтверждение 3: подпись входа (раз в сутки)", p: "Один раз в сутки кошелёк просит подписать сообщение «ChessBet session». Это не транзакция, она бесплатная и ничего не списывает: так сервер узнаёт, что вы именно этот игрок. Подпись запоминается на 24 часа: всё это время вход в партию, обновление страницы и сохранение профиля не требуют новой подписи. Если запроса не видно, откройте приложение кошелька. Итого в первой игре три подтверждения (разрешение, ставка, подпись), в следующих обычно одно: ставка, а подпись понадобится снова только через сутки." },
    { h: "Как забрать выигрыш", p: "После победы нажмите «Забрать выигрыш» в окне результата или в Профиле, в разделе «Невостребованные выплаты». Это ещё одно подтверждение в кошельке (транзакция, нужен POL). При ничьей, отмене партии или зависшей партии та же кнопка возвращает вашу ставку целиком. Деньги лежат в контракте и не пропадают, забрать их можно позже." },
    { h: "Паузы", p: "У каждого игрока 2 паузы за партию, по 5 минут. Нажать «Пауза» можно только в свой ход и после первого хода в партии. На паузе часы остановлены. Вернувшись, нажмите «Продолжить». Если не вернуться за 5 минут, засчитывается поражение. Сдаться можно и во время паузы." },
    { h: "Первый ход и отмена игры", p: "Игру создаёт игрок, который ходит белыми, и первый ход должен сделать он. Если в течение 72 часов после начала партии ни одного хода не сделано, партия отменяется, а ставки возвращаются обоим без комиссии. Игру, к которой никто не присоединился, создатель может отменить сам кнопкой «Отмена»: ставка вернётся целиком." },
  ],
};

const EN: Rules = {
  title: "What to confirm in your wallet, how to claim winnings, and pauses",
  items: [
    { h: "Confirmation 1: allowance (step 1 of 2)", p: "The wallet asks you to allow the game to spend your USDC. No money is taken at this step. The allowance covers several stakes ahead, so later games usually skip this step." },
    { h: "Confirmation 2: the stake (step 2 of 2)", p: "This is the transaction that creates or joins the game. Only here does USDC go into the smart contract, and you need a small reserve of POL for the network fee. Until you confirm this step, no game is created and no money is taken." },
    { h: "Confirmation 3: sign-in signature (once a day)", p: "Once a day the wallet asks you to sign a \"ChessBet session\" message. It is not a transaction, it is free and takes nothing: it just tells the server you are this player. The signature is remembered for 24 hours: during that time opening a match, refreshing the page and saving your profile do not ask for a new signature. If you see no prompt, open your wallet app. So the first game takes three confirmations (allowance, stake, signature), later ones usually one: the stake, and the signature is needed again only after a day." },
    { h: "How to claim winnings", p: "After a win, press Claim on the result screen or in Profile, under Unclaimed winnings. It is one more wallet confirmation (a transaction, POL needed). After a draw, a cancelled match or a stuck match, the same button returns your stake in full. The money stays in the contract and does not disappear, so you can claim later." },
    { h: "Pauses", p: "Each player has 2 pauses per game, 5 minutes each. You can press Pause only on your own turn and only after the first move of the game. On pause the clocks are stopped. When you are back, press Resume. If you do not come back within 5 minutes, you lose. You can also resign during a pause." },
    { h: "First move and cancelling a game", p: "The player who creates the game plays White and must make the first move. If no move is made within 72 hours of the game starting, the match is cancelled and both stakes are returned with no fee. If nobody has joined your game, you can cancel it yourself with the Cancel button: the stake comes back in full." },
  ],
};

/** Правила: что подтверждать в кошельке, как забрать выигрыш, паузы. Русский и английский (остальные языки показывают английский). */
export const useRT = (): Rules => (useApp().lang === "ru" ? RU : EN);

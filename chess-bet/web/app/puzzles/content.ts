// Тексты страницы шахматных задач /puzzles/ (RU/EN): заголовки, уровни, приёмы, вопросы и ответы (они же идут в JSON-LD).
export type PuzzlesText = {
  crumb: string; title: string; intro: string; seoTitle: string; seoDesc: string;
  why: { h: string; p: string[] };
  levelsH: string; levels: [string, string, string][]; // [название, описание, награда]
  stepsH: string; steps: [string, string][];
  tipsH: string; tips: [string, string][];
  faqH: string; faq: [string, string][];
};

export const RU: PuzzlesText = {
  crumb: "Шахматные задачи",
  title: "Шахматные задачи: мат в 1, 2 и 3 хода",
  intro: "Решайте задачи на мат прямо на сайте: сервер проверяет каждый ход, соперник отвечает сам, а за честное решение вы получаете XP для вашего уровня на сайте. Бесплатно.",
  seoTitle: "Шахматные задачи онлайн: мат в 1, 2 и 3 хода | Chess Bet",
  seoDesc: "Бесплатные шахматные задачи на мат в 1, 2 и 3 хода: проверка ходов, подсказки, XP и уровни в сообществе Rook Club. Тренируйте тактику и видение мата.",
  why: {
    h: "Зачем решать шахматные задачи",
    p: [
      "Задачи на мат — самый быстрый способ научиться видеть тактику: шахи, связки, ловушки для короля. Каждая задача занимает от нескольких секунд до пары минут.",
      "Все позиции проверены перебором: мат в них действительно существует, а в задачах на 2 и 3 хода более короткого мата нет. Ходы проверяет сервер, поэтому подсмотреть решение в коде страницы нельзя.",
    ],
  },
  levelsH: "Три уровня сложности",
  levels: [
    ["Мат в 1 ход", "Найдите единственный ход, после которого у короля соперника нет защиты. Подходит для разминки и для новичков.", "5 XP"],
    ["Мат в 2 хода", "Сначала сильный ход (часто шах), затем после ответа соперника — мат. Мата в 1 ход в позиции нет.", "15 XP"],
    ["Мат в 3 хода", "Серия форсированных ходов. Нужно просчитывать ответы соперника на несколько ходов вперёд.", "30 XP"],
  ],
  stepsH: "Как это работает",
  steps: [
    ["Войдите на сайт", "Задачи привязываются к вашему аккаунту: так сервер проверяет ходы и начисляет XP."],
    ["Выберите уровень", "Начните с мата в 1 ход и переходите выше, когда решаете их без ошибок."],
    ["Ходите на доске", "Перетащите фигуру или нажмите на фигуру и на поле. Верный ход принимается, соперник отвечает автоматически."],
    ["Получите награду", "За каждую задачу XP начисляется один раз. С подсказкой XP нет, после трёх ошибок награда вдвое меньше."],
  ],
  tipsH: "Приёмы, которые стоит знать",
  tips: [
    ["Мат на последней горизонтали", "Ладья или ферзь ставит шах по краю доски, а собственные пешки не дают королю уйти вперёд."],
    ["Мат ферзём под защитой", "Ферзь рядом с королём, прикрытый другой фигурой, часто даёт мат: король не может его съесть."],
    ["«Лесенка»", "Две ладьи (или ферзь и ладья) по очереди ставят шахи, отрезая королю горизонталь за горизонталью."],
    ["Удушающий мат конём", "Конь шахует королю, которого окружили его же фигуры: бежать некуда, а конь ходит через них."],
  ],
  faqH: "Частые вопросы",
  faq: [
    ["Шахматные задачи бесплатные?", "Да. Решать задачи и получать XP можно бесплатно, ставок и оплаты здесь нет."],
    ["Нужно ли входить на сайт?", "Да. Вход нужен, чтобы сервер мог проверять ходы и начислять XP на ваш аккаунт."],
    ["Сколько XP даёт задача?", "5 XP за мат в 1 ход, 15 XP за мат в 2 хода и 30 XP за мат в 3 хода. Награда выдаётся один раз за каждую задачу."],
    ["Что будет, если ошибусь?", "Позиция останется прежней, и вы можете ходить снова. После трёх ошибок награда за эту задачу будет вдвое меньше."],
    ["Как работает подсказка?", "Подсказка показывает, какой фигурой ходить. Задача, решённая с подсказкой, XP не приносит."],
    ["Можно ли решать одну задачу повторно?", "Да, но XP начисляется только за первое решение. Когда новые задачи заканчиваются, сайт показывает уже решённые."],
  ],
};

export const EN: PuzzlesText = {
  crumb: "Chess puzzles",
  title: "Chess puzzles: mate in 1, 2 and 3",
  intro: "Solve checkmate puzzles right on the site: the server checks every move, the opponent replies by itself, and an honest solution earns XP toward your level on the site. Free.",
  seoTitle: "Online Chess Puzzles: Mate in 1, 2 and 3 | Chess Bet",
  seoDesc: "Free chess puzzles — mate in 1, 2 and 3 moves: move checking, hints, XP and levels in the Rook Club community. Train tactics and your eye for checkmate.",
  why: {
    h: "Why solve chess puzzles",
    p: [
      "Checkmate puzzles are the fastest way to learn to see tactics: checks, pins and traps for the king. A puzzle takes from a few seconds to a couple of minutes.",
      "Every position was verified by exhaustive search: the mate really exists, and in mate-in-2 and mate-in-3 puzzles there is no shorter mate. The server checks your moves, so the solution cannot be read from the page code.",
    ],
  },
  levelsH: "Three difficulty levels",
  levels: [
    ["Mate in 1", "Find the one move after which the enemy king has no defence. Good for a warm-up and for beginners.", "5 XP"],
    ["Mate in 2", "A strong first move (often a check), then mate after the opponent's reply. There is no mate in 1 in the position.", "15 XP"],
    ["Mate in 3", "A sequence of forcing moves. You need to calculate the opponent's replies several moves ahead.", "30 XP"],
  ],
  stepsH: "How it works",
  steps: [
    ["Sign in", "Puzzles are tied to your account so the server can check moves and award XP."],
    ["Pick a level", "Start with mate in 1 and move up when you solve them without mistakes."],
    ["Move on the board", "Drag a piece, or tap a piece and then a square. A correct move is accepted and the opponent replies automatically."],
    ["Earn the reward", "XP is awarded once per puzzle. A hint means no XP, and after three mistakes the reward is halved."],
  ],
  tipsH: "Patterns worth knowing",
  tips: [
    ["Back-rank mate", "A rook or queen checks along the edge while the king's own pawns block its way forward."],
    ["Protected queen mate", "A queen next to the king, supported by another piece, often mates: the king cannot capture it."],
    ["The ladder", "Two rooks (or a queen and a rook) give checks in turn, cutting the king off rank by rank."],
    ["Smothered mate", "A knight checks a king surrounded by its own pieces: there is nowhere to run, and the knight jumps over them."],
  ],
  faqH: "FAQ",
  faq: [
    ["Are the chess puzzles free?", "Yes. You can solve puzzles and earn XP for free; there are no stakes or payments here."],
    ["Do I need to sign in?", "Yes. Signing in lets the server check your moves and add XP to your account."],
    ["How much XP does a puzzle give?", "5 XP for mate in 1, 15 XP for mate in 2 and 30 XP for mate in 3. The reward is given once per puzzle."],
    ["What if I make a mistake?", "The position stays the same and you can move again. After three mistakes the reward for that puzzle is halved."],
    ["How does the hint work?", "The hint shows which piece to move. A puzzle solved with a hint gives no XP."],
    ["Can I solve the same puzzle again?", "Yes, but XP is awarded only for the first solution. When unsolved puzzles run out, the site shows ones you have already solved."],
  ],
};

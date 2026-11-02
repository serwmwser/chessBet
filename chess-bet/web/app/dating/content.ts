// Тексты страницы знакомств /dating/ (RU/EN): заголовки, шаги, правила безопасности, вопросы и ответы (они же идут в JSON-LD).
export type DatingText = {
  crumb: string; title: string; intro: string; seoTitle: string; seoDesc: string;
  why: { h: string; p: string[] };
  stepsH: string; steps: [string, string][];
  safetyH: string; safety: string[];
  faqH: string; faq: [string, string][];
};

export const RU: DatingText = {
  crumb: "Знакомства",
  title: "Знакомства для всех",
  intro: "Находите новых людей рядом и по всему миру: анкета с тремя фото, лента с фильтрами, лайки и совпадения. Бесплатно, только для 18+.",
  seoTitle: "Знакомства 18+ для всех — Rook Club | Chess Bet",
  seoDesc: "Бесплатные знакомства для всех в сообществе Rook Club: анкета с 3 фото, фильтры по возрасту и стране, лайки, совпадения и личные сообщения. Только 18+, без ссылок и контактов в анкете.",
  why: {
    h: "Почему знакомства в Rook Club",
    p: [
      "Играть в шахматы не обязательно. Знакомьтесь, общайтесь и находите людей по интересам, а если захочется, сыграйте бесплатную партию и познакомьтесь по ходу игры.",
      "Знакомства встроены в сообщество Rook Club: у каждого участника есть профиль, уровень, значки и ежедневные задания, поэтому видно, что это живой человек, а не пустая анкета.",
    ],
  },
  stepsH: "Как это работает",
  steps: [
    ["Заполните анкету", "Загрузите до трёх своих фото, укажите пол, кого ищете, год рождения, страну и пару слов о себе."],
    ["Листайте ленту", "Фильтруйте по полу, возрасту, стране и уровню игрока. Закрытые аккаунты и заблокированные пользователи в ленте не показываются."],
    ["Ставьте лайки", "Если симпатия взаимна, вы увидите совпадение во вкладке «Совпадения» и сможете написать друг другу."],
    ["Общайтесь на сайте", "Пишите в личные сообщения и предлагайте сыграть бесплатную партию. Контакты в анкете публиковать нельзя."],
  ],
  safetyH: "Правила и безопасность",
  safety: [
    "Знакомства только для совершеннолетних: при создании анкеты нужно подтвердить, что вам есть 18 лет.",
    "Никогда не переводите деньги и не сообщайте данные кошелька, seed-фразу или коды малознакомым людям. Администрация никогда не просит их.",
    "Не переходите по ссылкам от собеседников и не уходите общаться в другие мессенджеры, пока не уверены в человеке.",
    "Используйте только свои фото. Чужие снимки, откровенный контент, оскорбления и реклама приводят к бану.",
    "Что-то не так? Нажмите «Пожаловаться» на анкете или заблокируйте пользователя в личных сообщениях. Жалобы рассматривает модерация.",
  ],
  faqH: "Частые вопросы",
  faq: [
    ["Знакомства платные?", "Нет. Анкета, лента, лайки и сообщения бесплатны. Денег за знакомство сайт не берёт."],
    ["Кто видит мою анкету?", "Другие вошедшие пользователи сайта, подходящие под их фильтры. Возраст показывается числом, год рождения и адрес кошелька не раскрываются."],
    ["Сколько фото можно загрузить?", "До трёх. Их можно менять и удалять в любой момент во вкладке «Моя анкета»."],
    ["Можно ли указать Telegram или телефон?", "Нет. Ссылки и контакты в анкете запрещены, чтобы защитить участников от мошенников. Общайтесь в личных сообщениях сайта."],
    ["Как скрыть или удалить анкету?", "Во вкладке «Моя анкета» снимите галочку показа в ленте или нажмите «Удалить анкету»: анкета и ваши лайки будут удалены."],
    ["Что делать, если меня обманывают?", "Прекратите общение, нажмите «Пожаловаться» и заблокируйте пользователя. Не отправляйте деньги и данные кошелька."],
  ],
};

export const EN: DatingText = {
  crumb: "Dating",
  title: "Dating for everyone",
  intro: "Meet new people near you and around the world: a profile with three photos, a filtered feed, likes and matches. Free, 18+ only.",
  seoTitle: "Dating 18+ for Everyone — Rook Club | Chess Bet",
  seoDesc: "Free dating for everyone in the Rook Club community: a profile with 3 photos, age and country filters, likes, matches and private messages. 18+ only, no links or contacts in profiles.",
  why: {
    h: "Why dating in Rook Club",
    p: [
      "You don't have to play chess. Meet people, chat and find others with shared interests, and if you feel like it, play a free game and get to know each other over the board.",
      "Dating is part of the Rook Club community: every member has a profile, a level, badges and daily quests, so you can tell a real person from an empty profile.",
    ],
  },
  stepsH: "How it works",
  steps: [
    ["Create your profile", "Upload up to three of your own photos, choose your gender, who you are looking for, birth year, country and a few words about you."],
    ["Browse the feed", "Filter by gender, age, country and player level. Hidden profiles and blocked users never appear in the feed."],
    ["Send likes", "If the feeling is mutual you will see a match in the Matches tab and can message each other."],
    ["Chat on the site", "Use private messages and invite each other to a free game. Contacts in profiles are not allowed."],
  ],
  safetyH: "Rules and safety",
  safety: [
    "Dating is for adults only: you must confirm you are 18 or older when creating a profile.",
    "Never send money or share wallet details, seed phrases or codes with people you barely know. The team never asks for them.",
    "Do not follow links from people you chat with, and do not move to other messengers until you trust the person.",
    "Use only your own photos. Stolen photos, explicit content, abuse and advertising lead to a ban.",
    "Something wrong? Press Report on a profile or block the user in messages. Reports are reviewed by moderators.",
  ],
  faqH: "FAQ",
  faq: [
    ["Is dating paid?", "No. The profile, feed, likes and messages are free. The site does not charge for introductions."],
    ["Who can see my profile?", "Other signed-in users who match their filters. Your age is shown as a number; your birth year and wallet address are not revealed."],
    ["How many photos can I upload?", "Up to three. You can change or remove them at any time in the My profile tab."],
    ["Can I add Telegram or a phone number?", "No. Links and contacts in profiles are blocked to protect members from scammers. Use the site's private messages."],
    ["How do I hide or delete my profile?", "In the My profile tab untick the feed option or press Delete profile: your profile and likes are removed."],
    ["What if someone tries to scam me?", "Stop talking, press Report and block the user. Never send money or wallet details."],
  ],
};

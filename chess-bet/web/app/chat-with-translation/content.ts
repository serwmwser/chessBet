// Тексты страницы /chat-with-translation/ (RU/EN); английский идёт в мета-теги и JSON-LD.
import type { SeoText } from "@/components/SeoPage";

export const RU: SeoText = {
  slug: "chat-with-translation",
  crumb: "Чат с переводом",
  ctaHref: "/u/?tab=chat",
  cta: "Открыть чат",
  title: "Чат с переводом сообщений: общайтесь на любом языке бесплатно",
  intro: "Пишите на своём языке, а собеседник читает на своём. В HiMeet любое сообщение переводится в один клик, а голосовые звонки, фото и письма работают бесплатно.",
  seoTitle: "Чат с переводом сообщений онлайн: бесплатный мессенджер | HiMeet",
  seoDesc: "Бесплатный чат с автоматическим переводом: пишите на своём языке, собеседник читает на своём. Личные сообщения, голосовые, фото, PDF, письма и звонки без оплаты.",
  blocks: [
    ["Как работает перевод в чате", [
      "Откройте диалог и напишите сообщение на своём языке. Под сообщением собеседника нажмите «перевести», и текст появится на языке вашего сайта. Кнопка «оригинал» возвращает исходный текст.",
      "Если сообщение уже на вашем языке, HiMeet подскажет об этом. Отдельные приложения-переводчики не нужны: всё происходит прямо в переписке.",
    ]],
    ["Не только текст", [
      "Кроме текста можно отправлять голосовые сообщения, фото и PDF до 5 МБ. Для длинных разговоров и документов подойдёт HiMeet Mail: письма между пользователями сайта.",
      "Голосовые звонки внутри приложения бесплатные.",
    ]],
    ["Безопасность в переписке", [
      "Любого собеседника можно заблокировать, а на сообщение пожаловаться. Сообщения хранятся на сервере и не имеют сквозного шифрования, поэтому не отправляйте пароли и секретную фразу кошелька.",
    ]],
  ],
  featuresH: "Что есть в чате HiMeet",
  features: [
    ["Перевод в один клик", "Нажмите «перевести» под сообщением и читайте на своём языке."],
    ["Голосовые и звонки", "Записывайте голосовые сообщения и звоните друг другу бесплатно."],
    ["Фото и PDF", "Отправляйте картинки и документы до 5 МБ в чате и в письмах."],
    ["Почта HiMeet Mail", "Письма с темой и вложениями между пользователями сайта."],
    ["Поиск по языку", "Находите людей, которые говорят на нужном вам языке."],
    ["Статус «в сети»", "Видно, кто сейчас онлайн, чтобы получить ответ быстрее."],
  ],
  faqH: "Вопросы и ответы",
  faq: [
    ["Чат с переводом бесплатный?", "Да. Регистрация, сообщения, перевод и звонки бесплатные."],
    ["Нужно ли устанавливать приложение?", "Нет, чат работает в браузере. Для Android есть приложение, его можно скачать на странице установки."],
    ["Насколько точен перевод?", "Автоматический перевод хорошо передаёт смысл обычной переписки, но шутки и узкие термины может передать неточно. Оригинал всегда можно показать."],
    ["Шифруются ли сообщения?", "Сообщения хранятся на сервере и не имеют сквозного шифрования. Не отправляйте пароли и секретную фразу кошелька."],
    ["Как найти собеседника на нужном языке?", "Откройте раздел «Люди», выберите язык в фильтре и напишите человеку."],
  ],
};

export const EN: SeoText = {
  slug: "chat-with-translation",
  crumb: "Chat with translation",
  ctaHref: "/u/?tab=chat",
  cta: "Open chat",
  title: "Chat with message translation: talk in any language for free",
  intro: "Write in your own language and your friend reads in theirs. On HiMeet any message is translated in one tap, and voice calls, photos and mail are free.",
  seoTitle: "Chat with Message Translation Online: Free Messenger | HiMeet",
  seoDesc: "A free chat with automatic translation: write in your language, your friend reads in theirs. Direct messages, voice notes, photos, PDFs, mail and calls at no cost.",
  blocks: [
    ["How translation works in the chat", [
      "Open a conversation and write in your own language. Under your friend's message tap Translate and the text appears in your site language. The Original button brings back the source text.",
      "If a message is already in your language, HiMeet tells you so. You do not need a separate translator app: everything happens inside the conversation.",
    ]],
    ["More than text", [
      "Besides text you can send voice messages, photos and PDFs up to 5 MB. For longer talks and documents use HiMeet Mail, letters between users of the site.",
      "Voice calls inside the app are free.",
    ]],
    ["Staying safe", [
      "You can block anyone and report a message. Messages are stored on the server and are not end-to-end encrypted, so never send passwords or your wallet's secret phrase.",
    ]],
  ],
  featuresH: "What the HiMeet chat offers",
  features: [
    ["One-tap translation", "Tap Translate under a message and read it in your language."],
    ["Voice and calls", "Record voice messages and call each other for free."],
    ["Photos and PDFs", "Send pictures and documents up to 5 MB in chat and in mail."],
    ["HiMeet Mail", "Letters with a subject and attachments between users of the site."],
    ["Search by language", "Find people who speak the language you need."],
    ["Online status", "See who is online right now to get a faster reply."],
  ],
  faqH: "Questions and answers",
  faq: [
    ["Is the chat with translation free?", "Yes. Sign-up, messages, translation and calls are free."],
    ["Do I need to install an app?", "No, the chat works in the browser. There is also an Android app you can download from the install page."],
    ["How accurate is the translation?", "Automatic translation conveys the meaning of everyday messages well, but jokes and specialised terms can come out inaccurate. You can always show the original."],
    ["Are messages encrypted?", "Messages are stored on the server and are not end-to-end encrypted. Do not send passwords or your wallet's secret phrase."],
    ["How do I find someone who speaks a certain language?", "Open the People tab, pick a language in the filter and send a message."],
  ],
};

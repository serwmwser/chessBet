// Тексты страницы /find-friends/ (RU/EN); английский идёт в мета-теги и JSON-LD.
import type { SeoText } from "@/components/SeoPage";

export const RU: SeoText = {
  slug: "find-friends",
  crumb: "Найти друзей",
  ctaHref: "/u/?tab=people",
  cta: "Найти друзей",
  title: "Найти друзей по интересам и языку: бесплатная соцсеть с чатом и переводом",
  intro: "Укажите интересы и языки в профиле, найдите людей из разных стран и начните общаться. Чат переводит сообщения, звонки бесплатные.",
  seoTitle: "Найти друзей по интересам онлайн: чат с переводом и звонки | HiMeet",
  seoDesc: "Бесплатная соцсеть для знакомства с людьми из разных стран: выберите интересы и языки, найдите друзей, общайтесь в чате с переводом и звоните бесплатно.",
  blocks: [
    ["Как найти друзей", [
      "Создайте профиль, отметьте интересы (путешествия, музыка, кино, шахматы и другие) и языки, на которых вы общаетесь.",
      "В разделе «Люди» выберите язык, откройте профиль человека, подпишитесь на него или напишите сообщение.",
    ]],
    ["Общение без языкового барьера", [
      "Пишите на своём языке: чат переводит сообщения, поэтому собеседнику не нужно знать ваш язык.",
      "Голосовые звонки внутри приложения бесплатные.",
    ]],
  ],
  featuresH: "Что есть в HiMeet",
  features: [
    ["Интересы в профиле", "Выберите до 8 интересов, чтобы людям было проще найти тему для разговора."],
    ["Поиск по языку", "Отфильтруйте людей по языку и найдите тех, с кем хотите практиковаться."],
    ["Чат с переводом", "Сообщения переводятся на язык читателя прямо в диалоге."],
    ["Лента сообщества", "Публикуйте посты и фото, подписывайтесь и комментируйте."],
  ],
  faqH: "Вопросы и ответы",
  faq: [
    ["Это бесплатно?", "Да. Регистрация, чат и звонки бесплатны."],
    ["Нужен ли крипто-кошелёк?", "Нет. Войти можно по почте или через Google."],
    ["Как найти людей с нужным языком?", "Откройте раздел «Люди» и выберите язык в фильтре."],
    ["Можно ли общаться без общего языка?", "Да. Чат переводит сообщения между языками."],
  ],
};

export const EN: SeoText = {
  slug: "find-friends",
  crumb: "Find friends",
  ctaHref: "/u/?tab=people",
  cta: "Find friends",
  title: "Find friends by interests and language: a free social network with translated chat",
  intro: "Add your interests and languages to your profile, meet people from around the world and start talking. The chat translates messages and calls are free.",
  seoTitle: "Find Friends Online by Interests: Translated Chat and Free Calls | HiMeet",
  seoDesc: "A free social network for meeting people from other countries: pick your interests and languages, find friends, chat with message translation and call for free.",
  blocks: [
    ["How to find friends", [
      "Create a profile, pick your interests (travel, music, movies, chess and more) and the languages you speak.",
      "Open the People tab, choose a language, view a profile, then follow the person or send a message.",
    ]],
    ["Talk without a language barrier", [
      "Write in your own language: the chat translates messages, so your friend does not need to know it.",
      "Voice calls inside the app are free.",
    ]],
  ],
  featuresH: "What you get on HiMeet",
  features: [
    ["Interests on your profile", "Choose up to 8 interests so people can find a topic to talk about."],
    ["Search by language", "Filter people by language and find someone to practise with."],
    ["Translated chat", "Messages are translated into the reader's language right in the conversation."],
    ["Community feed", "Share posts and photos, follow people and comment."],
  ],
  faqH: "Questions and answers",
  faq: [
    ["Is it free?", "Yes. Sign-up, chat and calls are free."],
    ["Do I need a crypto wallet?", "No. You can sign in with email or Google."],
    ["How do I find people who speak a certain language?", "Open the People tab and pick a language in the filter."],
    ["Can I chat without a shared language?", "Yes. The chat translates messages between languages."],
  ],
};

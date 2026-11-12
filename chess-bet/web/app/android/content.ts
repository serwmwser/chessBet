// Тексты страницы /android/ (RU/EN); английский идёт в мета-теги и JSON-LD.
import type { SeoText } from "@/components/SeoPage";

export const RU: SeoText = {
  slug: "android",
  crumb: "Скачать для Android",
  ctaHref: "/downloads/himeet.apk",
  cta: "Скачать HiMeet для Android (APK)",
  title: "HiMeet для Android: скачать приложение (APK)",
  intro: "Бесплатный чат и звонки с переводом сообщений. Скачайте файл, установите, и значок HiMeet появится на экране телефона.",
  seoTitle: "Скачать HiMeet для Android (APK): чат и звонки с переводом | HiMeet",
  seoDesc: "Скачайте приложение HiMeet для Android: бесплатный чат и звонки с переводом сообщений, поиск людей по языку. Установка из APK-файла за минуту.",
  blocks: [
    ["Как установить", [
      "1. Нажмите кнопку «Скачать HiMeet для Android» на этой странице. Файл himeet.apk загрузится в папку «Загрузки».",
      "2. Откройте файл (из уведомления о загрузке или из приложения «Файлы»).",
      "3. Если телефон спросит про установку из неизвестных источников, нажмите «Настройки» и разрешите установку для вашего браузера. Это нужно один раз.",
      "4. Нажмите «Установить», затем «Открыть». Войдите по почте или через Google.",
    ]],
    ["Если браузер предупреждает о файле", [
      "Chrome может написать, что такие файлы бывают опасными. Это стандартное сообщение для любых APK вне магазина приложений. Скачивайте файл только с этого сайта: https://himeet.online.",
    ]],
  ],
  featuresH: "Что даёт приложение",
  features: [
    ["Значок на экране", "HiMeet открывается как обычное приложение, без адресной строки."],
    ["Уведомления", "Звонки и сообщения приходят, даже когда приложение закрыто (включаются в профиле)."],
    ["Чат с переводом", "Пишите на своём языке, собеседник читает на своём."],
    ["Бесплатно", "Сообщения и голосовые звонки бесплатные."],
  ],
  faqH: "Вопросы и ответы",
  faq: [
    ["Это бесплатно?", "Да, приложение и общение в нём бесплатные."],
    ["Почему нет в Google Play?", "Пока приложение распространяется файлом с сайта. Версия для магазина в планах, без обещаний по срокам."],
    ["Как обновлять?", "Приложение открывает сайт HiMeet, поэтому новые функции появляются сами. Скачивать файл заново не нужно."],
    ["А iPhone?", "На iPhone откройте https://himeet.online в Safari, нажмите «Поделиться» и «На экран Домой»."],
  ],
};

export const EN: SeoText = {
  slug: "android",
  crumb: "Download for Android",
  ctaHref: "/downloads/himeet.apk",
  cta: "Download HiMeet for Android (APK)",
  title: "HiMeet for Android: download the app (APK)",
  intro: "Free chat and calls with message translation. Download the file, install it, and the HiMeet icon appears on your phone's home screen.",
  seoTitle: "Download HiMeet for Android (APK): Chat and Calls with Translation | HiMeet",
  seoDesc: "Download the HiMeet app for Android: free chat and calls with message translation, find people by language. Install from an APK file in a minute.",
  blocks: [
    ["How to install", [
      "1. Tap the Download HiMeet for Android button on this page. The himeet.apk file is saved to your Downloads folder.",
      "2. Open the file (from the download notification or the Files app).",
      "3. If your phone asks about installing from unknown sources, tap Settings and allow installation for your browser. You only do this once.",
      "4. Tap Install, then Open. Sign in with your email or Google account.",
    ]],
    ["If your browser warns about the file", [
      "Chrome may say that this type of file can be harmful. It shows this for any APK outside an app store. Download the file only from this site: https://himeet.online.",
    ]],
  ],
  featuresH: "What the app gives you",
  features: [
    ["Home-screen icon", "HiMeet opens like a regular app, without the address bar."],
    ["Notifications", "Calls and messages arrive even when the app is closed (turn them on in your profile)."],
    ["Translated chat", "Write in your language, your friend reads in theirs."],
    ["Free", "Messages and voice calls are free."],
  ],
  faqH: "Questions and answers",
  faq: [
    ["Is it free?", "Yes, the app and chatting in it are free."],
    ["Why is it not on Google Play?", "For now the app is distributed as a file from the website. A store version is planned, with no promised date."],
    ["How do I update it?", "The app opens the HiMeet website, so new features appear on their own. You do not need to download the file again."],
    ["What about iPhone?", "On iPhone open https://himeet.online in Safari, tap Share and then Add to Home Screen."],
  ],
};

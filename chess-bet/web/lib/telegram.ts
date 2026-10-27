// Telegram Mini App: определяем, что сайт открыт внутри Telegram, и собираем ссылки для друзей.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Короткий адрес Mini App вида «имя_бота/play» (без https://t.me/), задаётся в NEXT_PUBLIC_TG_APP */
export const TG_APP = process.env.NEXT_PUBLIC_TG_APP || "";

/** Сайт открыт внутри Telegram: Telegram добавляет в адрес #tgWebAppData=..., признак запоминаем на сессию */
export function inTelegram(): boolean {
  try {
    if (/tgWebApp(Data|Version|Platform)=/.test(location.hash)) { sessionStorage.setItem("cb_tg", "1"); return true; }
    return sessionStorage.getItem("cb_tg") === "1";
  } catch { return false; }
}

/** Ссылка на бесплатную партию внутри Telegram (если задан NEXT_PUBLIC_TG_APP), иначе обычная ссылка */
export function tgRoomLink(id: string): string {
  if (!TG_APP) return `${location.origin}${BASE}/?room=${id}`;
  return `https://t.me/${TG_APP}?startapp=room_${id}`;
}

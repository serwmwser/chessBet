const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const TG_BOT = "chess_betlolbot";
export const TG_APP = process.env.NEXT_PUBLIC_TG_APP || `${TG_BOT}/game`;
export const TG_BOT_URL = `https://t.me/${TG_BOT}/game`;

export function inTelegram(): boolean {
  try {
    if (/tgWebApp(Data|Version|Platform)=/.test(location.hash)) {
      sessionStorage.setItem("cb_tg", "1");
      return true;
    }
    return sessionStorage.getItem("cb_tg") === "1";
  } catch {
    return false;
  }
}

export function tgRoomLink(id: string): string {
  return `https://t.me/${TG_APP}?startapp=room_${id}`;
}

export const siteRoomLink = (id: string) => `${location.origin}${BASE}/?room=${id}`;

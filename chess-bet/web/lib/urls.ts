/** Все адреса страниц сайта в одном месте. Позже, при переезде на хостинг с динамическими страницами,
 *  достаточно поменять profileUrl и postUrl, остальной код трогать не нужно. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const SITE_URL = "https://serwmwser.github.io";

export const ROUTES = {
  home: `${BASE}/`,
  profile: `${BASE}/u/`,
  feed: `${BASE}/feed/`,
  messages: `${BASE}/messages/`,
  nft: `${BASE}/nft/`,
  chess: `${BASE}/chess/`,
  crypto: `${BASE}/crypto/`,
  leaderboard: `${BASE}/leaderboard/`,
  faq: `${BASE}/faq/`,
  ads: `${BASE}/ads/`,
  terms: `${BASE}/terms/`,
  age: `${BASE}/age/`,
  roadmap: `${BASE}/roadmap/`,
  puzzles: `${BASE}/puzzles/`,
  cartoon: `${BASE}/cartoon/`,
  exchange: `${BASE}/language-exchange/`,
  dating: `${BASE}/dating/`,
  about: `${BASE}/about/`,
  tournaments: `${BASE}/tournaments/`,
  token: `${BASE}/token/`,
  join: `${BASE}/join/`,
  whitepaper: `${BASE}/whitepaper/`,
  transparency: `${BASE}/transparency/`,
} as const;

/** Профиль игрока: пока адрес с параметром, потом можно заменить на /u/имя/ */
export const profileUrl = (name: string) => `${BASE}/u/?name=${encodeURIComponent(name)}`;
/** Страница поста: пока адрес с параметром, потом можно заменить на /post/номер/ */
export const postUrl = (id: number | string) => `${BASE}/post/?id=${encodeURIComponent(String(id))}`;
/** Полный адрес со своим доменом (для ссылок вне сайта и для sitemap) */
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith(BASE) && BASE ? path.slice(BASE.length) : path}`;

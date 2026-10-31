// Ссылки «поделиться» для соцсетей и «черновик» для отправки ссылки личным сообщением внутри Rook Club.
export type ShareNet = { name: string; icon: string; href: string };

export function shareNets(url: string, text: string): ShareNet[] {
  const u = encodeURIComponent(url), t = encodeURIComponent(text), both = encodeURIComponent(`${text} ${url}`);
  return [
    { name: "Telegram", icon: "✈️", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: "WhatsApp", icon: "💬", href: `https://wa.me/?text=${both}` },
    { name: "X (Twitter)", icon: "𝕏", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Facebook", icon: "📘", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "VK", icon: "🔵", href: `https://vk.com/share.php?url=${u}&title=${t}` },
    { name: "Reddit", icon: "👽", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { name: "LinkedIn", icon: "💼", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: "Email", icon: "✉️", href: `mailto:?subject=${t}&body=${both}` },
  ];
}

const KEY = "cb_share_draft";

/** Запоминает текст со ссылкой, чтобы вкладка «Чат» подставила его в поле сообщения (в адресной строке ссылка не светится) */
export function setShareDraft(text: string) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ text: text.slice(0, 1000), t: Date.now() })); } catch { /* без хранилища */ }
}

/** Забирает сохранённый текст (один раз, не старше 5 минут) */
export function takeShareDraft(): string {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return "";
    sessionStorage.removeItem(KEY);
    const j = JSON.parse(raw) as { text?: string; t?: number };
    return j.text && j.t && Date.now() - j.t < 300_000 ? String(j.text) : "";
  } catch { return ""; }
}

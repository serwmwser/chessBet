// Ссылки «поделиться» для соцсетей и «черновик» для отправки ссылки личным сообщением внутри Rook Club.
export type ShareNet = { name: string; icon: string; href: string; color: string; glyph: string };

export function shareNets(url: string, text: string): ShareNet[] {
  const u = encodeURIComponent(url), t = encodeURIComponent(text), both = encodeURIComponent(`${text} ${url}`);
  return [
    { name: "Telegram", icon: "✈️", glyph: "✈", color: "#229ED9", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: "WhatsApp", icon: "💬", glyph: "✆", color: "#25D366", href: `https://wa.me/?text=${both}` },
    { name: "X (Twitter)", icon: "𝕏", glyph: "𝕏", color: "#111111", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Facebook", icon: "📘", glyph: "f", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "VK", icon: "🔵", glyph: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${u}&title=${t}` },
    { name: "Reddit", icon: "👽", glyph: "r/", color: "#FF4500", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { name: "LinkedIn", icon: "💼", glyph: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: "Email", icon: "✉️", glyph: "✉", color: "#6B7280", href: `mailto:?subject=${t}&body=${both}` },
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

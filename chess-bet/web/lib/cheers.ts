/** Слова одобрения за удачные ходы игрока (мультяшная вкладка) и озвучка голосом браузера. */
type Move = { san: string; piece?: string; captured?: string; promotion?: string };

const LINES = {
  ru: {
    mate: ["Мат! Блестяще!", "Шах и мат! Вы великолепны!"],
    promo: ["Новая королева! Браво!", "Превращение! Отличный ход!"],
    castle: ["Рокировка! Король в безопасности!", "Отличная рокировка!", "Умно! Король спрятан."],
    check: ["Шах! Так держать!", "Шах! Отличная атака!", "Король в опасности!"],
    capture: ["Отличное взятие!", "Так держать!", "Браво, удачный размен!", "Точный ход!"],
  },
  en: {
    mate: ["Checkmate! Brilliant!", "Mate! You are amazing!"],
    promo: ["A new queen! Bravo!", "Promotion! Great move!"],
    castle: ["Castling! The king is safe!", "Nice castling!", "Smart! The king is tucked away."],
    check: ["Check! Keep it up!", "Check! Great attack!", "The king is in danger!"],
    capture: ["Nice capture!", "Keep it up!", "Bravo, a good trade!", "Spot on!"],
  },
};
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/** Фраза одобрения для хода или null, если ход обычный. Взятие хвалим, только если взяли не дешевле, чем отдали. */
export function cheerFor(m: Move, lang: "ru" | "en"): string | null {
  const L = LINES[lang];
  if (m.san.endsWith("#")) return pick(L.mate);
  if (m.promotion) return pick(L.promo);
  if (m.san.startsWith("O-O")) return pick(L.castle);
  if (m.san.endsWith("+")) return pick(L.check);
  if (m.captured && (VAL[m.captured] ?? 0) >= (VAL[m.piece ?? "p"] ?? 0)) return pick(L.capture);
  return null;
}

/** Озвучка голосом устройства; если подходящего голоса нет, остаётся текст на экране. */
export function speak(text: string, lang: string) {
  try {
    const ss = window.speechSynthesis;
    if (!ss) return;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.05;
    u.pitch = 1.2;
    const v = ss.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    ss.speak(u);
  } catch { /* озвучка необязательна */ }
}

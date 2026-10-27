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
/** Возгласы фигуры, которая берёт другую: у каждой свой характер */
const SHOUT = {
  ru: {
    p: ["Получай!", "Ха, попался!", "Я тебя сделал!"],
    n: ["Иго-го! Попался!", "Скачу и бью!", "Иго-го-го!"],
    b: ["Диагональ моя!", "Получите по диагонали!", "Прости, брат!"],
    r: ["Тарарах!", "Ладья идёт напролом!", "Бум! Моё!"],
    q: ["Королева берёт своё!", "Склонись перед королевой!", "Мой ход, дорогой!"],
    k: ["Ха-ха! Сам справился!", "Король бьёт лично!", "Ай да я!"],
  },
  en: {
    p: ["Take that!", "Ha, caught you!", "Got you!"],
    n: ["Neigh! Gotcha!", "Galloping in!", "Hee-haw, mine!"],
    b: ["The diagonal is mine!", "Diagonal strike!", "Sorry, pal!"],
    r: ["Boom!", "The rook charges in!", "Smash! Mine!"],
    q: ["The queen takes what is hers!", "Bow to the queen!", "My move, darling!"],
    k: ["Ha-ha! Did it myself!", "The king strikes in person!", "Look at me!"],
  },
};
/** Высота голоса фигуры при озвучке: пешка пищит, ладья басит */
export const PITCH: Record<string, number> = { p: 1.7, n: 1.4, b: 1.2, r: 0.7, q: 1.5, k: 0.85 };
/** Восторженный возглас фигуры, которая только что взяла другую */
export function shoutFor(piece: string, lang: "ru" | "en"): string {
  const L = (SHOUT[lang] as Record<string, string[]>)[piece] ?? SHOUT[lang].p;
  return pick(L);
}
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

/* Озвучка голосом устройства. На телефонах голоса грузятся не сразу, а браузер разрешает звук только после касания:
   поэтому кэшируем голоса, «будим» синтез при первом касании и держим ссылку на фразу, чтобы её не съел сборщик мусора. */
let voices: SpeechSynthesisVoice[] = [];
let unlocked = false;
let current: SpeechSynthesisUtterance | null = null;

function loadVoices() {
  try { const v = window.speechSynthesis?.getVoices(); if (v && v.length) voices = v; } catch { /* нет голосов */ }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch { /* старый браузер */ }
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    try {
      loadVoices();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch { /* ничего */ }
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchstart", unlock, true);
}

/** Озвучка голосом устройства; если подходящего голоса нет, остаётся текст на экране. */
export function speak(text: string, lang: string, pitch = 1.2, rate = 1.05) {
  try {
    const ss = window.speechSynthesis;
    if (!ss) return;
    if (!voices.length) loadVoices();
    if (ss.speaking || ss.pending) ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = Math.max(0, Math.min(2, pitch));
    const l = lang.toLowerCase();
    const v = voices.find((x) => x.lang.toLowerCase().replace("_", "-") === l) ?? voices.find((x) => x.lang.toLowerCase().startsWith(l.slice(0, 2)));
    if (v) u.voice = v;
    current = u;
    u.onend = u.onerror = () => { if (current === u) current = null; };
    // небольшая пауза после cancel(): на Android без неё фраза иногда теряется
    setTimeout(() => { try { ss.resume(); ss.speak(u); } catch { /* озвучка необязательна */ } }, 80);
  } catch { /* озвучка необязательна */ }
}

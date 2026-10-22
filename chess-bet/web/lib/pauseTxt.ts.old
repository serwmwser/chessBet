import { useApp } from "./ctx";

const RU = {
  pause: "ПАУЗА", title: "ПАУЗА", by: "Паузу взял:", you: "ВЫ", opp: "Соперник",
  leftPauses: "Осталось пауз:", frozen: "ТАЙМЕР ЗАМОРОЖЕН", toLoss: "ДО АВТОПОРАЖЕНИЯ",
  resume: "▶ ПРОДОЛЖИТЬ ИГРУ", waitOpp: "Продолжить игру может только тот, кто взял паузу",
  ad: "Реклама", go: "ПЕРЕЙТИ",
  trustT: "Защита ставки от форс-мажора",
  trustP: "У каждого игрока есть 2 паузы по 5 минут. Взять можно только в свой ход. Ваш игровой таймер на это время полностью останавливается. Если не вернетесь за 5 минут — засчитается поражение.",
  lostPause: "Не вернулся из паузы за 5 минут",
  err: {
    no_pauses: "Паузы закончились", not_your_turn: "Паузу можно взять только в свой ход", not_started: "Пауза доступна после первого хода",
    already_paused: "Пауза уже идёт", paused: "Игра на паузе", not_pause_owner: "Продолжить может только тот, кто взял паузу", not_paused: "Паузы нет",
  } as Record<string, string>,
};
const EN: typeof RU = {
  pause: "PAUSE", title: "PAUSE", by: "Paused by:", you: "YOU", opp: "Opponent",
  leftPauses: "Pauses left:", frozen: "CLOCK FROZEN", toLoss: "UNTIL AUTO-LOSS",
  resume: "▶ RESUME GAME", waitOpp: "Only the player who took the pause can resume the game",
  ad: "Ad", go: "OPEN",
  trustT: "Stake protection against force majeure",
  trustP: "Each player has 2 pauses of 5 minutes. You can only take one on your own turn. Your game clock stops completely while paused. If you do not return within 5 minutes, you lose the game.",
  lostPause: "Did not return from the pause within 5 minutes",
  err: {
    no_pauses: "No pauses left", not_your_turn: "You can pause only on your own turn", not_started: "Pause is available after the first move",
    already_paused: "A pause is already active", paused: "The game is paused", not_pause_owner: "Only the player who took the pause can resume", not_paused: "No active pause",
  },
};
export type PT = typeof RU;
/** Тексты паузы: русский и английский (остальные языки показывают английский) */
export const usePT = (): PT => (useApp().lang === "ru" ? RU : EN);

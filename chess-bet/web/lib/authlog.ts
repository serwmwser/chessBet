import { useEffect, useState } from "react";

// Журнал шагов входа: показывается на экране входа и помогает понять, где обрывается подпись (кошелёк, возврат на страницу, сервер).
// Хранится в sessionStorage, поэтому виден и после перезагрузки страницы.
const EV = "cb_authlog";
const KEY = "cb_alog";
const hhmmss = () => new Date().toTimeString().slice(0, 8);
let lines: string[] = [];
try { lines = JSON.parse(sessionStorage.getItem(KEY) || "[]") as string[]; } catch { lines = []; }

export function alog(msg: string) {
  lines.push(hhmmss() + " " + msg);
  if (lines.length > 14) lines = lines.slice(-14);
  try { sessionStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* без хранилища */ }
  try { window.dispatchEvent(new Event(EV)); } catch { /* вне браузера */ }
}

if (typeof document !== "undefined") {
  alog("страница загружена");
  document.addEventListener("visibilitychange", () => alog(document.hidden ? "страница ушла в фон" : "страница снова на экране"));
}

export function useAuthLog(): string[] {
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener(EV, on);
    return () => window.removeEventListener(EV, on);
  }, []);
  return lines.slice();
}

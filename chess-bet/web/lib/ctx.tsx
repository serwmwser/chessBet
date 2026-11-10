"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { DICT, detectLang, isRtl, Key, Lang } from "./i18n";

export const BOARDS = {
  emerald: ["#e6efe3", "#4f8a6b"],
  classic: ["#f0d9b5", "#b58863"],
  ocean: ["#dce6f2", "#5b7fa6"],
  violet: ["#ece6f7", "#7b63b0"],
  marble: ["#f1f1ee", "#8e939b"],
  walnut: ["#e8cfa6", "#7a4a2a"],
  ice: ["#eaf6ff", "#7fb4d6"],
  gold: ["#f6e7b4", "#b8892b"],
  rose: ["#fbe3e8", "#c26a82"],
  graphite: ["#d9dbe0", "#5b6270"],
} as const;
export type BoardName = keyof typeof BOARDS;

type Toast = { id: number; msg: string; kind: "ok" | "err" | "info" };
type App = {
  lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string;
  dark: boolean; toggleDark: () => void;
  board: BoardName; setBoard: (b: BoardName) => void;
  agreed: boolean; setAgreed: (v: boolean) => void;
  toast: (msg: string, kind?: Toast["kind"]) => void;
};
const Ctx = createContext<App>(null as unknown as App);
export const useApp = () => useContext(Ctx);

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>("en");
  const [dark, setDark] = useState(false);
  const [board, setBoardS] = useState<BoardName>("emerald");
  const [agreed, setAgreedS] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const l = (ls.get("lang") as Lang) || detectLang();
    setLangS(l in DICT ? l : "en");
    setDark(ls.get("dark") === "1");
    const b = ls.get("board") as BoardName;
    if (b && b in BOARDS) setBoardS(b);
    setAgreedS(ls.get("agreed") === "1");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { document.documentElement.dataset.board = board; }, [board]);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4500);
  }, []);

  const value: App = {
    lang, t: (k) => DICT[lang][k],
    setLang: (l) => { setLangS(l); ls.set("lang", l); },
    dark, toggleDark: () => { setDark(!dark); ls.set("dark", dark ? "0" : "1"); },
    board, setBoard: (b) => { setBoardS(b); ls.set("board", b); },
    agreed, setAgreed: (v) => { setAgreedS(v); ls.set("agreed", v ? "1" : "0"); },
    toast,
  };

  return (
    <ThirdwebProvider>
      <Ctx.Provider value={value}>
        {children}
        <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none" role="status" aria-live="polite">
          {toasts.map((x) => (
            <div key={x.id} className={`glass shadow-soft rounded-2xl px-4 py-2.5 text-sm max-w-md ${x.kind === "err" ? "!border-red-500/50" : x.kind === "ok" ? "!border-emerald-500/50" : ""}`}>
              {x.msg}
            </div>
          ))}
        </div>
      </Ctx.Provider>
    </ThirdwebProvider>
  );
}

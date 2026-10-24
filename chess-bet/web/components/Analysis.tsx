"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { analyzeGame, Analysis, Kind, MoveInfo } from "@/lib/analysis";
import { ReplayBar, useReplay } from "./Replay";

const FORMS: Record<"ru" | "en", Record<Kind, [string, string, string]>> = {
  ru: { blunder: ["грубая ошибка", "грубые ошибки", "грубых ошибок"], mistake: ["ошибка", "ошибки", "ошибок"], inaccuracy: ["неточность", "неточности", "неточностей"] },
  en: { blunder: ["blunder", "blunders", "blunders"], mistake: ["mistake", "mistakes", "mistakes"], inaccuracy: ["inaccuracy", "inaccuracies", "inaccuracies"] },
};
const plural = (n: number, f: [string, string, string]) => {
  const a = n % 100, b = n % 10;
  return a >= 11 && a <= 14 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2];
};
const COLOR: Record<Kind, string> = { blunder: "#ef4444", mistake: "#f59e0b", inaccuracy: "#eab308" };
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const label = (m: MoveInfo) => `${Math.ceil(m.ply / 2)}${m.color === "w" ? "." : "..."} ${m.san}`;
type Rep = ReturnType<typeof useReplay>;

/** Повтор партии и разбор: кто и на каком ходу ошибся; нажмите на ошибку, чтобы увидеть её на доске */
export function AnalysisView({ res, replay, me }: { res: Analysis; replay?: Rep; me?: "w" | "b" }) {
  const { lang, t } = useApp();
  const L = lang === "ru" ? "ru" : "en";
  const ru = L === "ru";
  /** «Белые (вы)» / «Чёрные (вы)» */
  const who = (c: "w" | "b") => (c === "w" ? t("white") : t("black")) + (me === c ? (ru ? " (вы)" : " (you)") : "");
  const count = (c: "w" | "b", k: Kind) => res.moves.filter((m) => m.color === c && m.kind === k).length;
  const key = res.moves.filter((m) => m.kind === "blunder" || m.kind === "mistake").sort((a, b) => b.loss - a.loss).slice(0, 8).sort((a, b) => a.ply - b.ply);
  const summary = (c: "w" | "b") => {
    const parts = (["blunder", "mistake", "inaccuracy"] as Kind[]).map((k) => [count(c, k), FORMS[L][k]] as const).filter((p) => p[0] > 0).map((p) => `${p[0]} ${ru ? plural(p[0], p[1]) : p[0] === 1 ? p[1][0] : p[1][1]}`);
    return parts.length ? parts.join(", ") : ru ? "без заметных ошибок" : "no notable mistakes";
  };
  const loss = (m: MoveInfo) => (m.loss >= 1000 ? (ru ? "решающая потеря" : "decisive") : "−" + (m.loss / 100).toFixed(1));
  const here = replay && replay.cur > 0 ? res.moves[replay.cur - 1] : undefined; // ход, после которого сейчас позиция на доске
  const jump = (ply: number) => {
    replay?.goto(ply);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* прокрутка необязательна */ }
  };
  return (
    <div className="space-y-3 text-sm">
      {replay && (
        <div className="space-y-2">
          <ReplayBar r={replay} />
          <div className="rounded-xl bg-black/5 dark:bg-white/5 px-3 py-2 min-h-[3.25rem]">
            {here ? (
              <>
                <span className="mono font-semibold">{label(here)}</span>{" "}
                <span className="opacity-70">· {who(here.color)}:</span>{" "}
                {here.kind ? (
                  <>
                    <span style={{ color: COLOR[here.kind] }} className="font-semibold">{cap(FORMS[L][here.kind][0])}</span>{" "}
                    <span className="opacity-70">({loss(here)})</span>
                    {here.best && here.best !== here.san && <span className="opacity-80">{ru ? ". Лучше: " : ". Better: "}<span className="mono font-semibold">{here.best}</span></span>}
                  </>
                ) : (
                  <span className="text-emerald-500 font-semibold">{ru ? "ход без ошибок" : "no mistake"}</span>
                )}
              </>
            ) : (
              <span className="opacity-60">{ru ? "Листайте ходы кнопками выше: здесь будет оценка каждого хода." : "Step through the moves above: each move is rated here."}</span>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-1">
        <div><b>{who("w")}:</b> {summary("w")}</div>
        <div><b>{who("b")}:</b> {summary("b")}</div>
      </div>
      {key.length > 0 && (
        <ul className="space-y-1">
          {key.map((m) => {
            const body = (
              <>
                <span className="mono font-semibold">{label(m)}</span>{" "}
                <span className="opacity-70">· {who(m.color)}:</span>{" "}
                <span style={{ color: COLOR[m.kind as Kind] }} className="font-semibold">{cap(FORMS[L][m.kind as Kind][0])}</span>{" "}
                <span className="opacity-70">({loss(m)})</span>
                {m.best && m.best !== m.san && <span className="opacity-80">{ru ? ". Лучше: " : ". Better: "}<span className="mono font-semibold">{m.best}</span></span>}
              </>
            );
            return (
              <li key={m.ply}>
                {replay ? (
                  <button type="button" onClick={() => jump(m.ply)} className={"w-full text-start rounded-xl px-3 py-1.5 " + (replay.cur === m.ply && !replay.isLive ? "bg-emerald-500/20" : "bg-black/5 dark:bg-white/5")}>{body}</button>
                ) : (
                  <div className="rounded-xl bg-black/5 dark:bg-white/5 px-3 py-1.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Анализ партии: запускается кнопкой только после окончания игры, движок работает на вашем устройстве */
export default function AnalysisPanel({ san, replay, me }: { san: string[]; replay?: Rep; me?: "w" | "b" }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [state, setState] = useState<"idle" | "run" | "done" | "fail">("idle");
  const [prog, setProg] = useState(0);
  const [res, setRes] = useState<Analysis | null>(null);
  const cancel = useRef({ stop: false });
  useEffect(() => () => { cancel.current.stop = true; }, []);

  const start = () => {
    const c = { stop: false };
    cancel.current = c;
    setState("run");
    setProg(0);
    analyzeGame(san, (d, tot) => { if (!c.stop) setProg(Math.round((d / tot) * 100)); }, c)
      .then((r) => { if (!c.stop) { setRes(r); setState("done"); } })
      .catch(() => { if (!c.stop) setState("fail"); });
  };

  if (san.length === 0) return null;
  return (
    <section className="space-y-3">
      {state === "idle" && <button className="btn btn-primary w-full" onClick={start}>{ru ? "Повтор и анализ партии" : "Replay and analyse the game"}</button>}
      {state === "run" && (
        <div className="space-y-1">
          <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: prog + "%" }} /></div>
          <div className="text-xs text-center opacity-70">{ru ? "Движок разбирает ходы на вашем устройстве…" : "The engine is checking the moves on your device…"} {prog}%</div>
        </div>
      )}
      {state === "fail" && (
        <div className="space-y-2 text-center text-sm">
          <div>{ru ? "Не удалось запустить анализ." : "Could not start the analysis."}</div>
          <button className="btn btn-primary w-full" onClick={start}>{ru ? "Повторить" : "Retry"}</button>
        </div>
      )}
      {state === "done" && res && <AnalysisView res={res} replay={replay} me={me} />}
    </section>
  );
}

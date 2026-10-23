"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/ctx";
import { analyzeGame, Analysis, Kind, MoveInfo } from "@/lib/analysis";

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

/** Результат разбора: график перевеса по ходам, счётчики ошибок и самые грубые ошибки с лучшим ходом */
export function AnalysisView({ res }: { res: Analysis }) {
  const { lang, t } = useApp();
  const L = lang === "ru" ? "ru" : "en";
  const ru = L === "ru";
  const W = 300, H = 90, M = H / 2, CL = 800;
  const n = res.evals.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (e: number) => M - (Math.max(-CL, Math.min(CL, e)) / CL) * (M - 4);
  const pts = res.evals.map((e, i) => `${x(i).toFixed(1)},${y(e).toFixed(1)}`);
  const area = `M0,${M} L${pts.join(" L")} L${x(n - 1).toFixed(1)},${M} Z`;
  const count = (c: "w" | "b", k: Kind) => res.moves.filter((m) => m.color === c && m.kind === k).length;
  const key = res.moves.filter((m) => m.kind === "blunder" || m.kind === "mistake").sort((a, b) => b.loss - a.loss).slice(0, 8).sort((a, b) => a.ply - b.ply);
  const summary = (c: "w" | "b") => {
    const parts = (["blunder", "mistake", "inaccuracy"] as Kind[]).map((k) => [count(c, k), FORMS[L][k]] as const).filter((p) => p[0] > 0).map((p) => `${p[0]} ${ru ? plural(p[0], p[1]) : p[0] === 1 ? p[1][0] : p[1][1]}`);
    return parts.length ? parts.join(", ") : ru ? "без заметных ошибок" : "no notable mistakes";
  };
  return (
    <div className="space-y-3 text-sm">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-[#1c1c26]" role="img" aria-label={ru ? "График преимущества" : "Advantage graph"}>
        <path d={area} fill="rgba(245,245,245,.85)" />
        <line x1="0" y1={M} x2={W} y2={M} stroke="#10b981" strokeOpacity=".7" strokeWidth="1" />
        <polyline points={pts.join(" ")} fill="none" stroke="#ffffff" strokeWidth="1.2" />
        {res.moves.filter((m) => m.kind).map((m) => (
          <circle key={m.ply} cx={x(m.ply)} cy={y(res.evals[m.ply])} r={m.kind === "blunder" ? 3.4 : m.kind === "mistake" ? 2.8 : 2} fill={COLOR[m.kind as Kind]} stroke="#1c1c26" strokeWidth=".8" />
        ))}
      </svg>
      <div className="text-xs opacity-60 text-center">{ru ? "Выше линии преимущество белых, ниже — чёрных" : "Above the line: White is better, below: Black"}</div>
      <div className="grid gap-1">
        <div><b>{t("white")}:</b> {summary("w")}</div>
        <div><b>{t("black")}:</b> {summary("b")}</div>
      </div>
      {key.length > 0 && (
        <ul className="space-y-1">
          {key.map((m) => (
            <li key={m.ply} className="rounded-xl bg-black/5 dark:bg-white/5 px-3 py-1.5">
              <span className="mono font-semibold">{label(m)}</span>{" "}
              <span style={{ color: COLOR[m.kind as Kind] }} className="font-semibold">{cap(FORMS[L][m.kind as Kind][0])}</span>{" "}
              <span className="opacity-70">({m.loss >= 1000 ? (ru ? "решающая потеря" : "decisive") : "−" + (m.loss / 100).toFixed(1)})</span>
              {m.best && m.best !== m.san && <span className="opacity-80">{ru ? ". Лучше: " : ". Better: "}<span className="mono font-semibold">{m.best}</span></span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Анализ партии: запускается кнопкой только после окончания игры, движок работает на вашем устройстве */
export default function AnalysisPanel({ san }: { san: string[] }) {
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
      {state === "idle" && <button className="btn btn-primary w-full" onClick={start}>{ru ? "Анализ партии" : "Analyse the game"}</button>}
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
      {state === "done" && res && <AnalysisView res={res} />}
    </section>
  );
}

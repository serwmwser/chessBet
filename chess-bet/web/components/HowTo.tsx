"use client";
import { useTx, TxKey } from "@/lib/txt";
import { useRT } from "@/lib/rulesTxt";

const STEPS: TxKey[] = ["how1", "how2", "how3", "how4", "how5", "how6"];

export default function HowTo() {
  const tx = useTx();
  const rt = useRT();
  return (
    <details className="card group" open>
      <summary className="cursor-pointer list-none flex items-center justify-between text-lg font-bold">
        <span>🎓 {tx("howTitle")}</span>
        <span className="opacity-50 transition group-open:rotate-180" aria-hidden>▾</span>
      </summary>
      <ol className="mt-3 space-y-2">
        {STEPS.map((k, i) => (
          <li key={k} className="flex gap-3 items-start text-sm">
            <span className="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-violet text-white text-xs font-bold">{i + 1}</span>
            <span className="opacity-90">{tx(k)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 space-y-3 border-t border-black/10 dark:border-white/10 pt-4">
        <h3 className="font-bold">{rt.title}</h3>
        {rt.items.map((it) => (
          <div key={it.h} className="text-sm space-y-0.5">
            <div className="font-semibold">{it.h}</div>
            <div className="opacity-85">{it.p}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

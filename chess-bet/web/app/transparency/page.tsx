"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPublicClient, http, parseAbi } from "viem";
import { polygon } from "viem/chains";
import PageShell from "@/components/PageShell";
import { useApp } from "@/lib/ctx";
import { ROUTES } from "@/lib/urls";
import { ESCROW_ADDRESS, RPC_URL, USDC_ADDRESS } from "@/lib/config";

const ESCROW = (ESCROW_ADDRESS || "0xaf8714656261dc770A41857706FF4b2f495e92e9") as `0x${string}`;
const SCAN = "https://polygonscan.com/address/";

const ABI = parseAbi([
  "function owner() view returns (address)",
  "function oracle() view returns (address)",
  "function feeRecipient() view returns (address)",
  "function feeBps() view returns (uint16)",
  "function maxBet() view returns (uint256)",
  "function nextGameId() view returns (uint256)",
]);
const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);

type Live = {
  balance: bigint; games: bigint; owner: string; oracle: string; feeRecipient: string; feeBps: number; maxBet: bigint;
};

const usd = (n: bigint) => (Number(n) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TXT = {
  ru: {
    title: "Прозрачность: контракт ставок",
    crumb: "Прозрачность",
    intro: "Все цифры на этой странице читаются прямо из блокчейна Polygon при открытии страницы. Мы ничего не подставляем вручную.",
    live: "Состояние контракта сейчас",
    refresh: "Обновить",
    loading: "Читаем данные из блокчейна…",
    error: "Не удалось прочитать данные из сети. Попробуйте обновить страницу позже или откройте контракт на Polygonscan.",
    rows: [
      ["USDC на контракте (ставки в играх и невыплаченные выигрыши)", "balance"],
      ["Создано партий за всё время", "games"],
      ["Действующий потолок ставки", "maxBet"],
      ["Комиссия проекта с банка", "fee"],
      ["Владелец контракта", "owner"],
      ["Адрес оракула (записывает результат партии)", "oracle"],
      ["Получатель комиссии", "feeRecipient"],
    ] as [string, string][],
    fixedH: "Что зашито в код и не меняется",
    fixed: [
      "Ставка от 0,5 до 500 USDC с шагом 0,5. Выше 500 USDC поставить нельзя ни при каких условиях.",
      "Комиссия не может быть выше 10% банка. Ничья: ставки возвращаются полностью, без комиссии.",
      "Выигрыш и возврат игрок забирает сам кнопкой «Забрать»: деньги идут только на его кошелёк.",
      "Владелец не может вывести ставки игроков: в контракте нет такой функции.",
      "Если результат не записан, через 2 × время партии + 3 дня любой может вернуть обоим игрокам их ставки.",
    ],
    adminH: "Кто что может",
    admin: [
      ["Владелец", "меняет адрес оракула, комиссию (не выше 10%) и потолок ставки (не выше 500 USDC). Не может трогать деньги игроков и менять результат партии."],
      ["Оракул", "записывает победителя партии. Он может указать только одного из двух игроков этой партии или ничью, и не может отправить деньги третьему лицу. Это точка доверия: пока результат партии определяет наш сервер, доверять нужно ему."],
    ] as [string, string][],
    riskH: "Честно о рисках",
    risks: [
      "Контракт не проходил платный аудит. Мы сделали собственный разбор, независимую проверку отдельным ИИ-помощником и 45 автоматических тестов. Это не замена аудиту.",
      "Исходный код контракта опубликован и подтверждён на Polygonscan: любой может прочитать его и сверить с развёрнутым кодом.",
      "Если ключ оракула будет украден, злоумышленник сможет записывать победителей. Поэтому потолок ставки ограничен, а ключ хранится отдельно.",
      "USDC принадлежит компании Circle, которая может блокировать адреса. Заблокированный игрок не сможет получить выплату.",
      "Играйте только теми суммами, потерю которых вы можете себе позволить.",
    ],
    open: "Открыть контракт на Polygonscan",
    openUsdc: "USDC на Polygonscan",
    updated: "Данные получены",
  },
  en: {
    title: "Transparency: betting contract",
    crumb: "Transparency",
    intro: "Every figure on this page is read straight from the Polygon blockchain when the page opens. Nothing is entered by hand.",
    live: "Contract state right now",
    refresh: "Refresh",
    loading: "Reading data from the blockchain…",
    error: "Could not read data from the network. Try again later or open the contract on Polygonscan.",
    rows: [
      ["USDC held by the contract (stakes in games and unclaimed winnings)", "balance"],
      ["Games created in total", "games"],
      ["Current bet cap", "maxBet"],
      ["Project fee on the pot", "fee"],
      ["Contract owner", "owner"],
      ["Oracle address (records game results)", "oracle"],
      ["Fee recipient", "feeRecipient"],
    ] as [string, string][],
    fixedH: "What is fixed in the code",
    fixed: [
      "A bet is 0.5 to 500 USDC in steps of 0.5. Nobody can set a bet above 500 USDC.",
      "The fee cannot exceed 10% of the pot. A draw returns both stakes in full with no fee.",
      "Winners and refunds are collected by the player with the Claim button, and the money goes only to that player's wallet.",
      "The owner cannot withdraw players' stakes: the contract has no such function.",
      "If no result is recorded, after 2 × the game time + 3 days anyone can return both stakes to the players.",
    ],
    adminH: "Who can do what",
    admin: [
      ["Owner", "changes the oracle address, the fee (up to 10%) and the bet cap (up to 500 USDC). Cannot touch players' money or change a game result."],
      ["Oracle", "records the winner of a game. It can only name one of the two players of that game, or a draw, and cannot send money to a third party. This is a trust point: while our server decides game results, you trust that server."],
    ] as [string, string][],
    riskH: "Honest risks",
    risks: [
      "The contract has not had a paid audit. We did our own review, an independent review by a separate AI assistant, and 45 automated tests. This is not a substitute for an audit.",
      "The contract source code is published and verified on Polygonscan, so anyone can read it and compare it with the deployed code.",
      "If the oracle key were stolen, an attacker could record winners. That is why the bet cap is limited and the key is stored separately.",
      "USDC belongs to Circle, which can block addresses. A blocked player cannot receive a payout.",
      "Only play with amounts you can afford to lose.",
    ],
    open: "Open the contract on Polygonscan",
    openUsdc: "USDC on Polygonscan",
    updated: "Data fetched",
  },
};

export default function TransparencyPage() {
  const { lang } = useApp();
  const t = lang === "ru" ? TXT.ru : TXT.en;
  const [live, setLive] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const client = createPublicClient({ chain: polygon, transport: http(RPC_URL || "https://polygon-bor-rpc.publicnode.com") });
      const read = <T,>(fn: string) => client.readContract({ address: ESCROW, abi: ABI, functionName: fn as never }) as Promise<T>;
      const [balance, nextId, owner, oracle, feeRecipient, feeBps, maxBet] = await Promise.all([
        client.readContract({ address: USDC_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [ESCROW] }) as Promise<bigint>,
        read<bigint>("nextGameId"),
        read<string>("owner"),
        read<string>("oracle"),
        read<string>("feeRecipient"),
        read<number>("feeBps"),
        read<bigint>("maxBet"),
      ]);
      setLive({ balance, games: nextId > 0n ? nextId - 1n : 0n, owner, oracle, feeRecipient, feeBps: Number(feeBps), maxBet });
      setAt(new Date().toLocaleString(lang === "ru" ? "ru-RU" : "en-GB"));
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const value = (key: string): React.ReactNode => {
    if (!live) return "…";
    const addr = (a: string) => (
      <a className="underline break-all" href={SCAN + a} target="_blank" rel="noopener noreferrer">{a}</a>
    );
    switch (key) {
      case "balance": return `${usd(live.balance)} USDC`;
      case "games": return live.games.toString();
      case "maxBet": return `${usd(live.maxBet)} USDC`;
      case "fee": return `${(live.feeBps / 100).toFixed(2)}%`;
      case "owner": return live.owner === "0x0000000000000000000000000000000000000000" ? "—" : addr(live.owner);
      case "oracle": return addr(live.oracle);
      case "feeRecipient": return addr(live.feeRecipient);
      default: return "";
    }
  };

  const list = (title: string, items: string[]) => (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x} className="flex gap-2 text-sm">
            <span className="text-emerald-500" aria-hidden>•</span>
            <span className="opacity-90">{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <PageShell title={t.title} intro={t.intro}>
      <nav aria-label="Breadcrumb" className="text-xs opacity-70">
        <Link href={ROUTES.home} className="underline">HiMeet</Link> › <span>{t.crumb}</span>
      </nav>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t.live}</h2>
          <button type="button" onClick={load} disabled={busy} className="btn-ghost text-xs px-3 py-1 rounded-lg disabled:opacity-50">
            {busy ? "…" : t.refresh}
          </button>
        </div>
        {failed && <p className="text-sm text-red-500">{t.error}</p>}
        {!live && !failed && <p className="text-sm opacity-70">{t.loading}</p>}
        <dl className="space-y-2 text-sm">
          {t.rows.map(([label, key]) => (
            <div key={key} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-b border-black/10 dark:border-white/10 pb-2 last:border-0">
              <dt className="opacity-70">{label}</dt>
              <dd className="font-semibold">{value(key)}</dd>
            </div>
          ))}
        </dl>
        {at && <p className="text-xs opacity-60">{t.updated}: {at}</p>}
        <p className="text-sm flex flex-wrap gap-x-4 gap-y-1">
          <a className="underline" href={SCAN + ESCROW} target="_blank" rel="noopener noreferrer">{t.open}</a>
          <a className="underline" href={SCAN + USDC_ADDRESS} target="_blank" rel="noopener noreferrer">{t.openUsdc}</a>
        </p>
      </section>

      {list(t.fixedH, t.fixed)}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">{t.adminH}</h2>
        <dl className="space-y-2 text-sm">
          {t.admin.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd className="opacity-90">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {list(t.riskH, t.risks)}
    </PageShell>
  );
}

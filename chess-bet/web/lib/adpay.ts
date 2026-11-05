"use client";
// Оплата платных опций объявлений: перевод USDC на адрес сервера, затем запрос с хешем перевода (сервер проверяет перевод в блокчейне).
import { prepareContractCall, readContract, waitForReceipt } from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { usdcContract } from "./config";
import { adsError, adsPrices } from "./classifieds";

export type PayPurpose = "post" | "renew" | "pin";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HOUR = 50 * 60 * 1000; // сервер принимает переводы не старше часа; берём с запасом
const pkey = (addr: string, purpose: string, id: number) => `cb_adpay_${addr.toLowerCase()}_${purpose}_${id}`;

/** Перевод уже сделан, но сервер ещё не принял его (сбой связи, задержка сети): хеш хранится, и при повторе платить заново не нужно */
function pending(k: string): string {
  try {
    const s = JSON.parse(localStorage.getItem(k) || "null") as { tx: string; t: number } | null;
    if (s && /^0x[a-fA-F0-9]{64}$/.test(s.tx) && Date.now() - s.t < HOUR) return s.tx;
  } catch { /* без хранилища */ }
  return "";
}
const forget = (k: string) => { try { localStorage.removeItem(k); } catch { /* без хранилища */ } };

/** Возвращает payAndCall(purpose, id, call): платит и вызывает call(txHash). Ошибки показывать через payError */
export function useAdPay() {
  const account = useActiveAccount();
  const { mutateAsync: send } = useSendTransaction();
  return async function payAndCall<T>(purpose: PayPurpose, id: number, call: (tx: string) => Promise<T>): Promise<T> {
    if (!account) throw new Error("auth");
    const pr = await adsPrices();
    if (!pr.enabled) throw new Error("payment_required");
    const amount = BigInt(purpose === "pin" ? pr.pin : purpose === "renew" ? pr.renew : pr.post);
    const k = pkey(account.address, purpose, id);
    let tx = pending(k);
    if (!tx) {
      const bal = await readContract({ contract: usdcContract, method: "function balanceOf(address owner) view returns (uint256)", params: [account.address] });
      if (bal < amount) throw new Error("no_usdc");
      const r = await send(prepareContractCall({ contract: usdcContract, method: "function transfer(address to, uint256 amount) returns (bool)", params: [pr.to, amount] }));
      await waitForReceipt(r);
      tx = r.transactionHash;
      try { localStorage.setItem(k, JSON.stringify({ tx, t: Date.now() })); } catch { /* без хранилища */ }
    }
    let last: unknown = new Error("pay_unverified");
    for (let i = 0; i < 5; i++) {
      try { const res = await call(tx); forget(k); return res; }
      catch (e) {
        last = e;
        if ((e as Error)?.message !== "pay_unverified") break; // сеть могла ещё не показать перевод серверу: пробуем снова
        await sleep(3000);
      }
    }
    const m = (last as Error)?.message;
    if (m === "tx_used") forget(k); // этот перевод уже учтён
    throw Object.assign(last instanceof Error ? last : new Error(String(last)), { tx });
  };
}

/** Понятный текст ошибки оплаты (ru/en). Если перевод прошёл, но действие не выполнено, показываем хеш: повторная оплата не потребуется */
export function payError(e: unknown, ru: boolean): string {
  const m = String((e as Error)?.message || e || "");
  if (/reject|denied|cancel|declin|closed/i.test(m)) return ru ? "Оплата отменена" : "Payment cancelled";
  if (m === "no_usdc") return ru ? "Недостаточно USDC на кошельке (сеть Polygon)" : "Not enough USDC in your wallet (Polygon network)";
  if (/insufficient funds|gas/i.test(m)) return ru ? "Не хватает POL на комиссию сети" : "Not enough POL for the network fee";
  const tx = (e as { tx?: string })?.tx;
  const base = adsError(m, ru);
  if (!tx) return base;
  return base + (ru ? ` Перевод прошёл (${tx.slice(0, 10)}…), повторите действие: платить заново не придётся.` : ` Your payment went through (${tx.slice(0, 10)}…); repeat the action, you will not be charged again.`);
}

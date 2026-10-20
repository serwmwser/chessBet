"use client";
import { prepareContractCall, readContract, waitForReceipt } from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { escrowContract, ESCROW_ADDRESS, usdcContract } from "./config";

export type Step = "idle" | "approve" | "confirm";
const ZERO = "0x0000000000000000000000000000000000000000";
/** Разрешение на списание выдаём сразу на 10 ставок вперёд: следующие игры будут требовать одну подпись вместо двух. */
const ALLOWANCE_MULT = 10n;

/** Сколько и можно ли забрать по игре: amount — доступно игроку, claimed — уже забрано, status — статус игры в контракте (2 = идёт, 3 = завершена, 4 = отменена). */
export async function readClaimInfo(id: number, who: string) {
  const [amount, isClaimed, status] = await readContract({
    contract: escrowContract,
    method: "function claimInfo(uint256 id, address who) view returns (uint256 amount, bool isClaimed, uint8 status)",
    params: [BigInt(id), who],
  });
  return { amount: Number(amount), claimed: isClaimed, status: Number(status) };
}

export function useEscrow() {
  const account = useActiveAccount();
  const { mutateAsync: send } = useSendTransaction();

  const run = async (tx: Parameters<typeof send>[0]) => {
    const r = await send(tx);
    await waitForReceipt(r);
  };

  const ensureAllowance = async (amount: bigint, onStep?: (s: Step) => void) => {
    if (!account) throw new Error("no wallet");
    if (!ESCROW_ADDRESS) throw new Error("ESCROW address is not configured");
    const allowance = await readContract({
      contract: usdcContract,
      method: "function allowance(address owner, address spender) view returns (uint256)",
      params: [account.address, ESCROW_ADDRESS],
    });
    if (allowance >= amount) return;
    onStep?.("approve");
    await run(prepareContractCall({
      contract: usdcContract,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [ESCROW_ADDRESS, amount * ALLOWANCE_MULT],
    }));
  };

  return {
    account,
    /** signer = адрес одноразового ключа приглашения (приватная игра) или null (публичная) */
    async create(bet: number, duration: number, signer: string | null, onStep?: (s: Step) => void) {
      await ensureAllowance(BigInt(bet), onStep);
      onStep?.("confirm");
      await run(prepareContractCall({
        contract: escrowContract,
        method: "function createGame(uint256 bet, uint32 duration, address inviteSigner) returns (uint256)",
        params: [BigInt(bet), duration, signer ?? ZERO],
      }));
    },
    /** inviteSig = подпись ключа приглашения для приватной игры, для публичной — "0x" */
    async join(id: number, bet: number, inviteSig: string, onStep?: (s: Step) => void) {
      await ensureAllowance(BigInt(bet), onStep);
      onStep?.("confirm");
      await run(prepareContractCall({
        contract: escrowContract,
        method: "function joinGame(uint256 id, bytes inviteSig)",
        params: [BigInt(id), inviteSig as `0x${string}`],
      }));
    },
    async cancel(id: number) {
      await run(prepareContractCall({ contract: escrowContract, method: "function cancelGame(uint256 id)", params: [BigInt(id)] }));
    },
    async claim(id: number) {
      await run(prepareContractCall({ contract: escrowContract, method: "function claim(uint256 id)", params: [BigInt(id)] }));
    },
    async claimRef() {
      await run(prepareContractCall({ contract: escrowContract, method: "function claimRef()", params: [] }));
    },
    async refund(id: number) {
      await run(prepareContractCall({ contract: escrowContract, method: "function refundStuck(uint256 id)", params: [BigInt(id)] }));
    },
  };
}

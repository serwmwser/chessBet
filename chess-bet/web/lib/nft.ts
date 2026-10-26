"use client";
import { getContract, prepareContractCall, readContract, waitForReceipt } from "thirdweb";
import { toEventSelector } from "thirdweb/utils";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { API_URL, chain, client, usdcContract } from "./config";

/** Адрес контракта GameNFT (NFT любого момента партии). Пусто = NFT выключены, кнопки скрыты. */
export const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT || "0xD2ceB1218D9421eA3A140f88Fd1691FE1ff60BC0";
export const nftEnabled = NFT_ADDRESS !== "";
const nftContract = getContract({ client, chain, address: NFT_ADDRESS || "0x0000000000000000000000000000000000000000" });

export type NftStep = "idle" | "sign" | "approve" | "confirm";
/** Выбранный момент партии с подписью сервера (маршрут /nft/номер_партии/номер_хода) */
export type SnapSigned = {
  gameId: number; ply: number; total: number; from: number; to: number;
  san: string; fen: string; pgn: string; sig: string; nft: string;
};

const MINTED = toEventSelector("event Minted(uint256 indexed tokenId, uint256 indexed gameId, uint16 ply, address indexed owner)");

/** Адрес страницы NFT на OpenSea (сеть Polygon) */
export const openSeaUrl = (tokenId: number | string) => `https://opensea.io/assets/matic/${NFT_ADDRESS}/${tokenId}`;
/** Страница коллекции на OpenSea */
export const openSeaCollection = () => `https://opensea.io/assets/matic/${NFT_ADDRESS}`;

export async function fetchSnap(gameId: number, ply: number): Promise<SnapSigned> {
  const r = await fetch(`${API_URL}/nft/${gameId}/${ply}`, { cache: "no-store" });
  if (!r.ok) {
    let code = String(r.status);
    try { code = ((await r.json()) as { error?: string }).error || code; } catch { /* ответ без JSON */ }
    throw new Error(code);
  }
  return r.json();
}

/** Плата за создание NFT в USDC (минимальные единицы), по умолчанию 1 USDC */
export async function readMintFee(): Promise<bigint> {
  if (!nftEnabled) return 1_000_000n;
  return readContract({ contract: nftContract, method: "function mintFee() view returns (uint256)", params: [] });
}

/** Занят ли ход партии (на один ход один NFT) */
export async function isTaken(gameId: number, ply: number): Promise<boolean> {
  if (!nftEnabled) return false;
  try {
    return await readContract({ contract: nftContract, method: "function taken(uint256) view returns (bool)", params: [BigInt(gameId) * 100000n + BigInt(ply)] });
  } catch { return false; }
}

/** Уже созданные NFT этой партии: номера ходов, которые заняты (на один ход один NFT) */
export async function takenPlies(gameId: number, total: number): Promise<Set<number>> {
  const out = new Set<number>();
  if (!nftEnabled) return out;
  await Promise.all(Array.from({ length: total }, (_, i) => i + 1).map(async (ply) => {
    try {
      const t = await readContract({ contract: nftContract, method: "function taken(uint256) view returns (bool)", params: [BigInt(gameId) * 100000n + BigInt(ply)] });
      if (t) out.add(ply);
    } catch { /* ход считаем свободным, контракт проверит сам */ }
  }));
  return out;
}

export type MyNft = { id: number; gameId: number; ply: number; total: number; san: string; image: string };

/** NFT игрока: перебираем номера токенов (их немного), берём те, чей владелец сейчас этот кошелёк */
export async function listMyNfts(owner: string): Promise<MyNft[]> {
  if (!nftEnabled) return [];
  const supply = Number(await readContract({ contract: nftContract, method: "function totalSupply() view returns (uint256)", params: [] }));
  const ids = Array.from({ length: Math.min(supply, 300) }, (_, i) => supply - i);
  const mine: number[] = [];
  await Promise.all(ids.map(async (id) => {
    try {
      const o = await readContract({ contract: nftContract, method: "function ownerOf(uint256) view returns (address)", params: [BigInt(id)] });
      if (o.toLowerCase() === owner.toLowerCase()) mine.push(id);
    } catch { /* токен не найден */ }
  }));
  mine.sort((a, b) => b - a);
  return Promise.all(mine.map(async (id) => {
    let gameId = 0, ply = 0, total = 0, san = "", image = "";
    try {
      const m = await readContract({ contract: nftContract, method: "function momentOf(uint256) view returns (uint256 gameId, uint16 ply, uint16 total, string san, string fen, string pgn)", params: [BigInt(id)] });
      gameId = Number(m[0]); ply = Number(m[1]); total = Number(m[2]); san = String(m[3]);
    } catch { /* без подписи */ }
    try {
      const uri = await readContract({ contract: nftContract, method: "function tokenURI(uint256) view returns (string)", params: [BigInt(id)] });
      const b64 = uri.split(",")[1] || "";
      const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
      image = typeof json.image === "string" ? json.image : "";
    } catch { /* без картинки */ }
    return { id, gameId, ply, total, san, image };
  }));
}

export function useNft() {
  const account = useActiveAccount();
  const { mutateAsync: send } = useSendTransaction();

  /** Создать NFT выбранного хода: подпись сервера, разрешение на 1 USDC (если нужно) и создание. Возвращает номер токена. */
  async function mint(gameId: number, ply: number, onStep?: (s: NftStep) => void): Promise<number | null> {
    if (!account) throw new Error("no wallet");
    if (!nftEnabled) throw new Error("nft_off");
    onStep?.("sign");
    const s = await fetchSnap(gameId, ply);
    const fee = await readMintFee();
    if (fee > 0n) {
      const allowance = await readContract({
        contract: usdcContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [account.address, NFT_ADDRESS],
      });
      if (allowance < fee) {
        onStep?.("approve");
        const r = await send(prepareContractCall({
          contract: usdcContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [NFT_ADDRESS, fee * 10n], // сразу на 10 NFT вперёд
        }));
        await waitForReceipt(r);
      }
    }
    onStep?.("confirm");
    const r = await send(prepareContractCall({
      contract: nftContract,
      method: "function mint((uint64 gameId, uint16 ply, uint16 total, uint8 from, uint8 to, string san, string fen, string pgn) s, bytes sig) returns (uint256)",
      params: [{ gameId: BigInt(s.gameId), ply: s.ply, total: s.total, from: s.from, to: s.to, san: s.san, fen: s.fen, pgn: s.pgn }, s.sig as `0x${string}`],
    }));
    const rc = await waitForReceipt(r);
    const log = rc.logs.find((l) => l.address.toLowerCase() === NFT_ADDRESS.toLowerCase() && l.topics[0] === MINTED);
    return log && log.topics[1] ? Number(BigInt(log.topics[1])) : null;
  }
  return { account, mint };
}

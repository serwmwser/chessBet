import { createThirdwebClient, defineChain, getContract } from "thirdweb";

export const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 137);
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
export const FAUCET_ENABLED = process.env.NEXT_PUBLIC_FAUCET === "1";
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW || "";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
export const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/terms/`;

export const client = createThirdwebClient({ clientId: CLIENT_ID || "missing-client-id" });
export const chain = RPC_URL
  ? defineChain({ id: CHAIN_ID, rpc: RPC_URL, name: CHAIN_ID === 137 ? "Polygon" : "Local test", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 } })
  : defineChain(CHAIN_ID);

export const usdcContract = getContract({ client, chain, address: USDC_ADDRESS });
export const escrowContract = getContract({ client, chain, address: ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000" });

// Всё хранится в минимальных единицах USDC: 1 USDC = 1_000_000
export const BET_MIN = 500_000; // 0.5 USDC
export const BET_MAX = Number(process.env.NEXT_PUBLIC_BET_MAX_USDC || 500) * 1_000_000; // site cap, raise with contract maxBet
export const BET_STEP = 500_000; // 0.5 USDC
export const STD_MAX = 5_000_000; // standard section up to 5 USDC
export const BETS = Array.from({ length: Math.min(BET_MAX, STD_MAX) / BET_STEP }, (_, i) => (i + 1) * BET_STEP);
export const BIG_FROM = 25_000_000; // «Крупные» до 25 USDC, выше — VIP
export const BIG_MAX = Math.min(BET_MAX, BIG_FROM);
export const BIG_BETS = Array.from({ length: Math.max(0, (BIG_MAX - STD_MAX) / BET_STEP) }, (_, i) => STD_MAX + (i + 1) * BET_STEP);
/** VIP: от 25.5 до 50 USDC шаг 0.5, дальше до 500 USDC шаг 25; работает, когда потолок maxBet на контракте поднят до нужной суммы */
const VIP_FINE_MAX = 50_000_000;
const VIP_COARSE = 25_000_000;
export const VIP_BETS = [
  ...Array.from({ length: Math.max(0, (Math.min(BET_MAX, VIP_FINE_MAX) - BIG_FROM) / BET_STEP) }, (_, i) => BIG_FROM + (i + 1) * BET_STEP),
  ...Array.from({ length: Math.max(0, Math.floor((BET_MAX - VIP_FINE_MAX) / VIP_COARSE)) }, (_, i) => VIP_FINE_MAX + (i + 1) * VIP_COARSE),
];
export const DURATIONS = [900, 1800, 2700, 3600, 10800, 86400];
export const BOT_TIMES = [5, 15, 30, 45]; // минуты
export const DEFAULT_FEE_BPS = 600;

export const usdc = (n: number | bigint | string) => (Number(n) / 1e6).toFixed(2);
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Продолжение выпуска TCH, если токен уже создан, а скрипт deploy-tch.ts остановился (например, из-за ошибки узла сети).
// Токен НЕ создаётся заново: берётся адрес из TCH_TOKEN. Каждый шаг записывается в tch-state.json,
// поэтому скрипт можно безопасно запускать повторно: сделанные шаги пропускаются.
// Запуск: npx hardhat run scripts/deploy-tch-resume.ts --network polygon
import { ethers, network } from "hardhat";
import fs from "node:fs";

const E = (n: string) => ethers.parseEther(n);
const MONTH = 30 * 24 * 3600;
const STATE = "tch-state.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  const need = (k: string) => { const v = process.env[k]; if (!v || !ethers.isAddress(v)) throw new Error("Нужен адрес в .env: " + k); return v; };
  const opt = (k: string, d: string) => { const v = process.env[k]; if (!v) return d; if (!ethers.isAddress(v)) throw new Error("Неверный адрес в .env: " + k); return v; };
  const TOKEN = need("TCH_TOKEN"), OWNER = need("TCH_OWNER"), SIGNER = need("TCH_SIGNER"), TREASURY = need("TCH_TREASURY");
  const TEAM = opt("TCH_TEAM", OWNER), CEX = opt("TCH_CEX", OWNER);

  const RESERVE = E("515555559"), DEX = E("8888888"), CEXAMT = E("35555555"), OWNERAMT = E("44444444"),
    TEAMAMT = E("88888888"), TREASURYAMT = E("195555554");
  if (RESERVE + DEX + CEXAMT + OWNERAMT + TEAMAMT + TREASURYAMT !== E("888888888")) throw new Error("Сумма долей не равна эмиссии");

  const token = await ethers.getContractAt("TCHToken", TOKEN);
  if ((await token.symbol()) !== "TCH" || (await token.totalSupply()) !== E("888888888")) throw new Error("По адресу TCH_TOKEN не наш токен TCH");
  console.log("Сеть:", network.name, "· Продолжает:", deployer.address, "· Токен:", TOKEN);

  const state: Record<string, string | number> = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
  if (state.token && state.token !== TOKEN) throw new Error("tch-state.json относится к другому токену");
  state.token = TOKEN;
  const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  const once = async <T extends string | number>(key: string, label: string, fn: () => Promise<T>): Promise<T> => {
    if (state[key] !== undefined) { console.log("уже сделано:", label, state[key]); return state[key] as T; }
    const v = await fn(); state[key] = v; save(); console.log(label + ":", v); return v;
  };

  const now = await once("issuedAt", "Точка отсчёта графиков (время)", async () => (await ethers.provider.getBlock("latest"))!.timestamp);

  const poolAddr = await once("pool", "TCHRewardPool", async () => {
    const pool = await (await ethers.getContractFactory("TCHRewardPool")).deploy(TOKEN, SIGNER, OWNER, RESERVE);
    await pool.waitForDeployment(); return await pool.getAddress();
  });
  await once("poolFunded", "Резерв переведён в пул", async () => { await (await token.transfer(poolAddr, RESERVE)).wait(); return "ok"; });
  if ((await token.balanceOf(poolAddr)) !== RESERVE) throw new Error("Резерв не поступил в пул");

  const V = await ethers.getContractFactory("TCHVesting");
  const vest = async (key: string, who: string, start: number, dur: number, amt: bigint, label: string) => {
    const a = await once(key, label + " (контракт)", async () => { const v = await V.deploy(who, start, dur); await v.waitForDeployment(); return await v.getAddress(); });
    await once(key + "Funded", label + " (токены)", async () => { await (await token.transfer(a, amt)).wait(); return "ok"; });
    return a;
  };
  const ownerVest = await vest("ownerVest", OWNER, now + 6 * MONTH, 24 * MONTH, OWNERAMT, "Заморозка владельца");
  const teamVest = await vest("teamVest", TEAM, now + 12 * MONTH, 24 * MONTH, TEAMAMT, "Заморозка команды");
  const cexVest = await vest("cexVest", CEX, now + 12 * MONTH, 1, CEXAMT, "Резерв для биржи");
  await once("treasurySent", "Казна, ранние пользователи, партнёры", async () => { await (await token.transfer(TREASURY, TREASURYAMT)).wait(); return "ok"; });

  const left = await token.balanceOf(deployer.address);
  console.log("На адресе выпускающего остаётся", ethers.formatEther(left), "TCH (ожидается 8888888.0 для пула на DEX)");
  if (left !== DEX) console.log("ВНИМАНИЕ: остаток не равен 8888888, проверьте балансы");
  const out = { network: network.name, token: TOKEN, pool: poolAddr, ownerVest, teamVest, cexVest, owner: OWNER, team: TEAM, cex: CEX, signer: SIGNER, treasury: TREASURY, issuedAt: now };
  fs.writeFileSync("tch-deployed.json", JSON.stringify(out, null, 2));
  console.log("Адреса сохранены в tch-deployed.json");
}

main().catch((e) => { console.error(e); process.exit(1); });

// Выпуск токена TCH: создаёт токен, резерв наград, три заморозки и раздаёт доли.
// Запуск: npx hardhat run scripts/deploy-tch.ts --network polygon
// Переменные в .env: DEPLOYER_PK, TCH_OWNER, TCH_SIGNER, TCH_TREASURY, (необязательно) TCH_TEAM, TCH_CEX
import { ethers, network } from "hardhat";
import fs from "node:fs";

const E = (n: string) => ethers.parseEther(n);
const MONTH = 30 * 24 * 3600;

async function main() {
  const [deployer] = await ethers.getSigners();
  const need = (k: string) => { const v = process.env[k]; if (!v || !ethers.isAddress(v)) throw new Error("Нужен адрес в .env: " + k); return v; };
  const OWNER = need("TCH_OWNER");       // владелец приложения: 5% с заморозкой, управление паузой пула
  const SIGNER = need("TCH_SIGNER");     // адрес ключа сервера, который подписывает награды
  const TREASURY = need("TCH_TREASURY"); // казна + ранние пользователи + партнёры
  const opt = (k: string, d: string) => { const v = process.env[k]; if (!v) return d; if (!ethers.isAddress(v)) throw new Error("Неверный адрес в .env: " + k); return v; };
  const TEAM = opt("TCH_TEAM", OWNER);
  const CEX = opt("TCH_CEX", OWNER);

  const RESERVE = E("515555559"), DEX = E("8888888"), CEXAMT = E("35555555"), OWNERAMT = E("44444444"),
    TEAMAMT = E("88888888"), TREASURYAMT = E("195555554"); // 106 666 666 + 44 444 444 + 44 444 444
  if (RESERVE + DEX + CEXAMT + OWNERAMT + TEAMAMT + TREASURYAMT !== E("888888888")) throw new Error("Сумма долей не равна эмиссии");

  console.log("Сеть:", network.name, "· Выпускает:", deployer.address);
  const token = await (await ethers.getContractFactory("TCHToken")).deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("TCHToken:", tokenAddr);

  const pool = await (await ethers.getContractFactory("TCHRewardPool")).deploy(tokenAddr, SIGNER, OWNER, RESERVE);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("TCHRewardPool:", poolAddr);
  await (await token.transfer(poolAddr, RESERVE)).wait();
  if ((await token.balanceOf(poolAddr)) !== RESERVE) throw new Error("Резерв не поступил в пул");

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const V = await ethers.getContractFactory("TCHVesting");
  const mk = async (who: string, start: number, dur: number, amt: bigint, label: string) => {
    const v = await V.deploy(who, start, dur);
    await v.waitForDeployment();
    const a = await v.getAddress();
    await (await token.transfer(a, amt)).wait();
    console.log(label + ":", a, "→", who);
    return a;
  };
  const ownerVest = await mk(OWNER, now + 6 * MONTH, 24 * MONTH, OWNERAMT, "Заморозка владельца (6 мес. + 24 мес. линейно)");
  const teamVest = await mk(TEAM, now + 12 * MONTH, 24 * MONTH, TEAMAMT, "Заморозка команды (12 мес. + 24 мес. линейно)");
  const cexVest = await mk(CEX, now + 12 * MONTH, 1, CEXAMT, "Резерв для биржи (открывается через 12 мес.)");
  await (await token.transfer(TREASURY, TREASURYAMT)).wait();
  console.log("Казна, ранние пользователи, партнёры:", TREASURY);
  console.log("На адресе выпускающего остаются", ethers.formatEther(await token.balanceOf(deployer.address)), "TCH для пула на DEX (1%)");

  const out = { network: network.name, token: tokenAddr, pool: poolAddr, ownerVest, teamVest, cexVest, owner: OWNER, team: TEAM, cex: CEX, signer: SIGNER, treasury: TREASURY, issuedAt: now };
  fs.writeFileSync("tch-deployed.json", JSON.stringify(out, null, 2));
  console.log("Адреса сохранены в tch-deployed.json");
}

main().catch((e) => { console.error(e); process.exit(1); });

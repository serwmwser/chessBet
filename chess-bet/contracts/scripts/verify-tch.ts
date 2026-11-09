// Публикация исходного кода контрактов TCH на Polygonscan.
// Нужны в .env: POLYGONSCAN_KEY (ключ с etherscan.io/apis) и файлы tch-deployed.json + tch-state.json в этой папке.
// Запуск: npx hardhat run scripts/verify-tch.ts --network polygon
import hre, { ethers } from "hardhat";
import fs from "node:fs";

const MONTH = 30 * 24 * 3600;

async function main() {
  if (!process.env.POLYGONSCAN_KEY) throw new Error("Нужен POLYGONSCAN_KEY в .env");
  const d = JSON.parse(fs.readFileSync("tch-deployed.json", "utf8"));
  const s = JSON.parse(fs.readFileSync("tch-state.json", "utf8"));
  const t0 = Number(s.issuedAt);
  const jobs: [string, string, unknown[]][] = [
    ["TCHToken", d.token, [d.owner]],
    ["TCHRewardPool", d.pool, [d.token, d.signer, d.owner, ethers.parseEther("515555559").toString()]],
    ["TCHVesting (владелец)", d.ownerVest, [d.owner, t0 + 6 * MONTH, 24 * MONTH]],
    ["TCHVesting (команда)", d.teamVest, [d.team, t0 + 12 * MONTH, 24 * MONTH]],
    ["TCHVesting (резерв биржи)", d.cexVest, [d.cex, t0 + 12 * MONTH, 1]],
  ];
  for (const [name, address, constructorArguments] of jobs) {
    try {
      await hre.run("verify:verify", { address, constructorArguments });
      console.log("OK:", name, address);
    } catch (e: any) {
      const m = String(e?.message || e);
      if (/already verified/i.test(m)) console.log("Уже опубликован:", name, address);
      else console.log("ОШИБКА:", name, address, "\n  ", m.split("\n")[0]);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

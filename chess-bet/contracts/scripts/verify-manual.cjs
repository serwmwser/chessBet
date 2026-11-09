// Подготовка ручной публикации кода на сайте Polygonscan (если скрипт verify-tch.ts не может достучаться до сервера).
// Создаёт папку verify-manual/ с файлом standard-input.json и файлом instructions.txt (параметры конструкторов для каждого контракта).
// Запуск: node scripts/verify-manual.cjs
const fs = require("fs");
const path = require("path");
const { AbiCoder, parseEther } = require("ethers");

const MONTH = 30 * 24 * 3600;
const d = JSON.parse(fs.readFileSync("tch-deployed.json", "utf8"));
const s = JSON.parse(fs.readFileSync("tch-state.json", "utf8"));
const t0 = Number(s.issuedAt);

const dir = path.join("artifacts", "build-info");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
let input = null;
for (const { f } of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (j.input && j.input.sources && j.input.sources["contracts/TCHToken.sol"] && j.input.sources["contracts/TCHRewardPool.sol"] && j.input.sources["contracts/TCHVesting.sol"]) { input = j.input; break; }
}
if (!input) throw new Error("Не найден build-info с контрактами TCH. Выполните: npx hardhat compile --force");

const enc = (types, vals) => AbiCoder.defaultAbiCoder().encode(types, vals).slice(2);
const jobs = [
  ["TCHToken", "contracts/TCHToken.sol:TCHToken", d.token, enc(["address"], [d.owner])],
  ["TCHRewardPool", "contracts/TCHRewardPool.sol:TCHRewardPool", d.pool, enc(["address", "address", "address", "uint256"], [d.token, d.signer, d.owner, parseEther("515555559")])],
  ["TCHVesting (владелец)", "contracts/TCHVesting.sol:TCHVesting", d.ownerVest, enc(["address", "uint64", "uint64"], [d.owner, t0 + 6 * MONTH, 24 * MONTH])],
  ["TCHVesting (команда)", "contracts/TCHVesting.sol:TCHVesting", d.teamVest, enc(["address", "uint64", "uint64"], [d.team, t0 + 12 * MONTH, 24 * MONTH])],
  ["TCHVesting (резерв биржи)", "contracts/TCHVesting.sol:TCHVesting", d.cexVest, enc(["address", "uint64", "uint64"], [d.cex, t0 + 12 * MONTH, 1])],
];

fs.mkdirSync("verify-manual", { recursive: true });
fs.writeFileSync("verify-manual/standard-input.json", JSON.stringify(input));
let txt = "Ручная публикация на Polygonscan: https://polygonscan.com/verifyContract\n" +
  "Compiler type: Solidity (Standard-Json-Input) | Compiler version: v0.8.24 | License: MIT\n" +
  "Файл для загрузки: verify-manual/standard-input.json (один и тот же для всех пяти контрактов)\n\n";
for (const [name, full, addr, args] of jobs) {
  txt += "=== " + name + " ===\nАдрес: " + addr + "\nКонтракт (если спросит): " + full + "\nConstructor Arguments (ABI-encoded, без 0x):\n" + args + "\n\n";
}
fs.writeFileSync("verify-manual/instructions.txt", txt);
console.log("Готово: папка verify-manual (standard-input.json и instructions.txt)");

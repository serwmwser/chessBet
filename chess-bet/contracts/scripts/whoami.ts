import { ethers, network } from "hardhat";

// Показывает публичный адрес кошелька владельца и его баланс POL. Ключ не печатается.
async function main() {
  const [s] = await ethers.getSigners();
  if (!s) throw new Error("В contracts/.env не задан DEPLOYER_PK");
  const bal = await ethers.provider.getBalance(s.address);
  console.log("Сеть:", network.name);
  console.log("Адрес владельца:", s.address);
  console.log("Баланс POL:", ethers.formatEther(bal));
}
main().catch((e) => { console.error(e.message); process.exit(1); });

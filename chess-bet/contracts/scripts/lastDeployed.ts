import { ethers } from "hardhat";

// Показывает адрес контракта из последней транзакции владельца (публикации) и проверяет, что он на месте.
async function main() {
  const [s] = await ethers.getSigners();
  const n = await ethers.provider.getTransactionCount(s.address, "latest");
  console.log("Владелец:", s.address, "| отправлено транзакций:", n);
  const addr = ethers.getCreateAddress({ from: s.address, nonce: n - 1 });
  const code = await ethers.provider.getCode(addr);
  console.log("Адрес из последней транзакции:", addr);
  console.log(code && code !== "0x" ? "Контракт на месте" : "Контракта по этому адресу пока нет (транзакция ещё не прошла или была другой)");
  if (code && code !== "0x") {
    const nft = await ethers.getContractAt("GameNFT", addr);
    console.log("Имя:", await nft.name(), "| оракул:", await nft.oracle(), "| imageUrl:", await nft.imageUrl());
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });

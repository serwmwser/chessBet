import { ethers, network } from "hardhat";

// Поднять потолок ставки: npx hardhat run scripts/setMaxBet.ts --network polygon
// Сумма в USDC берётся из MAX_BET_USDC (по умолчанию 500). Ключ из .env (DEPLOYER_PK) нигде не печатается.
async function main() {
  if (network.name !== "polygon") throw new Error("Используйте --network polygon");
  const [owner] = await ethers.getSigners();
  const escrowAddr = ethers.getAddress(process.env.ESCROW || "0xaf8714656261dc770A41857706FF4b2f495e92e9");
  const escrow = await ethers.getContractAt("ChessEscrow", escrowAddr);

  const cap = BigInt(Math.round(Number(process.env.MAX_BET_USDC || 500) * 1e6));
  const was = await escrow.maxBet();
  console.log("Владелец контракта:", await escrow.owner());
  console.log("Ваш адрес:        ", owner.address);
  console.log("Сейчас maxBet:", Number(was) / 1e6, "USDC → будет", Number(cap) / 1e6, "USDC");
  if ((await escrow.owner()) !== owner.address) throw new Error("Ключ из .env не принадлежит владельцу контракта");

  const tx = await escrow.setMaxBet(cap);
  console.log("Транзакция:", tx.hash);
  await tx.wait();
  console.log("Готово, maxBet =", Number(await escrow.maxBet()) / 1e6, "USDC");
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });

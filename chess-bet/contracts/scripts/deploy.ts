import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const oracle = process.env.ORACLE_ADDRESS;
  const feeRecipient = process.env.FEE_RECIPIENT;
  const feeBps = Number(process.env.FEE_BPS || 600);
  if (!oracle || !feeRecipient) throw new Error("Задайте ORACLE_ADDRESS и FEE_RECIPIENT в .env");
  // защита от деплоя не тем ключом и от опечаток в адресах (getAddress проверяет контрольную сумму)
  const expectedOwner = process.env.EXPECTED_OWNER;
  if (expectedOwner && ethers.getAddress(expectedOwner) !== deployer.address)
    throw new Error(`Ключ деплоера даёт адрес ${deployer.address}, а ожидался ${expectedOwner}`);
  if (ethers.getAddress(oracle) === deployer.address) throw new Error("Oracle должен отличаться от owner");
  ethers.getAddress(feeRecipient);

  let usdc: string | undefined;
  if (network.name === "polygon") {
    usdc = process.env.USDC_POLYGON;
    if (!usdc) throw new Error("Задайте USDC_POLYGON");
  } else if (network.name === "amoy") {
    usdc = process.env.USDC_AMOY;
    if (!usdc) {
      const m = await (await ethers.getContractFactory("MockUSDC")).deploy();
      await m.waitForDeployment();
      usdc = await m.getAddress();
      console.log("MockUSDC:", usdc, "(вызовите mint(адрес, сумма) для тестовых игроков)");
    }
  } else {
    throw new Error("Используйте --network amoy или --network polygon");
  }

  console.log("Deployer:", deployer.address, "Network:", network.name);
  const Escrow = await ethers.getContractFactory("ChessEscrow");
  const escrow = await Escrow.deploy(usdc!, oracle, feeRecipient, feeBps);
  await escrow.waitForDeployment();
  console.log("ChessEscrow:", await escrow.getAddress());
  // Закрытая бета: потолок ставки в USDC (например, MAX_BET_USDC=0.5). Пусто = потолок по умолчанию 25 USDC.
  if (process.env.MAX_BET_USDC) {
    const cap = ethers.parseUnits(process.env.MAX_BET_USDC, 6);
    await (await escrow.setMaxBet(cap)).wait();
    console.log("Потолок ставки:", process.env.MAX_BET_USDC, "USDC");
  }
  console.log("Впишите адрес в server/.env (ESCROW) и web/.env.local (NEXT_PUBLIC_ESCROW).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

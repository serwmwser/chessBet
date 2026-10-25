import { ethers, network, run } from "hardhat";

// Публикация GameNFT в Polygon: npx hardhat run scripts/deployNFT.ts --network polygon
// Ключ берётся из .env (DEPLOYER_PK) и нигде не печатается.
async function main() {
  if (network.name !== "polygon") throw new Error("Используйте --network polygon");
  const [deployer] = await ethers.getSigners();
  const escrow = ethers.getAddress(process.env.ESCROW || "0xaf8714656261dc770A41857706FF4b2f495e92e9");
  const oracleRaw = process.env.ORACLE_ADDRESS;
  if (!oracleRaw) throw new Error("Задайте ORACLE_ADDRESS в .env (адрес оракула, не ключ)");
  const oracle = ethers.getAddress(oracleRaw);
  const royaltyReceiver = ethers.getAddress(process.env.ROYALTY_RECEIVER || process.env.FEE_RECIPIENT || deployer.address);
  const royaltyBps = Number(process.env.ROYALTY_BPS || 500);
  const expectedOwner = process.env.EXPECTED_OWNER;
  if (expectedOwner && ethers.getAddress(expectedOwner) !== deployer.address)
    throw new Error(`Ключ деплоера даёт адрес ${deployer.address}, а ожидался ${expectedOwner}`);
  if (oracle === deployer.address) throw new Error("Oracle должен отличаться от owner");

  console.log("Владелец (deployer):", deployer.address);
  console.log("ChessEscrow:", escrow, "| Oracle:", oracle);
  console.log("Роялти:", royaltyBps / 100 + "% →", royaltyReceiver);

  const NFT = await ethers.getContractFactory("GameNFT");
  const nft = await NFT.deploy(escrow, oracle, royaltyReceiver, royaltyBps, deployer.address);
  await nft.waitForDeployment();
  const addr = await nft.getAddress();
  console.log("GameNFT:", addr);

  if (process.env.POLYGONSCAN_KEY) {
    try {
      await nft.deploymentTransaction()?.wait(5);
      await run("verify:verify", { address: addr, constructorArguments: [escrow, oracle, royaltyReceiver, royaltyBps, deployer.address] });
      console.log("Контракт проверен на Polygonscan");
    } catch (e) {
      console.log("Проверка на Polygonscan не прошла (можно повторить позже):", (e as Error).message.slice(0, 200));
    }
  }
  console.log("Впишите адрес в server/.env (NFT_ADDRESS) и в web (NEXT_PUBLIC_NFT).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

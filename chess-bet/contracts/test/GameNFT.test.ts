import { expect } from "chai";
import { ethers } from "hardhat";

const U = (n: number) => BigInt(Math.round(n * 1e6));
const ZERO = ethers.ZeroAddress;
const FEN = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
const PGN = "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#";

describe("GameNFT", () => {
  async function setup() {
    const [owner, oracle, fee, a, b, c] = await ethers.getSigners();
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const esc = await (await ethers.getContractFactory("ChessEscrow")).deploy(await usdc.getAddress(), oracle.address, fee.address, 600);
    await esc.setMaxBet(U(500));
    for (const s of [a, b, c]) {
      await usdc.mint(s.address, U(1000));
      await usdc.connect(s).approve(await esc.getAddress(), U(1000));
    }
    const nft = await (await ethers.getContractFactory("GameNFT")).deploy(await esc.getAddress(), oracle.address, fee.address, 500, owner.address);
    return { owner, oracle, fee, a, b, c, usdc, esc, nft };
  }
  async function played(esc: any, a: any, b: any, oracle: any, winner: string, bet = 5) {
    await esc.connect(a).createGame(U(bet), 900, ZERO);
    const id = Number(await esc.nextGameId()) - 1;
    await esc.connect(b).joinGame(id, "0x");
    await esc.connect(oracle).reportResult(id, winner);
    return id;
  }
  async function sig(nft: any, oracle: any, id: number, fen = FEN, pgn = PGN) {
    const { chainId } = await ethers.provider.getNetwork();
    const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256", "string", "string"], [await nft.getAddress(), chainId, id, fen, pgn]));
    return oracle.signMessage(ethers.getBytes(digest));
  }
  const decode = (uri: string) => JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());

  it("игрок создаёт NFT завершённой партии; данные берутся из эскроу", async () => {
    const { esc, nft, oracle, a, b } = await setup();
    const id = await played(esc, a, b, oracle, a.address);
    await expect(nft.connect(a).mint(id, FEN, PGN, await sig(nft, oracle, id))).to.emit(nft, "Minted").withArgs(id, a.address);
    expect(await nft.ownerOf(id)).to.equal(a.address);
    expect(await nft.winnerOf(id)).to.equal(a.address);
    expect(await nft.gamePgn(id)).to.equal(PGN);
    const meta = decode(await nft.tokenURI(id));
    expect(meta.name).to.equal("Chess Bet #1");
    expect(meta.attributes.find((x: any) => x.trait_type === "Result").value).to.equal("White won");
    expect(meta.attributes.find((x: any) => x.trait_type === "Bet (USDC)").value).to.equal(5);
    const svg = Buffer.from(meta.image.split(",")[1], "base64").toString();
    expect(svg).to.contain("CHESS BET #1");
    expect((svg.match(/♟|♜|♞|♝|♛|♚/g) || []).length).to.equal(31); // в позиции 31 фигура (16 белых и 15 чёрных)
  });

  it("победа чёрных и ничья показываются верно", async () => {
    const { esc, nft, oracle, a, b } = await setup();
    const id1 = await played(esc, a, b, oracle, b.address, 25.5);
    await nft.connect(b).mint(id1, FEN, PGN, await sig(nft, oracle, id1));
    expect(decode(await nft.tokenURI(id1)).attributes[0].value).to.equal("Black won");
    expect(decode(await nft.tokenURI(id1)).attributes[1].value).to.equal(25.5);
    const id2 = await played(esc, a, b, oracle, ZERO);
    await nft.connect(a).mint(id2, FEN, PGN, await sig(nft, oracle, id2));
    expect(decode(await nft.tokenURI(id2)).attributes[0].value).to.equal("Draw");
  });

  it("не даёт создать NFT чужому, второй раз, без подписи оракула или для незавершённой партии", async () => {
    const { esc, nft, oracle, a, b, c } = await setup();
    const id = await played(esc, a, b, oracle, a.address);
    const s = await sig(nft, oracle, id);
    await expect(nft.connect(c).mint(id, FEN, PGN, s)).to.be.revertedWith("not player");
    await expect(nft.connect(a).mint(id, FEN + "x", PGN, s)).to.be.revertedWith("bad sig"); // подмена данных
    await expect(nft.connect(a).mint(id, FEN, PGN, await sig(nft, a, id))).to.be.revertedWith("bad sig"); // подпись не оракула
    await nft.connect(a).mint(id, FEN, PGN, s);
    await expect(nft.connect(b).mint(id, FEN, PGN, s)).to.be.revertedWith("minted");
    await esc.connect(a).createGame(U(1), 900, ZERO);
    await expect(nft.connect(a).mint(2, FEN, PGN, await sig(nft, oracle, 2))).to.be.revertedWith("not finished");
    await expect(nft.connect(a).mint(99, FEN, PGN, await sig(nft, oracle, 99))).to.be.revertedWith("not finished");
  });

  it("роялти 5% идёт получателю, права владельца ограничены", async () => {
    const { esc, nft, oracle, fee, owner, a, b } = await setup();
    const id = await played(esc, a, b, oracle, a.address);
    await nft.connect(a).mint(id, FEN, PGN, await sig(nft, oracle, id));
    const [rcv, amt] = await nft.royaltyInfo(id, 10_000n);
    expect(rcv).to.equal(fee.address);
    expect(amt).to.equal(500n);
    const col = decode(await nft.contractURI());
    expect(col.seller_fee_basis_points).to.equal(500);
    await expect(nft.connect(a).setRoyalty(a.address, 100)).to.be.reverted;
    await expect(nft.connect(owner).setRoyalty(a.address, 1001)).to.be.revertedWith("royalty");
    await nft.connect(owner).setRoyalty(a.address, 700);
    expect((await nft.royaltyInfo(id, 10_000n))[1]).to.equal(700n);
    expect(await nft.supportsInterface("0x2a55205a")).to.equal(true); // ERC-2981
    expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
  });
});

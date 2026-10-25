import { expect } from "chai";
import { ethers } from "hardhat";

const U = (n: number) => BigInt(Math.round(n * 1e6));
const ZERO = ethers.ZeroAddress;
// партия-«детский мат»: 7 полуходов, последний Qxf7#
const FEN7 = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
const FEN3 = "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2";
const PGN7 = "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#";
const PGN3 = "1. e4 e5 2. Bc4";
const SNAP_T = "tuple(uint64 gameId,uint16 ply,uint16 total,uint8 from,uint8 to,string san,string fen,string pgn)";

type Snap = { gameId: number; ply: number; total: number; from: number; to: number; san: string; fen: string; pgn: string };
const FINAL: Snap = { gameId: 1, ply: 7, total: 7, from: 31, to: 13, san: "Qxf7#", fen: FEN7, pgn: PGN7 };
const MID: Snap = { gameId: 1, ply: 3, total: 7, from: 61, to: 34, san: "Bc4", fen: FEN3, pgn: PGN3 };

describe("GameNFT (моменты партий)", () => {
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
    for (const s of [a, b, c]) await usdc.connect(s).approve(await nft.getAddress(), U(100)); // разрешение на плату за NFT
    return { owner, oracle, fee, a, b, c, usdc, esc, nft };
  }
  async function played(esc: any, a: any, b: any, oracle: any, winner: string, bet = 5) {
    await esc.connect(a).createGame(U(bet), 900, ZERO);
    const id = Number(await esc.nextGameId()) - 1;
    await esc.connect(b).joinGame(id, "0x");
    await esc.connect(oracle).reportResult(id, winner);
    return id;
  }
  async function sig(nft: any, oracle: any, s: Snap) {
    const { chainId } = await ethers.provider.getNetwork();
    const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", SNAP_T], [await nft.getAddress(), chainId, s]));
    return oracle.signMessage(ethers.getBytes(digest));
  }
  const decode = (uri: string) => JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
  const attr = (meta: any, name: string) => meta.attributes.find((x: any) => x.trait_type === name).value;

  it("игрок создаёт NFT итоговой позиции (мат); данные берутся из эскроу", async () => {
    const { esc, nft, oracle, a, b } = await setup();
    const id = await played(esc, a, b, oracle, a.address);
    expect(id).to.equal(1);
    await expect(nft.connect(a).mint(FINAL, await sig(nft, oracle, FINAL))).to.emit(nft, "Minted").withArgs(1, 1, 7, a.address);
    expect(await nft.ownerOf(1)).to.equal(a.address);
    expect(await nft.winnerOf(1)).to.equal(a.address);
    const meta = decode(await nft.tokenURI(1));
    expect(meta.name).to.equal("Chess Bet #1 - Move 7/7 Qxf7#");
    expect(attr(meta, "Result")).to.equal("White won");
    expect(attr(meta, "Final position")).to.equal("Yes");
    expect(attr(meta, "Bet (USDC)")).to.equal(5);
    const svg = Buffer.from(meta.image.split(",")[1], "base64").toString();
    expect(svg).to.contain("CHESS BET #1");
    expect(svg).to.contain("Move 7/7 Qxf7# (final)");
    expect(svg).to.contain('fill="#f7d046"'); // подсветка последнего хода
    expect((svg.match(/♟|♜|♞|♝|♛|♚/g) || []).length).to.equal(31);
    const m = await nft.momentOf(1);
    expect(m.pgn).to.equal(PGN7);
  });

  it("можно выбрать любой ход, и проигравший тоже; на один ход один NFT", async () => {
    const { esc, nft, oracle, a, b } = await setup();
    await played(esc, a, b, oracle, a.address);
    await nft.connect(b).mint(MID, await sig(nft, oracle, MID)); // проигравший создаёт NFT позиции на 3-м ходу
    expect(await nft.ownerOf(1)).to.equal(b.address);
    const meta = decode(await nft.tokenURI(1));
    expect(attr(meta, "Final position")).to.equal("No");
    expect(attr(meta, "Move")).to.equal(3);
    await nft.connect(a).mint(FINAL, await sig(nft, oracle, FINAL)); // а победитель итоговую
    expect(await nft.totalSupply()).to.equal(2n);
    await expect(nft.connect(a).mint(MID, await sig(nft, oracle, MID))).to.be.revertedWith("taken"); // этот ход уже взят
  });

  it("создание платное: 1 USDC уходит на баланс проекта, без разрешения не создаётся", async () => {
    const { esc, nft, usdc, oracle, fee, owner, a, b } = await setup();
    await played(esc, a, b, oracle, a.address);
    expect(await nft.mintFee()).to.equal(U(1));
    await usdc.connect(a).approve(await nft.getAddress(), 0);
    await expect(nft.connect(a).mint(FINAL, await sig(nft, oracle, FINAL))).to.be.reverted; // нет разрешения на списание
    await usdc.connect(a).approve(await nft.getAddress(), U(1));
    const f0 = await usdc.balanceOf(fee.address), a0 = await usdc.balanceOf(a.address);
    await nft.connect(a).mint(FINAL, await sig(nft, oracle, FINAL));
    expect((await usdc.balanceOf(fee.address)) - f0).to.equal(U(1));
    expect(a0 - (await usdc.balanceOf(a.address))).to.equal(U(1));
    await expect(nft.connect(a).setMintFee(0, a.address)).to.be.reverted;
    await expect(nft.connect(owner).setMintFee(U(10) + 1n, a.address)).to.be.revertedWith("fee");
    await nft.connect(owner).setMintFee(0, fee.address);
    await usdc.connect(b).approve(await nft.getAddress(), 0);
    await nft.connect(b).mint(MID, await sig(nft, oracle, MID)); // при нулевой плате разрешение не нужно
  });

  it("ничья и победа чёрных показываются верно", async () => {
    const { esc, nft, oracle, a, b } = await setup();
    await played(esc, a, b, oracle, b.address, 25.5);
    await nft.connect(b).mint(FINAL, await sig(nft, oracle, FINAL));
    expect(attr(decode(await nft.tokenURI(1)), "Result")).to.equal("Black won");
    expect(attr(decode(await nft.tokenURI(1)), "Bet (USDC)")).to.equal(25.5);
    await played(esc, a, b, oracle, ZERO);
    const s2 = { ...FINAL, gameId: 2 };
    await nft.connect(a).mint(s2, await sig(nft, oracle, s2));
    expect(attr(decode(await nft.tokenURI(2)), "Result")).to.equal("Draw");
  });

  it("защита: чужой, подмена данных, не оракул, незавершённая партия, неверный ход", async () => {
    const { esc, nft, oracle, a, b, c } = await setup();
    await played(esc, a, b, oracle, a.address);
    const s = await sig(nft, oracle, FINAL);
    await expect(nft.connect(c).mint(FINAL, s)).to.be.revertedWith("not player");
    await expect(nft.connect(a).mint({ ...FINAL, fen: FEN3 }, s)).to.be.revertedWith("bad sig"); // подмена позиции
    await expect(nft.connect(a).mint({ ...FINAL, ply: 6 }, s)).to.be.revertedWith("bad sig"); // подмена номера хода
    await expect(nft.connect(a).mint(FINAL, await sig(nft, a, FINAL))).to.be.revertedWith("bad sig"); // подпись не оракула
    const bad0 = { ...FINAL, ply: 0 };
    await expect(nft.connect(a).mint(bad0, await sig(nft, oracle, bad0))).to.be.revertedWith("ply");
    const bad9 = { ...FINAL, ply: 9 };
    await expect(nft.connect(a).mint(bad9, await sig(nft, oracle, bad9))).to.be.revertedWith("ply");
    await esc.connect(a).createGame(U(1), 900, ZERO); // партия 2 не завершена
    const g2 = { ...FINAL, gameId: 2 };
    await expect(nft.connect(a).mint(g2, await sig(nft, oracle, g2))).to.be.revertedWith("not finished");
    const g99 = { ...FINAL, gameId: 99 };
    await expect(nft.connect(a).mint(g99, await sig(nft, oracle, g99))).to.be.revertedWith("not finished");
  });

  it("роялти 5% идёт получателю, права владельца ограничены", async () => {
    const { esc, nft, oracle, fee, owner, a, b } = await setup();
    await played(esc, a, b, oracle, a.address);
    await nft.connect(a).mint(FINAL, await sig(nft, oracle, FINAL));
    const [rcv, amt] = await nft.royaltyInfo(1, 10_000n);
    expect(rcv).to.equal(fee.address);
    expect(amt).to.equal(500n);
    expect(decode(await nft.contractURI()).seller_fee_basis_points).to.equal(500);
    await expect(nft.connect(a).setRoyalty(a.address, 100)).to.be.reverted;
    await expect(nft.connect(owner).setRoyalty(a.address, 1001)).to.be.revertedWith("royalty");
    await nft.connect(owner).setRoyalty(a.address, 700);
    expect((await nft.royaltyInfo(1, 10_000n))[1]).to.equal(700n);
    expect(await nft.supportsInterface("0x2a55205a")).to.equal(true); // ERC-2981
    expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
  });
});

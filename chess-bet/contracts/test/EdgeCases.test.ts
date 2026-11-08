import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const U = (n: number) => BigInt(Math.round(n * 1e6));
const ZERO = ethers.ZeroAddress;
const GRACE = 3 * 24 * 3600;

describe("ChessEscrow: крайние случаи", () => {
  async function setup(mock = "MockUSDC") {
    const [owner, oracle, fee, a, b, c, ref] = await ethers.getSigners();
    const usdc: any = await (await ethers.getContractFactory(mock)).deploy();
    const esc: any = await (await ethers.getContractFactory("ChessEscrow")).deploy(
      await usdc.getAddress(), oracle.address, fee.address, 1000 // комиссия 10% как на проде
    );
    for (const s of [a, b, c]) {
      await usdc.mint(s.address, U(10000));
      await usdc.connect(s).approve(await esc.getAddress(), U(10000));
    }
    return { owner, oracle, fee, a, b, c, ref, usdc, esc, addr: await esc.getAddress() };
  }

  // ------------------------------------------------------------ ставки на границе потолка
  describe("граница потолка ставки", () => {
    it("стартовый потолок 25: 25 можно, 25.5 нельзя", async () => {
      const { esc, a } = await setup();
      await esc.connect(a).createGame(U(25), 900, ZERO);
      await expect(esc.connect(a).createGame(U(25.5), 900, ZERO)).to.be.revertedWithCustomError(esc, "BadBet");
    });

    it("потолок 500: 500 можно, 500.5 и 499.75 нельзя, выше 500 владелец поставить не может", async () => {
      const { esc, a, owner } = await setup();
      await esc.connect(owner).setMaxBet(U(500));
      await esc.connect(a).createGame(U(500), 900, ZERO);
      await esc.connect(a).createGame(U(499.5), 900, ZERO);
      for (const bad of [U(500.5), U(499.75), U(0.25), 0n])
        await expect(esc.connect(a).createGame(bad, 900, ZERO)).to.be.revertedWithCustomError(esc, "BadBet");
      for (const bad of [U(500.5), U(501), U(1000), 0n, U(0.25), U(10.25)])
        await expect(esc.connect(owner).setMaxBet(bad)).to.be.revertedWithCustomError(esc, "BadBet");
    });

    it("минимум 0.5: 0.5 можно, 0.499999 нельзя", async () => {
      const { esc, a } = await setup();
      await esc.connect(a).createGame(U(0.5), 900, ZERO);
      await expect(esc.connect(a).createGame(499_999n, 900, ZERO)).to.be.revertedWithCustomError(esc, "BadBet");
    });

    it("снижение потолка не мешает завершить уже начатую партию", async () => {
      const { esc, usdc, oracle, owner, a, b } = await setup();
      await esc.connect(owner).setMaxBet(U(500));
      await esc.connect(a).createGame(U(500), 900, ZERO);
      await esc.connect(b).joinGame(1, "0x");
      await esc.connect(owner).setMaxBet(U(10));
      await esc.connect(oracle).reportResult(1, a.address);
      await esc.connect(a).claim(1);
      expect(await usdc.balanceOf(a.address)).to.equal(U(10000) + U(400)); // +900 выигрыш −500 ставка
      await expect(esc.connect(a).createGame(U(500), 900, ZERO)).to.be.revertedWithCustomError(esc, "BadBet");
    });
  });

  // ------------------------------------------------------------ 10 партий по 500
  describe("10 одновременных партий по 500 USDC", () => {
    it("все банки учтены до цента, после выплат на контракте 0", async () => {
      const { esc, usdc, oracle, fee, owner, a, b, addr } = await setup();
      await esc.connect(owner).setMaxBet(U(500));
      for (let i = 0; i < 10; i++) {
        await esc.connect(a).createGame(U(500), 900, ZERO);
        await esc.connect(b).joinGame(i + 1, "0x");
      }
      expect(await usdc.balanceOf(addr)).to.equal(U(10000));

      // 4 победы a, 4 победы b, 2 ничьи
      for (let i = 1; i <= 10; i++) {
        const w = i <= 4 ? a.address : i <= 8 ? b.address : ZERO;
        await esc.connect(oracle).reportResult(i, w);
        // инвариант: баланс контракта не меньше всех невыплаченных обязательств
        let owed = 0n;
        for (let j = 1; j <= 10; j++) {
          for (const p of [a, b]) {
            const [amt, cl] = await esc.claimInfo(j, p.address);
            if (!cl) owed += amt;
          }
          const g = await esc.games(j);
          if (g.status === 2n) owed += g.bet * 2n; // Active
        }
        expect(await usdc.balanceOf(addr)).to.be.gte(owed);
      }
      for (let i = 1; i <= 10; i++) {
        for (const p of [a, b]) {
          const [amt, cl] = await esc.claimInfo(i, p.address);
          if (amt > 0n && !cl) await esc.connect(p).claim(i);
        }
      }
      expect(await usdc.balanceOf(addr)).to.equal(0n);
      // комиссия 10% от 8 решённых банков по 1000 = 800
      expect(await usdc.balanceOf(fee.address)).to.equal(U(800));
      const total = (await usdc.balanceOf(a.address)) + (await usdc.balanceOf(b.address)) + (await usdc.balanceOf(fee.address));
      expect(total).to.equal(U(20000));
    });
  });

  // ------------------------------------------------------------ оракул пропал
  describe("оракул пропал", () => {
    async function activeGame(dur = 900) {
      const s = await setup();
      await s.esc.connect(s.a).createGame(U(500 > 25 ? 25 : 25), dur, ZERO);
      await s.esc.connect(s.b).joinGame(1, "0x");
      const g = await s.esc.games(1);
      return { ...s, deadline: Number(g.startedAt) + 2 * dur + GRACE };
    }

    it("refundStuck: за секунду до срока нельзя, ровно в срок можно", async () => {
      const { esc, a, deadline } = await activeGame();
      await time.setNextBlockTimestamp(deadline - 1);
      await expect(esc.connect(a).refundStuck(1, { gasLimit: 500000 })).to.be.reverted;
      await time.setNextBlockTimestamp(deadline + 1);
      await esc.connect(a).refundStuck(1, { gasLimit: 500000 });
      expect((await esc.games(1)).status).to.equal(4n); // Cancelled
    });

    it("после refundStuck оба забирают ровно свою ставку, без комиссии, контракт пуст", async () => {
      const { esc, usdc, a, b, c, addr, fee, deadline } = await activeGame();
      await time.setNextBlockTimestamp(deadline + 1);
      await esc.connect(c).refundStuck(1, { gasLimit: 500000 }); // вызвать может кто угодно
      await esc.connect(a).claim(1);
      await esc.connect(b).claim(1);
      expect(await usdc.balanceOf(a.address)).to.equal(U(10000));
      expect(await usdc.balanceOf(b.address)).to.equal(U(10000));
      expect(await usdc.balanceOf(addr)).to.equal(0n);
      expect(await usdc.balanceOf(fee.address)).to.equal(0n);
      await expect(esc.connect(a).claim(1)).to.be.revertedWithCustomError(esc, "NothingToClaim");
    });

    it("двойное закрытие невозможно: refundStuck после результата и результат после refundStuck", async () => {
      const s = await activeGame();
      await time.setNextBlockTimestamp(s.deadline + 5);
      await s.esc.connect(s.oracle).reportResult(1, s.a.address); // оракул успел до refundStuck
      await expect(s.esc.connect(s.b).refundStuck(1, { gasLimit: 500000 })).to.be.reverted;
      const t = await activeGame();
      await time.setNextBlockTimestamp(t.deadline + 5);
      await t.esc.connect(t.b).refundStuck(1, { gasLimit: 500000 });
      await expect(t.esc.connect(t.oracle).reportResult(1, t.a.address)).to.be.revertedWithCustomError(t.esc, "BadStatus");
    });

    it("refundStuck не работает для открытой, завершённой и несуществующей игры", async () => {
      const { esc, a } = await setup();
      await esc.connect(a).createGame(U(1), 900, ZERO);
      await expect(esc.refundStuck(1)).to.be.revertedWithCustomError(esc, "BadStatus");
      await expect(esc.refundStuck(99)).to.be.revertedWithCustomError(esc, "BadStatus");
    });

    it("открытую игру создатель отменяет в любой момент и получает ставку", async () => {
      const { esc, usdc, a, b } = await setup();
      await esc.connect(a).createGame(U(25), 900, ZERO);
      await expect(esc.connect(b).cancelGame(1)).to.be.revertedWithCustomError(esc, "NotAllowed");
      await esc.connect(a).cancelGame(1);
      expect(await usdc.balanceOf(a.address)).to.equal(U(10000));
      await expect(esc.connect(b).joinGame(1, "0x")).to.be.revertedWithCustomError(esc, "BadStatus");
    });

    it("игру 24 часа нельзя вернуть раньше 2 суток + 3 дня", async () => {
      const { esc, a } = await activeGame(86400);
      await time.increase(86400 * 2); // 2 суток — ещё рано
      await expect(esc.connect(a).refundStuck(1)).to.be.revertedWithCustomError(esc, "TooEarly");
    });

    it("после замены оракула новый оракул закрывает зависшие игры", async () => {
      const { esc, owner, a, c } = await activeGame();
      await esc.connect(owner).setOracle(c.address);
      await esc.connect(c).reportResult(1, a.address);
      expect((await esc.games(1)).status).to.equal(3n);
    });
  });

  // ------------------------------------------------------------ чёрный список USDC
  describe("чёрный список USDC", () => {
    async function played() {
      const s = await setup("BlacklistUSDC");
      await s.esc.connect(s.a).createGame(U(25), 900, ZERO);
      await s.esc.connect(s.b).joinGame(1, "0x");
      return s;
    }

    it("ПРОВЕРКА ОШИБКИ: получатель комиссии в чёрном списке блокирует результат партии", async () => {
      const { esc, usdc, oracle, fee, a, b } = await played();
      await usdc.setBlacklisted(fee.address, true);
      await expect(esc.connect(oracle).reportResult(1, a.address)).to.be.reverted; // победу записать нельзя
      await esc.connect(oracle).reportResult(1, ZERO); // ничья проходит
      await esc.connect(a).claim(1);
      await esc.connect(b).claim(1);
    });

    it("владелец может сменить получателя комиссии и партия завершается", async () => {
      const { esc, usdc, oracle, owner, fee, c, a } = await played();
      await usdc.setBlacklisted(fee.address, true);
      await esc.connect(owner).setFee(1000, c.address);
      await esc.connect(oracle).reportResult(1, a.address);
      expect(await usdc.balanceOf(c.address)).to.equal(U(10000) + U(5));
    });

    it("игрок в чёрном списке не получает выигрыш, но это не мешает другим играм", async () => {
      const { esc, usdc, oracle, a, b, c, addr } = await played();
      await esc.connect(c).createGame(U(1), 900, ZERO);
      await usdc.mint(a.address, U(1)); // чтобы a мог присоединиться
      await esc.connect(a).joinGame(2, "0x");
      await usdc.setBlacklisted(b.address, true);
      await esc.connect(oracle).reportResult(1, b.address);
      await expect(esc.connect(b).claim(1)).to.be.reverted; // заблокированный не получит
      await esc.connect(oracle).reportResult(2, a.address);
      await esc.connect(a).claim(2); // соседняя игра работает
      expect(await usdc.balanceOf(addr)).to.equal(U(45)); // 45 = выигрыш b остаётся на контракте
    });

    it("реферер в чёрном списке не блокирует результат: сумма копится в refOwed", async () => {
      const { esc, usdc, oracle, ref, a } = await played();
      await esc.connect(oracle).setReferrer(a.address, ref.address);
      await usdc.setBlacklisted(ref.address, true);
      await esc.connect(oracle).reportResult(1, a.address);
      expect(await esc.refOwed(ref.address)).to.be.gt(0n);
      await expect(esc.connect(ref).claimRef()).to.be.reverted;
      await usdc.setBlacklisted(ref.address, false);
      await esc.connect(ref).claimRef();
    });
  });

  // ------------------------------------------------------------ оракул и права
  describe("права", () => {
    it("оракул не может отправить деньги третьему лицу; чужие вызовы отклоняются", async () => {
      const { esc, oracle, a, b, c } = await setup();
      await esc.connect(a).createGame(U(25), 900, ZERO);
      await esc.connect(b).joinGame(1, "0x");
      await expect(esc.connect(oracle).reportResult(1, c.address)).to.be.revertedWithCustomError(esc, "BadWinner");
      await expect(esc.connect(c).reportResult(1, a.address)).to.be.revertedWithCustomError(esc, "NotAllowed");
      await expect(esc.connect(a).setOracle(a.address)).to.be.reverted;
      await expect(esc.connect(a).setFee(0, a.address)).to.be.reverted;
      await expect(esc.connect(a).setMaxBet(U(1))).to.be.reverted;
    });

    it("в уже начатую партию нельзя вступить третьему и нельзя сыграть с самим собой", async () => {
      const { esc, a, b, c } = await setup();
      await esc.connect(a).createGame(U(25), 900, ZERO);
      await expect(esc.connect(a).joinGame(1, "0x")).to.be.revertedWithCustomError(esc, "NotAllowed");
      await esc.connect(b).joinGame(1, "0x");
      await expect(esc.connect(c).joinGame(1, "0x")).to.be.revertedWithCustomError(esc, "BadStatus");
    });

    it("комиссия: изменение до результата применяется к уже идущей партии, но не выше 10%", async () => {
      const { esc, owner, c } = await setup();
      await expect(esc.connect(owner).setFee(1001, c.address)).to.be.revertedWithCustomError(esc, "FeeTooHigh");
    });
  });
});

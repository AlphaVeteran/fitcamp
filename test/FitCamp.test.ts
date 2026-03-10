import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import type { Contract } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const STAKE_AMOUNT = 100n * 10n ** 6n;
const CHALLENGE_DAYS = 7;
const ROUND_ID = 0;

describe("FitCamp (多期)", function () {
  let fitCamp: Contract;
  let usdc: Contract;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const FitCamp = await ethers.getContractFactory("FitCamp");
    fitCamp = await FitCamp.deploy(await usdc.getAddress(), CHALLENGE_DAYS);
    await fitCamp.waitForDeployment();

    const mintAmount = 200n * 10n ** 6n;
    await usdc.connect(alice).mint(alice.address, mintAmount);
    await usdc.connect(bob).mint(bob.address, mintAmount);
    await usdc.connect(carol).mint(carol.address, mintAmount);

    await usdc.connect(alice).approve(await fitCamp.getAddress(), ethers.MaxUint256);
    await usdc.connect(bob).approve(await fitCamp.getAddress(), ethers.MaxUint256);
    await usdc.connect(carol).approve(await fitCamp.getAddress(), ethers.MaxUint256);

    await fitCamp.connect(owner).openRoundForJoin(0);
  });

  describe("建群前不可报名", function () {
    it("未开放报名时 joinCamp 应 revert", async function () {
      const FitCamp2 = await ethers.getContractFactory("FitCamp");
      const fc2 = await FitCamp2.deploy(await usdc.getAddress(), CHALLENGE_DAYS);
      await fc2.waitForDeployment();
      await usdc.connect(alice).approve(await fc2.getAddress(), ethers.MaxUint256);
      await expect(fc2.connect(alice).joinCamp()).to.be.revertedWith("Round not open for join");
      await fc2.connect(owner).openRoundForJoin(0);
      await fc2.connect(alice).joinCamp();
      expect((await fc2.participants(0, alice.address)).hasStaked).to.equal(true);
    });
  });

  describe("第 0 期：3 人参加，2 人完成，1 人失败", function () {
    it("两人各得 150 USDC，合约余数可由群主提走", async function () {
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await fitCamp.connect(carol).joinCamp();

      const campAddress = await fitCamp.getAddress();
      expect(await usdc.balanceOf(campAddress)).to.equal(STAKE_AMOUNT * 3n);

      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }

      const aliceUser = await fitCamp.participants(ROUND_ID, alice.address);
      const carolUser = await fitCamp.participants(ROUND_ID, carol.address);
      expect(aliceUser.checkInCount).to.equal(7n);
      expect(aliceUser.hasStaked).to.equal(true);
      expect(carolUser.checkInCount).to.equal(0n);

      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);

      const aliceBefore = await usdc.balanceOf(alice.address);
      const bobBefore = await usdc.balanceOf(bob.address);

      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(bob).settleAndWithdraw(ROUND_ID);

      const rewardPerWinner = 150n * 10n ** 6n;
      expect((await usdc.balanceOf(alice.address)) - aliceBefore).to.equal(rewardPerWinner);
      expect((await usdc.balanceOf(bob.address)) - bobBefore).to.equal(rewardPerWinner);
      expect(await usdc.balanceOf(campAddress)).to.equal(0n);
    });

    it("失败者调用 settleAndWithdraw(0) 应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await fitCamp.connect(carol).joinCamp();
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);

      await expect(
        fitCamp.connect(carol).settleAndWithdraw(ROUND_ID)
      ).to.be.revertedWith("Not eligible");
    });
  });

  describe("除法余数：群主可提走", function () {
    it("4 人参加 3 人完成，余数 1 单位，群主 withdrawDust 后合约余额为 0", async function () {
      const dave = (await ethers.getSigners())[4];
      await usdc.connect(dave).mint(dave.address, 200n * 10n ** 6n);
      await usdc.connect(dave).approve(await fitCamp.getAddress(), ethers.MaxUint256);

      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await fitCamp.connect(carol).joinCamp();
      await fitCamp.connect(dave).joinCamp();

      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
        await fitCamp.connect(owner).checkIn(carol.address);
      }

      const campAddress = await fitCamp.getAddress();
      const totalPool = STAKE_AMOUNT * 4n;
      expect(await usdc.balanceOf(campAddress)).to.equal(totalPool);

      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);

      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(bob).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(carol).settleAndWithdraw(ROUND_ID);

      const rewardPerWinner = await fitCamp.rewardPerWinner(ROUND_ID);
      expect(rewardPerWinner).to.equal(133_333_333n);
      const dust = totalPool - rewardPerWinner * 3n;
      expect(dust).to.equal(1n);
      expect(await usdc.balanceOf(campAddress)).to.equal(dust);

      const ownerBefore = await usdc.balanceOf(owner.address);
      await fitCamp.connect(owner).withdrawDust(ROUND_ID);
      expect(await usdc.balanceOf(campAddress)).to.equal(0n);
      expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore + dust);
    });
  });

  describe("群主主动结算 settleRound", function () {
    it("群主先 settleRound 后用户再提现，结果与用户先提现触发结算一致", async function () {
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await fitCamp.connect(carol).joinCamp();
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);

      await fitCamp.connect(owner).settleRound(ROUND_ID);
      expect(await fitCamp.isSettled(ROUND_ID)).to.equal(true);
      expect(await fitCamp.winnersCount(ROUND_ID)).to.equal(2n);
      expect(await fitCamp.rewardPerWinner(ROUND_ID)).to.equal(150n * 10n ** 6n);

      const aliceBefore = await usdc.balanceOf(alice.address);
      const bobBefore = await usdc.balanceOf(bob.address);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(bob).settleAndWithdraw(ROUND_ID);
      expect((await usdc.balanceOf(alice.address)) - aliceBefore).to.equal(150n * 10n ** 6n);
      expect((await usdc.balanceOf(bob.address)) - bobBefore).to.equal(150n * 10n ** 6n);
    });
  });

  describe("多期：开启新一期", function () {
    it("第 0 期结算并提走余数后，群主可 startNewRound，第 1 期可参加", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      const campAddress = await fitCamp.getAddress();
      if (await usdc.balanceOf(campAddress) > 0n) {
        await fitCamp.connect(owner).withdrawDust(ROUND_ID);
      }
      expect(await usdc.balanceOf(campAddress)).to.equal(0n);

      await fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS);
      expect(await fitCamp.currentRoundId()).to.equal(1n);
      expect(await fitCamp.roundEndTime(1)).to.gt(endTime);

      await fitCamp.connect(bob).joinCamp();
      const bobUser = await fitCamp.participants(1, bob.address);
      expect(bobUser.hasStaked).to.equal(true);
    });

    it("群主不提现余数也可 startNewRound，余数滚入下一期奖金池", async function () {
      const dave = (await ethers.getSigners())[4];
      await usdc.connect(dave).mint(dave.address, 200n * 10n ** 6n);
      await usdc.connect(dave).approve(await fitCamp.getAddress(), ethers.MaxUint256);
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await fitCamp.connect(carol).joinCamp();
      await fitCamp.connect(dave).joinCamp();
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
        await fitCamp.connect(owner).checkIn(carol.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(bob).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(carol).settleAndWithdraw(ROUND_ID);
      const campAddress = await fitCamp.getAddress();
      const dust = await usdc.balanceOf(campAddress);
      expect(dust).to.equal(1n);

      await fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS);
      expect(await fitCamp.currentRoundId()).to.equal(1n);
      expect(await usdc.balanceOf(campAddress)).to.equal(dust);
    });
  });

  describe("Fit NFT", function () {
    it("优胜者可领取当期 Fit NFT，每期每人最多领 1 个", async function () {
      const FitNFT = await ethers.getContractFactory("FitNFT");
      const fitNFT = await FitNFT.deploy(await fitCamp.getAddress());
      await fitNFT.waitForDeployment();
      await fitCamp.setFitNFT(await fitNFT.getAddress());

      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);

      expect(await fitNFT.balanceOf(alice.address)).to.equal(0n);
      await fitCamp.connect(alice).claimFitNFT(ROUND_ID);
      expect(await fitNFT.balanceOf(alice.address)).to.equal(1n);
      expect(await fitNFT.roundOfToken(1)).to.equal(ROUND_ID);
      expect(await fitCamp.hasClaimedFitNFT(ROUND_ID, alice.address)).to.equal(true);
      expect(await fitCamp.claimedFitNFTTokenId(ROUND_ID, alice.address)).to.equal(1n);

      await fitCamp.connect(bob).claimFitNFT(ROUND_ID);
      expect(await fitNFT.balanceOf(bob.address)).to.equal(1n);
      expect(await fitNFT.roundOfToken(2)).to.equal(ROUND_ID);

      await expect(fitCamp.connect(alice).claimFitNFT(ROUND_ID)).to.be.revertedWith("Already claimed");
    });
  });
});

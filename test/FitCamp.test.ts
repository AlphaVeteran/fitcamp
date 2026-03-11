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

  describe("多期：无人参加时不增加期数", function () {
    it("开启新一期后无人参加，再新开一期时期数不增加，只重置当前期结束时间", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime0 = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime0 + 1n);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      const campAddress = await fitCamp.getAddress();
      if (await usdc.balanceOf(campAddress) > 0n) {
        await fitCamp.connect(owner).withdrawDust(ROUND_ID);
      }
      await fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS);
      expect(await fitCamp.currentRoundId()).to.equal(1n);
      const endTime1Before = await fitCamp.roundEndTime(1);
      await time.increaseTo(endTime1Before + 1n);
      await fitCamp.connect(owner).settleRoundWithNoWinners(1);
      if (await usdc.balanceOf(campAddress) > 0n) {
        await fitCamp.connect(owner).withdrawDust(1);
      }
      await fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS);
      expect(await fitCamp.currentRoundId()).to.equal(1n);
      const endTime1After = await fitCamp.roundEndTime(1);
      expect(endTime1After).to.gt(endTime1Before);
      expect(await fitCamp.roundOpenForJoin(1)).to.equal(true);
      await fitCamp.connect(bob).joinCamp();
      const bobUser = await fitCamp.participants(1, bob.address);
      expect(bobUser.hasStaked).to.equal(true);
    });
  });

  describe("边界与安全：权限", function () {
    it("非 owner 调用 openRoundForJoin / checkIn / settleRound / withdrawDust / settleRoundWithNoWinners / startNewRound / setFitNFT 应 revert", async function () {
      const notOwner = alice;
      await expect(fitCamp.connect(notOwner).openRoundForJoin(0)).to.be.revertedWithCustomError(
        fitCamp,
        "OwnableUnauthorizedAccount"
      );
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      await expect(fitCamp.connect(notOwner).checkIn(alice.address)).to.be.revertedWithCustomError(
        fitCamp,
        "OwnableUnauthorizedAccount"
      );
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(notOwner).settleRound(ROUND_ID)).to.be.revertedWithCustomError(
        fitCamp,
        "OwnableUnauthorizedAccount"
      );
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await expect(fitCamp.connect(notOwner).withdrawDust(ROUND_ID)).to.be.revertedWithCustomError(
        fitCamp,
        "OwnableUnauthorizedAccount"
      );
      await fitCamp.connect(bob).settleAndWithdraw(ROUND_ID);
      await fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS);
      const endTime1 = await fitCamp.roundEndTime(1);
      await time.increaseTo(endTime1 + 1n);
      await expect(
        fitCamp.connect(notOwner).settleRoundWithNoWinners(1)
      ).to.be.revertedWithCustomError(fitCamp, "OwnableUnauthorizedAccount");
      await fitCamp.connect(owner).settleRoundWithNoWinners(1);
      await expect(
        fitCamp.connect(notOwner).startNewRound(CHALLENGE_DAYS)
      ).to.be.revertedWithCustomError(fitCamp, "OwnableUnauthorizedAccount");
      const FitNFT = await ethers.getContractFactory("FitNFT");
      const nft = await FitNFT.deploy(await fitCamp.getAddress());
      await nft.waitForDeployment();
      await expect(
        fitCamp.connect(notOwner).setFitNFT(await nft.getAddress())
      ).to.be.revertedWithCustomError(fitCamp, "OwnableUnauthorizedAccount");
    });
  });

  describe("边界与安全：时间与期数", function () {
    it("openRoundForJoin 对不存在的期 (_roundId > currentRoundId) 应 revert", async function () {
      await expect(fitCamp.connect(owner).openRoundForJoin(1)).to.be.revertedWith(
        "Round does not exist"
      );
    });

    it("openRoundForJoin 对已结束的期应 revert", async function () {
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).openRoundForJoin(ROUND_ID)).to.be.revertedWith(
        "Round already ended"
      );
    });

    it("joinCamp 在当期结束后应 revert", async function () {
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(alice).joinCamp()).to.be.revertedWith("Round ended");
    });

    it("checkIn 在当期结束后应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).checkIn(alice.address)).to.be.revertedWith(
        "Round over"
      );
    });

    it("settleRound 在期未结束时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await expect(fitCamp.connect(owner).settleRound(ROUND_ID)).to.be.revertedWith(
        "Round not ended"
      );
    });

    it("settleAndWithdraw 在期未结束时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await expect(fitCamp.connect(alice).settleAndWithdraw(ROUND_ID)).to.be.revertedWith(
        "Round still active"
      );
    });

    it("startNewRound 当前期未结束时应 revert", async function () {
      await expect(fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS)).to.be.revertedWith(
        "Current round not ended"
      );
    });

    it("startNewRound 当前期未结算时应 revert", async function () {
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS)).to.be.revertedWith(
        "Current round not settled"
      );
    });

    it("startNewRound 有优胜者未提现时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await expect(fitCamp.connect(owner).startNewRound(CHALLENGE_DAYS)).to.be.revertedWith(
        "Not all winners withdrawn"
      );
    });
  });

  describe("边界与安全：状态与重复", function () {
    it("同一期重复 joinCamp 应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await expect(fitCamp.connect(alice).joinCamp()).to.be.revertedWith(
        "Already joined this round"
      );
    });

    it("优胜者重复 settleAndWithdraw 应 revert (Invalid withdrawal)", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await expect(fitCamp.connect(alice).settleAndWithdraw(ROUND_ID)).to.be.revertedWith(
        "Invalid withdrawal"
      );
    });

    it("settleRound 已结算后再调应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await expect(fitCamp.connect(owner).settleRound(ROUND_ID)).to.be.revertedWith(
        "Already settled"
      );
    });

    it("settleRound 当 0 个优胜者时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).settleRound(ROUND_ID)).to.be.revertedWith(
        "No winners"
      );
    });

    it("settleRoundWithNoWinners 当有优胜者时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(
        fitCamp.connect(owner).settleRoundWithNoWinners(ROUND_ID)
      ).to.be.revertedWith("There are winners");
    });

    it("withdrawDust 未结算时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).withdrawDust(ROUND_ID)).to.be.revertedWith(
        "Round not settled"
      );
    });

    it("withdrawDust 有优胜者未提完时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      for (let i = 0; i < 7; i++) {
        await fitCamp.connect(owner).checkIn(alice.address);
        await fitCamp.connect(owner).checkIn(bob.address);
      }
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await expect(fitCamp.connect(owner).withdrawDust(ROUND_ID)).to.be.revertedWith(
        "Not all winners withdrawn"
      );
    });

    it("withdrawDust 合约余额为 0 时应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      await expect(fitCamp.connect(owner).withdrawDust(ROUND_ID)).to.be.revertedWith(
        "No dust"
      );
    });
  });

  describe("边界与安全：USDC 授权与余额", function () {
    it("余额不足时 joinCamp 应 revert", async function () {
      const poor = (await ethers.getSigners())[4];
      await usdc.connect(poor).approve(await fitCamp.getAddress(), ethers.MaxUint256);
      await expect(fitCamp.connect(poor).joinCamp()).to.be.reverted;
    });

    it("授权不足时 joinCamp 应 revert", async function () {
      await usdc.connect(alice).approve(await fitCamp.getAddress(), 0n);
      await expect(fitCamp.connect(alice).joinCamp()).to.be.reverted;
    });

    it("授权金额小于 100 USDC 时 joinCamp 应 revert", async function () {
      await usdc.connect(alice).approve(await fitCamp.getAddress(), STAKE_AMOUNT - 1n);
      await expect(fitCamp.connect(alice).joinCamp()).to.be.reverted;
    });
  });

  describe("边界与安全：人数与金额", function () {
    it("0 人参加时群主调用 settleRound 应 revert (No winners)", async function () {
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(owner).settleRound(ROUND_ID)).to.be.revertedWith(
        "No winners"
      );
    });

    it("1 人参加且达标时获得全部奖池", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const campAddress = await fitCamp.getAddress();
      expect(await usdc.balanceOf(campAddress)).to.equal(STAKE_AMOUNT);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      const aliceBefore = await usdc.balanceOf(alice.address);
      await fitCamp.connect(alice).settleAndWithdraw(ROUND_ID);
      expect((await usdc.balanceOf(alice.address)) - aliceBefore).to.equal(STAKE_AMOUNT);
      expect(await usdc.balanceOf(campAddress)).to.equal(0n);
    });
  });

  describe("边界与安全：Fit NFT", function () {
    it("Fit NFT 未设置时 claimFitNFT 应 revert", async function () {
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await expect(fitCamp.connect(alice).claimFitNFT(ROUND_ID)).to.be.revertedWith(
        "FitNFT not set"
      );
    });

    it("未达标者 claimFitNFT 应 revert", async function () {
      const FitNFT = await ethers.getContractFactory("FitNFT");
      const fitNFT = await FitNFT.deploy(await fitCamp.getAddress());
      await fitNFT.waitForDeployment();
      await fitCamp.setFitNFT(await fitNFT.getAddress());
      await fitCamp.connect(alice).joinCamp();
      await fitCamp.connect(bob).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await fitCamp.connect(owner).settleRound(ROUND_ID);
      await expect(fitCamp.connect(bob).claimFitNFT(ROUND_ID)).to.be.revertedWith(
        "Not a winner"
      );
    });

    it("未结算时 claimFitNFT 应 revert", async function () {
      const FitNFT = await ethers.getContractFactory("FitNFT");
      const fitNFT = await FitNFT.deploy(await fitCamp.getAddress());
      await fitNFT.waitForDeployment();
      await fitCamp.setFitNFT(await fitNFT.getAddress());
      await fitCamp.connect(alice).joinCamp();
      for (let i = 0; i < 7; i++) await fitCamp.connect(owner).checkIn(alice.address);
      const endTime = await fitCamp.roundEndTime(ROUND_ID);
      await time.increaseTo(endTime + 1n);
      await expect(fitCamp.connect(alice).claimFitNFT(ROUND_ID)).to.be.revertedWith(
        "Round not settled"
      );
    });
  });
});

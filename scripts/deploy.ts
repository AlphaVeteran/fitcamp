import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署账号地址:", deployer.address);
  console.log(
    "账号 ETH 余额:",
    (await deployer.provider!.getBalance(deployer.address)).toString()
  );

  // 1. 部署 MockUSDC（测试用 USDC，6 位小数）
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC 部署地址:", usdcAddress);

  // 2. 部署 FitCamp（第 0 期天数 = 部署时参数；测试网想快速跑通可设 DURATION_DAYS=1）
  const durationDays = process.env.DURATION_DAYS ? parseInt(process.env.DURATION_DAYS, 10) : 7;
  const FitCamp = await ethers.getContractFactory("FitCamp");
  const fitCamp = await FitCamp.deploy(usdcAddress, durationDays);
  await fitCamp.waitForDeployment();
  const fitCampAddress = await fitCamp.getAddress();
  console.log("FitCamp 部署地址:", fitCampAddress, "（第 0 期", durationDays, "天）");

  // 3. 部署 FitNFT，并设为 FitCamp 的 NFT 合约
  const FitNFT = await ethers.getContractFactory("FitNFT");
  const fitNFT = await FitNFT.deploy(fitCampAddress);
  await fitNFT.waitForDeployment();
  const fitNFTAddress = await fitNFT.getAddress();
  console.log("FitNFT 部署地址:", fitNFTAddress);
  const setTx = await fitCamp.setFitNFT(fitNFTAddress);
  await setTx.wait();
  console.log("FitCamp.setFitNFT 已设置");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


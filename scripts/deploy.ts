import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const WEB_DIR = path.join(__dirname, "..", "web");
const MINT_USDC_DEPLOYER = 1000n * 10n ** 6n; // 1000 USDC 给部署者自测

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider!.getNetwork();
  const chainId = Number(network.chainId);
  const isBaseSepolia = chainId === 84532;

  const provider = deployer.provider!;
  let nextNonce = await provider.getTransactionCount(deployer.address, "latest");

  console.log("部署账号地址:", deployer.address);
  console.log(
    "账号 ETH 余额:",
    (await provider.getBalance(deployer.address)).toString()
  );

  // 1. 部署 MockUSDC（测试用 USDC，6 位小数）
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy({ nonce: nextNonce++ });
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC 部署地址:", usdcAddress);

  // 2. 部署 FitCamp（第 0 期天数 = 部署时参数；测试网想快速跑通可设 DURATION_DAYS=1）
  const durationDays = process.env.DURATION_DAYS ? parseInt(process.env.DURATION_DAYS, 10) : 7;
  const FitCamp = await ethers.getContractFactory("FitCamp");
  const fitCamp = await FitCamp.deploy(usdcAddress, durationDays, { nonce: nextNonce++ });
  await fitCamp.waitForDeployment();
  const fitCampAddress = await fitCamp.getAddress();
  console.log("FitCamp 部署地址:", fitCampAddress, "（第 0 期", durationDays, "天）");

  // 3. 部署 FitNFT，并设为 FitCamp 的 NFT 合约
  const FitNFT = await ethers.getContractFactory("FitNFT");
  const fitNFT = await FitNFT.deploy(fitCampAddress, { nonce: nextNonce++ });
  await fitNFT.waitForDeployment();
  const fitNFTAddress = await fitNFT.getAddress();
  console.log("FitNFT 部署地址:", fitNFTAddress);
  const setTx = await fitCamp.setFitNFT(fitNFTAddress, { nonce: nextNonce++ });
  await setTx.wait();
  console.log("FitCamp.setFitNFT 已设置");

  // 4. Base Sepolia：给部署者 mint USDC 并授权 FitCamp，便于自测；并写入 web/addresses.base-sepolia.json
  if (isBaseSepolia) {
    const mintTx = await usdc.mint(deployer.address, MINT_USDC_DEPLOYER, { nonce: nextNonce++ });
    await mintTx.wait();
    const approveTx = await usdc.connect(deployer).approve(fitCampAddress, ethers.MaxUint256, { nonce: nextNonce++ });
    await approveTx.wait();
    console.log("已向部署者铸造 1000 USDC 并授权 FitCamp，可直接参与自测");

    if (!fs.existsSync(WEB_DIR)) fs.mkdirSync(WEB_DIR, { recursive: true });
    const addressesPath = path.join(WEB_DIR, "addresses.base-sepolia.json");
    fs.writeFileSync(
      addressesPath,
      JSON.stringify(
        {
          fitCamp: fitCampAddress,
          mockUsdc: usdcAddress,
          fitNFT: fitNFTAddress,
          chainId: 84532,
        },
        null,
        2
      )
    );
    console.log("已写入", addressesPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DURATION_DAYS = 7;
const MINT_USDC = 1000n * 10n ** 6n; // 1000 USDC per user
const WEB_DIR = path.join(__dirname, "..", "web");

async function main() {
  const signers = await ethers.getSigners();
  const [K, A, B, C] = signers.slice(0, 4);

  console.log("群主 K:", K.address);
  console.log("用户 A:", A.address);
  console.log("用户 B:", B.address);
  console.log("用户 C:", C.address);

  // 1. Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC 部署:", usdcAddress);

  // 2. Deploy FitCamp
  const FitCamp = await ethers.getContractFactory("FitCamp");
  const fitCamp = await FitCamp.deploy(usdcAddress, DURATION_DAYS);
  await fitCamp.waitForDeployment();
  const fitCampAddress = await fitCamp.getAddress();
  console.log("FitCamp 部署:", fitCampAddress);

  // 3. Deploy FitNFT，FitCamp 为 minter
  const FitNFT = await ethers.getContractFactory("FitNFT");
  const fitNFT = await FitNFT.deploy(fitCampAddress);
  await fitNFT.waitForDeployment();
  const fitNFTAddress = await fitNFT.getAddress();
  console.log("FitNFT 部署:", fitNFTAddress);
  const setTx = await fitCamp.setFitNFT(fitNFTAddress);
  await setTx.wait();
  console.log("FitCamp.setFitNFT 已设置");

  const stakeAmount = 100n * 10n ** 6n;
  for (const account of [K, A, B, C]) {
    await usdc.connect(account).mint(account.address, MINT_USDC);
    await usdc.connect(account).approve(fitCampAddress, ethers.MaxUint256);
  }
  console.log("已向 K、A、B、C 各铸造 1000 USDC 并授权 FitCamp");

  if (!fs.existsSync(WEB_DIR)) fs.mkdirSync(WEB_DIR, { recursive: true });

  const fitCampArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts/contracts/FitCamp.sol/FitCamp.json"),
      "utf8"
    )
  );
  const usdcArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts/contracts/MockUSDC.sol/MockUSDC.json"),
      "utf8"
    )
  );
  const fitNFTArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts/contracts/FitNFT.sol/FitNFT.json"),
      "utf8"
    )
  );

  fs.writeFileSync(
    path.join(WEB_DIR, "addresses.json"),
    JSON.stringify(
      {
        fitCamp: fitCampAddress,
        mockUsdc: usdcAddress,
        fitNFT: fitNFTAddress,
        chainId: 31337,
        accounts: {
          K: K.address,
          A: A.address,
          B: B.address,
          C: C.address,
        },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(WEB_DIR, "abis.json"),
    JSON.stringify({
      FitCamp: fitCampArtifact.abi,
      MockUSDC: usdcArtifact.abi,
      FitNFT: fitNFTArtifact.abi,
    })
  );

  console.log("已写入 web/addresses.json 与 web/abis.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

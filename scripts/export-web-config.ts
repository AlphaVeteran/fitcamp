/**
 * 导出 web/abis.json，供静态部署（如 GitHub Pages / Vercel）使用。
 * 先执行 npm run compile，再运行本脚本。
 * 用法: npx hardhat run scripts/export-web-config.ts
 */
import * as fs from "fs";
import * as path from "path";

const WEB_DIR = path.join(__dirname, "..", "web");

function main() {
  const fitCampPath = path.join(__dirname, "..", "artifacts/contracts/FitCamp.sol/FitCamp.json");
  const usdcPath = path.join(__dirname, "..", "artifacts/contracts/MockUSDC.sol/MockUSDC.json");
  const fitNFTPath = path.join(__dirname, "..", "artifacts/contracts/FitNFT.sol/FitNFT.json");
  if (!fs.existsSync(fitCampPath) || !fs.existsSync(usdcPath) || !fs.existsSync(fitNFTPath)) {
    console.error("请先执行: npm run compile");
    process.exit(1);
  }
  const fitCampArtifact = JSON.parse(fs.readFileSync(fitCampPath, "utf8"));
  const usdcArtifact = JSON.parse(fs.readFileSync(usdcPath, "utf8"));
  const fitNFTArtifact = JSON.parse(fs.readFileSync(fitNFTPath, "utf8"));
  if (!fs.existsSync(WEB_DIR)) fs.mkdirSync(WEB_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(WEB_DIR, "abis.json"),
    JSON.stringify({
      FitCamp: fitCampArtifact.abi,
      MockUSDC: usdcArtifact.abi,
      FitNFT: fitNFTArtifact.abi,
    })
  );
  console.log("已写入 web/abis.json（可用于静态站点 / 测试网演示）");

  const baseSepoliaPath = path.join(WEB_DIR, "addresses.base-sepolia.json");
  if (!fs.existsSync(baseSepoliaPath)) {
    fs.writeFileSync(
      baseSepoliaPath,
      JSON.stringify(
        {
          fitCamp: "0x0000000000000000000000000000000000000000",
          mockUsdc: "0x0000000000000000000000000000000000000000",
          fitNFT: "0x0000000000000000000000000000000000000000",
          chainId: 84532,
        },
        null,
        2
      )
    );
    console.log("已创建 web/addresses.base-sepolia.json 占位，请替换为你在 Base Sepolia 上部署的合约地址。");
  }
}

main();

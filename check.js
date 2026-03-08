require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error("请在 .env 中配置 BASE_SEPOLIA_RPC_URL 和 PRIVATE_KEY");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;

  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log("网络: Base Sepolia");
  console.log("地址:", address);
  console.log("余额 (ETH):", balanceEth);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

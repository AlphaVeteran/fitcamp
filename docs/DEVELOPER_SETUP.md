# FitCamp — 开发者本地部署说明

本文说明如何在本地运行 FitCamp：启动本地链、部署合约、初始化测试数据并启动前端。

---

## 环境要求

- **Node.js**：建议 v18 或以上  
- **npm**：随 Node 安装即可  

---

## 1. 安装依赖

在项目根目录执行：

```bash
npm install
```

---

## 2. 编译合约

```bash
npm run compile
```

会编译 `contracts/FitCamp.sol` 与 `contracts/MockUSDC.sol`，输出到 `artifacts/`。

---

## 3. 运行测试（可选）

```bash
npm run test
```

使用 Hardhat 本地网络执行 `test/FitCamp.test.ts`，验证多期、结算、提现、无获胜者结算、开启新一期等逻辑。

---

## 4. 启动本地链

在**第一个终端**中保持运行：

```bash
npm run node
```

即执行 `hardhat node`，默认 RPC 为 `http://127.0.0.1:8545`，链 ID 为 31337。  
**不要关闭此终端**，后续部署与前端都会连到该节点。

---

## 5. 部署合约并初始化（init-local）

在**第二个终端**中，在项目根目录执行：

```bash
npm run init-local
```

该脚本会：

1. 连接 `localhost` 网络（`http://127.0.0.1:8545`）
2. 部署 **MockUSDC**（6 位小数测试用 USDC）
3. 部署 **FitCamp**（传入 MockUSDC 地址与当期天数 7 天）
4. 为 Hardhat 默认前 4 个账户（K、A、B、C）各铸造 **1000 USDC** 并授权 FitCamp
5. 将合约地址与 ABI 写入 **`web/addresses.json`** 和 **`web/abis.json`**

若本地链未启动，会报错连接失败，请先完成第 4 步。

---

## 6. 启动前端

在**第三个终端**（或在 init-local 执行成功的同一终端）中：

```bash
npm run serve
```

会启动 `web/server.js`：

- **前端页面**：<http://localhost:3000>  
- **RPC 代理**：`POST /rpc` 转发到 `http://127.0.0.1:8545`  
- **ethers.js**：从 `node_modules/ethers` 提供，路径 `/vendor/ethers.umd.min.js`  

浏览器打开 <http://localhost:3000> 即可使用 FitCamp 界面。前端通过同源 `/rpc` 访问本地链，无需配置 MetaMask。

---

## 7. 使用流程小结

1. **终端 1**：`npm run node`（保持运行）  
2. **终端 2**：`npm run init-local`（每次重开本地链后需重新执行一次）  
3. **终端 3**：`npm run serve`  
4. 浏览器访问 **http://localhost:3000**，选择「当前用户」K / A / B / C 进行操作。  

详细用户操作见 **[用户说明](./USER_GUIDE.md)**。

---

## 8. 部署到 Base Sepolia（可选）

若需在测试网运行：

1. **环境变量**：在项目根目录创建 `.env`，配置：
   - `PRIVATE_KEY`：部署账户私钥  
   - `BASE_SEPOLIA_RPC_URL`：Base Sepolia RPC（如从 Base 文档获取）  

2. **部署**：
   ```bash
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```
   脚本会部署 MockUSDC 和 FitCamp，并输出合约地址。**不会**自动 mint USDC 或写入 `web/addresses.json`，需自行：
   - 为 MockUSDC 铸造测试币  
   - 将 FitCamp / MockUSDC 地址与 Base Sepolia 的 chainId 写入前端配置（或扩展 `addresses.json` 的读取逻辑）  

3. **前端**：若仍用当前前端连接 Base Sepolia，需改为使用 Base Sepolia RPC 和 chainId（84532），并让用户用钱包连接该网络。当前 `app.js` 使用固定 Hardhat 私钥，仅适用于本地演示。

---

## 9. 项目结构简要

| 路径 | 说明 |
|------|------|
| `contracts/FitCamp.sol` | 打卡营主合约（多期、参加、打卡、结算、提现、余数、无获胜者结算、开启新一期） |
| `contracts/MockUSDC.sol` | 测试用 USDC（6 位小数、mint） |
| `scripts/deploy.ts` | 通用部署脚本（MockUSDC + FitCamp），可用于任意网络 |
| `scripts/init-local.ts` | 本地专用：部署 + mint + 写 `web/addresses.json`、`web/abis.json` |
| `web/server.js` | 静态资源 + `/rpc` 代理 + ethers 本地提供 |
| `web/index.html` / `web/app.js` | 前端页面与逻辑 |
| `web/addresses.json` | init-local 生成的合约地址（勿提交到生产） |
| `web/abis.json` | init-local 生成的 ABI |
| `hardhat.config.ts` | 网络配置（localhost、baseSepolia） |

---

## 10. 常见问题

- **页面提示「请先运行 npx hardhat node…」**  
  未执行 init-local 或 `web/addresses.json` / `web/abis.json` 不存在。先 `npm run node`，再在另一终端 `npm run init-local`，然后刷新页面。

- **could not decode result / BAD_DATA**  
  合约地址与当前链不一致（例如重启了 `hardhat node` 导致链重置）。重新执行 `npm run init-local` 并刷新页面。

- **RPC 不可达 / 502**  
  未运行 `npm run node`，或端口 8545 被占用。确保终端 1 中 node 在运行。

- **端口 3000 被占用**  
  可修改 `web/server.js` 中的 `PORT`，或关闭占用 3000 端口的程序。

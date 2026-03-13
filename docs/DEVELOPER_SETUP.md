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

## 7b. 本地用钱包连接（模拟测试网操作）

若希望在本地链上**用 MetaMask/Rabby 等钱包**操作（与测试网一致：每笔交易在钱包中确认），可：

1. **在钱包中添加「Hardhat Local」网络**  
   - 链 ID：`31337`  
   - RPC URL：`http://localhost:3000/rpc`（须先 `npm run serve`，且与打开前端的地址一致）或 `http://127.0.0.1:8545`  
   - 若本页已打开，点击「连接钱包（模拟测试网）」时，钱包会提示添加该网络，按提示添加即可。  
   - **MetaMask / Rabby / Rainbow 的详细添加步骤**见下方小节「在 MetaMask / Rabby / Rainbow 中添加 Hardhat 本地网络」。

2. **（可选）导入 Hardhat 测试账户**  
   - init-local 使用的账户与 Hardhat 默认账户一致（见 [Hardhat 文档](https://hardhat.org/hardhat-network/docs/reference#accounts)）。  
   - 将其中任一账户的私钥导入钱包后，该账户上已有 1000 USDC 和 FitCamp 授权，可直接缴纳定金、打卡、提现。  
   - 不导入也可：连接任意钱包地址后，需先由已导入账户给该地址转 USDC 并在 MockUSDC 上授权，或仅用该地址作为「群主」查看界面（若该地址不是合约 owner 则无法执行群主操作）。

3. **在页面点击「连接钱包（模拟测试网）」**  
   - 同意连接后，钱包会切换到链 31337（若无则提示添加网络）。  
   - 界面会显示「已连接: 0x…」，并隐藏下拉选账户；之后所有操作均通过当前连接的钱包签名，与测试网行为一致。

4. **断开**  
   - 点击「断开」可恢复为下拉选账户模式（无需钱包）。

### 在 MetaMask / Rabby / Rainbow 中添加 Hardhat 本地网络

本地链参数（来自 `hardhat.config.ts`）：

| 项目 | 值 |
|------|-----|
| **网络名称** | Hardhat Local（可自定） |
| **RPC URL** | `http://127.0.0.1:8545` |
| **Chain ID** | `31337` |
| **货币符号** | ETH（可选） |

若仅从 `http://localhost:3000` 访问前端，也可将 RPC 填为 **`http://localhost:3000/rpc`**（与页面同源，经 serve 代理到 8545）。否则用 `http://127.0.0.1:8545` 即可。

#### MetaMask

1. 点击顶部**当前网络名** → **「添加网络」** → **「手动添加网络」**。
2. 填写：网络名称 `Hardhat Local`，RPC URL `http://127.0.0.1:8545`，Chain ID `31337`，货币符号 `ETH`；区块浏览器可留空。
3. **保存**，并切换到 **Hardhat Local**。

#### Rabby

1. 点击左上角**当前网络**（或底部「网络」）→ **「添加网络」** / **「自定义网络」** → **「手动添加」**（若有）。
2. 填写：网络名称 `Hardhat Local`，RPC URL `http://127.0.0.1:8545`，Chain ID `31337`，货币符号 `ETH`。
3. 保存并切换到该网络。

#### Rainbow

- **手机 App**：不支持手动添加自定义链；只能在使用 dApp 时由页面通过 `wallet_addEthereumChain` 请求添加。
- **浏览器扩展**：点击扩展 **⋮** → **Settings** → **Networks** → **+ Add Custom Network**（或类似入口），填写上述名称、RPC、Chain ID、符号后保存并切换。

若需使用**第二条本地链**（`localhost2`），在钱包中再添加一条：RPC `http://127.0.0.1:8546`，Chain ID `31338`，步骤同上。

---

## 7c. 本地多期 + 三用户钱包测试准备

若要**在本地网用钱包**模拟「群主 + 2 个会员」并跑多期（第 1 期 → 结束打卡 → 第 2 期 …），需要**多个互不干扰的连接会话**（每个会话一个钱包账户）。

### 需要准备

| 项目 | 数量 | 说明 |
|------|------|------|
| **浏览器（或独立配置）** | **3 个** | 每个用户一个窗口，互不共享「连接钱包」状态。 |
| **钱包账户** | **3 个** | 群主 1 个 + 会员 2 个（如 Alice、Bob），每个账户需能单独连接页面。 |

- **浏览器**：可用 3 个不同浏览器（如 Chrome、Edge、Firefox），或同一浏览器的 3 个**独立配置文件/无痕窗口**（部分钱包在无痕下需单独安装）。  
- **钱包**：  
  - **方案 A**：3 个不同钱包应用（如 Chrome 用 MetaMask、Edge 用 Rainbow、Firefox 用 Rabby），各导入 1 个 Hardhat 测试账户。  
  - **方案 B**：同一钱包（如 MetaMask）在 3 个**不同浏览器配置文件**里各装一份，每个配置文件里导入 1 个 Hardhat 账户（群主 / Alice / Bob）。

### 账户与私钥（init-local 已给这些地址发 USDC）

| 角色 | 地址（前 6 + 后 4） | 私钥（仅本地/测试用） |
|------|---------------------|------------------------|
| 群主 owner | 0xf39F…2266 | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 会员 Alice | 0x7099…79C8 | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 会员 Bob   | 0x3C44…93BC | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

（更多账户见 [Hardhat 默认账户](https://hardhat.org/hardhat-network/docs/reference#accounts) 或项目内 `web/app.js` 中的 `HARDHAT_PRIVATE_KEYS`。）

### 操作步骤概要

1. **终端**：`npm run node` → `npm run init-local` → `npm run serve`。  
2. **浏览器 1（群主）**：打开 http://localhost:3000 → 点「连接钱包（模拟测试网）」→ 连接群主账户 → 开始打卡、结束打卡、开启下一期、群主提现。  
3. **浏览器 2（Alice）**：**另开**一个浏览器或配置文件，打开 http://localhost:3000 → 连接 Alice 账户 → 缴纳定金、**点击「打卡」自己确认打卡**、提现。  
4. **浏览器 3（Bob）**：再开一个浏览器或配置文件，打开 http://localhost:3000 → 连接 Bob 账户 → 缴纳定金、打卡、提现。  
5. **多期**：群主在浏览器 1 里「结束打卡」→「开启下一期」；Alice/Bob 在各自窗口刷新或继续操作即可参与新一期（页面会显示「第 2 期」等）。

### 小结

- **3 个浏览器（或 3 个独立配置）** + **3 个钱包账户**（群主、Alice、Bob），即可在本地网用钱包完整跑多期、三用户流程。

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

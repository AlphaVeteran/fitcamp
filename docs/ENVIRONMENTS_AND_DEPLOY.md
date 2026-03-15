# FitCamp 从开发到主网：环境与配置说明

本文说明智能合约从**开发 → 测试 → 测试网部署 → 主网部署**会经过哪些环境、每步要做哪些配置和测试，以及**每次更换环境时需要改哪些部分**（尽量少改代码、多用配置）。

---

## 一、环境阶段总览

| 阶段       | 用途           | 链/网络              | 主要配置与测试 |
|------------|----------------|----------------------|----------------|
| 开发       | 本地调试合约与前端 | 本地链 localhost:8545 | Hardhat node + init-local + serve |
| 测试       | 自动化验证逻辑   | Hardhat 内置临时网络   | `npm run test`（CI 也跑） |
| 测试网部署 | 公开演示、真实钱包 | Base Sepolia          | .env + deploy + addresses.base-sepolia.json |
| 主网部署   | 正式上线         | Base Mainnet（等）    | 主网 RPC、真实 USDC、前端主网地址文件 |

合约代码在开发/测试/测试网阶段**通常不改**；换环境主要改**配置**和**前端用的地址/链**。

---

## 二、各阶段要做的事

### 1. 开发环境（本地链）

- **目的**：本机跑一条链，部署合约、用前端 K/A/B/C 账户操作。
- **配置**：
  - 无需 `.env`（Hardhat node 用默认账户）。
  - `hardhat.config.ts` 里已有 `localhost`（url: `http://127.0.0.1:8545`，chainId: 31337）。
- **操作**：
  1. 终端 1：`npm run node`
  2. 终端 2：`npm run init-local`（会写 `web/addresses.json`、`web/abis.json`，chainId 31337）
  3. 终端 3：`npm run serve`
  4. 浏览器打开 http://localhost:3000
- **测试**：可手动在页面操作；自动化测试用下一步的「测试环境」。

**换到本地时**：确保没有 `addresses.base-sepolia.json` 或前端优先用 `addresses.json`（当前逻辑是先请求 `addresses.json`，没有再测网）。

---

### 2. 测试环境（自动化测试）

- **目的**：每次改代码后跑一遍单元测试，保证逻辑正确；CI（GitHub Actions）也跑同一套。
- **配置**：
  - 不依赖 `.env`。
  - `npm run test` 使用 Hardhat 自带的临时网络（非 localhost），跑完即销毁。
- **操作**：
  - 本地：`npm run compile && npm run test`
  - CI：push/PR 到 main 时自动执行（见 `.github/workflows/test.yml`）。
- **测试内容**：`test/FitCamp.test.ts`（建群前不可报名、多期、结算、提现、无获胜者、Fit NFT、无人参加不增加期数等）。

**换环境时**：测试不依赖「当前是本地还是测试网」，无需改测试代码；只要在要部署的环境上再执行一次部署脚本即可。

---

### 3. 测试网部署（Base Sepolia）

- **目的**：在公网测试网部署合约，用 MetaMask 等真实钱包试用。
- **配置**：
  - **.env**（项目根目录，不要提交）：
    - `PRIVATE_KEY`：部署账户私钥
    - `BASE_SEPOLIA_RPC_URL`：Base Sepolia RPC（如 `https://sepolia.base.org`）
  - **hardhat.config.ts**：已有 `baseSepolia` 网络（chainId 84532），无需改。
- **操作**：
  1. `npm run compile`
  2. 部署（二选一）：
     - **默认 7 天**：`npx hardhat run scripts/deploy.ts --network baseSepolia`
     - **快速跑通第 0 期（1 天）**：`DURATION_DAYS=1 npx hardhat run scripts/deploy.ts --network baseSepolia`（第 0 期 1 天后即可结束打卡，你作为群主可尽快走通建群→报名→打卡→结束→开下一期）
  3. 部署到 Base Sepolia 时会**自动**：向部署者铸造 1000 USDC 并授权 FitCamp、写入 `web/addresses.base-sepolia.json`，无需再手动填地址。
  4. 前端用测试网时：先执行一次 `npm run export-web-config` 生成 `web/abis.json`（若尚未有）；`addresses.base-sepolia.json` 已由部署脚本写入。本地打开测试网页面时需**没有** `web/addresses.json`（临时移走或改名为 `addresses.json.bak`），再 `npm run serve` 打开 http://localhost:3000，即可加载测试网配置并「连接钱包」。

**期数规则（简化）**：第 0 期天数由**部署时**参数决定（脚本里 `DURATION_DAYS` 或环境变量）；第 1 期起由**开下一期**时页面「打卡天数」下拉决定。不在界面上做「设置当期天数」，避免部署逻辑与运行逻辑混在一起。

---

#### 3a. 部署到 Base Sepolia 并自己完成前三期测试（清单）

若你要**一个人**在 Base Sepolia 上部署并跑完**第 1～3 期**（含群主操作 + 可选以同一钱包参与当会员），按下面做即可，**无需改合约或前端业务代码**。

| 步骤 | 操作 |
|------|------|
| 1. 环境变量 | 项目根目录创建 `.env`，写 `PRIVATE_KEY=你的部署钱包私钥`、`BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`（或其它 Base Sepolia RPC）。 |
| 2. 编译 | `npm run compile` |
| 3. 导出 ABI（若还没有） | `npm run export-web-config`，确保有 `web/abis.json` |
| 4. 部署（建议第 0 期 1 天） | `DURATION_DAYS=1 npx hardhat run scripts/deploy.ts --network baseSepolia`。脚本会部署 MockUSDC / FitCamp / FitNFT、给部署者 mint 1000 USDC 并授权、写入 `web/addresses.base-sepolia.json`。 |
| 5. 本地打开测试网页 | 临时移走或重命名 `web/addresses.json`（避免前端优先用本地配置），再 `npm run serve`，浏览器打开 http://localhost:3000。页面会加载 `addresses.base-sepolia.json`，进入测试网模式。 |
| 6. 连接钱包 | 点「连接钱包 (Base Sepolia)」，钱包切到 Base Sepolia（chainId 84532）。当前账户应为部署者（群主），且有 1000 USDC。 |
| 7. 第 1 期（即合约第 0 期） | 点「开始打卡」开放报名 → 可选：同钱包点「缴纳打卡定金」当会员 → 群主可给会员「打卡」满 7 次 → **等 1 天**（真实时间）→ 点「结束打卡」→ 可选「群主提现」→ 点「新建 FitCamp」选「打卡天数」开启第 2 期。 |
| 8. 第 2、3 期 | 重复：开放报名 → 参与/打卡 → **等 1 天**（若你开下一期时选 1 天）→ 结束打卡 → 群主提现 → 开启下一期。每期开下一期时在「打卡天数」里选 1 / 7 / 28 天。 |

**说明**：测试网时间按链上时间走，不能像本地一样快进，所以每期至少要等所选天数。自测前三期若每期选 1 天，最少需约 3 天真实时间；若只验证流程，可只跑 1 期（第 0 期 1 天 + 结束打卡 + 开下一期）。

**换到测试网时**：  
- 改 **.env**（RPC、PRIVATE_KEY）和 **web/addresses.base-sepolia.json**（合约地址、chainId）。  
- 合约与前端业务代码可不改。

**RPC 报错（too many errors / rate limit）**：  
- 官方 `https://sepolia.base.org` 有频率限制，容易出现 “RPC endpoint returned too many errors”。  
- 在 **`web/addresses.base-sepolia.json`** 里增加字段 **`"rpcUrl"`**，改用备用 RPC，例如：  
  `"rpcUrl": "https://base-sepolia-rpc.publicnode.com"` 或 `"https://base-sepolia.drpc.org"`。  
- 保存后刷新页面，前端会使用该 RPC 读链数据；钱包仍连 Base Sepolia（chainId 84532），无需改网络。

---

### 4. 主网部署（如 Base Mainnet）

- **目的**：正式上线，用户使用真实 USDC 和主网。
- **配置**（需要新增）：
  - **hardhat.config.ts**：增加主网网络，例如：
    ```ts
    base: {
      url: process.env.BASE_MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
    ```
  - **.env**：增加 `BASE_MAINNET_RPC_URL`；主网部署建议用专门的钱包和私钥。
  - **合约/部署**：主网一般不用 MockUSDC，而是用官方 USDC 合约地址；需要在部署脚本里区分「测试网用 MockUSDC、主网用传入的 USDC 地址」，或单独写一个 `deploy-mainnet.ts` 传入真实 USDC 地址。
  - **前端**：增加 `web/addresses.base.json`（或类似命名），内容为主网合约地址 + `chainId: 8453`；前端需增加「主网模式」的加载逻辑（或通过同一套逻辑 + 不同地址文件区分）。

**换到主网时**：  
- 改 **hardhat 主网配置**、**.env 主网 RPC 与私钥**、**部署脚本用的 USDC 地址**、**前端主网地址文件与 chainId**。  
- 合约逻辑仍可不改，只是「部署参数」和「前端连哪条链、哪个地址」不同。

---

## 三、每次更换环境时需要改的部分（小结）

| 切换方向     | 需要改的配置/文件 | 代码是否要改 |
|--------------|------------------|--------------|
| 本地 → 测试  | 无（跑 test 即可） | 否 |
| 本地 → 测试网 | .env（PRIVATE_KEY、BASE_SEPOLIA_RPC_URL）；部署后改 web/addresses.base-sepolia.json | 否（仅改地址与 chainId） |
| 测试网 → 主网 | hardhat 增加主网；.env 增加主网 RPC；部署脚本用真实 USDC；前端增加主网地址文件与 chainId | 部署脚本可能区分网络；前端多一个地址文件或分支逻辑 |

- **合约代码**（`contracts/*.sol`）：在开发/测试/测试网/主网之间切换时**一般不用改**。  
- **测试代码**（`test/*.ts`）：不依赖当前是本地还是测试网，**不用因换环境而改**。  
- **真正随环境变的是**：  
  - 部署时：**网络名**、**RPC 与私钥**（.env）、**USDC 地址**（主网用真实合约）；  
  - 前端：**用哪个地址文件**（addresses.json / addresses.base-sepolia.json / addresses.base.json）、**chainId** 和 **RPC**（当前测试网在 app.js 里写死 Base Sepolia，主网可再加一段或抽成配置）。

---

## 四、推荐流程（从开发到主网）

1. **开发**：本地 `node` + `init-local` + `serve`，改合约或前端后跑 `npm run test`。  
2. **提交前**：`npm run compile && npm run test`（与 CI 一致）。  
3. **测试网**：配置 .env → `deploy.ts --network baseSepolia` → 更新 `addresses.base-sepolia.json` → 前端部署或本地用测试网模式打开。  
4. **主网**：加主网配置与主网部署脚本（含真实 USDC）→ 部署 → 更新前端主网地址文件并让前端支持主网 chainId。

这样，从开发到测试、再到测试网、最后到主网，**环境切换主要靠配置和不同地址文件**，代码改动集中在部署脚本和前端配置层，合约与测试用例可保持稳定。

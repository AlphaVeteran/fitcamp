# 在 GitHub 上测试用户界面

当前 FitCamp 前端是**本地配置**：需要先跑 `npm run node`、`npm run init-local`、`npm run serve`，在浏览器打开 localhost:3000，用内置的 K/A/B/C 账户操作。这样只有你自己能在本机试用。

若希望**任何人点开链接就能试用界面**（网络开放测试），需要把前端部署到线上，并让页面在「无本地链」时加载测试网配置（Base Sepolia）。下面先列出几种**快捷域名/链接方式**，再写详细步骤。

---

## 快捷部署方式（拿一条可分享的链接）

| 方式 | 得到的大致链接 | 操作简述 |
|------|----------------|----------|
| **GitHub Pages** | `https://<你的用户名>.github.io/fitcamp/` | 仓库 **Settings → Pages** → Source 选 **GitHub Actions** 或 **main** 分支，目录选 **/ (root)** 或 **/web**（见下）；保存后等几分钟。 |
| **Vercel** | `https://fitcamp-xxx.vercel.app` | 打开 [vercel.com](https://vercel.com) → **Add New Project** → 导入本仓库 → **Root Directory** 填 `web`，**Build** 可留空（纯静态）→ Deploy。 |
| **Netlify** | `https://xxx.netlify.app` | 打开 [netlify.com](https://netlify.com) → **Add site → Import from Git** → 选仓库 → **Publish directory** 填 `web`，无构建命令 → Deploy。 |
| **Cloudflare Pages** | `https://fitcamp.pages.dev` | [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages → Create project → Connect to Git** → 选仓库 → **Build output directory** 填 `web`，无 build 命令 → Save and Deploy。 |
| **Surge.sh**（命令行） | `https://fitcamp-test.surge.sh` | 在项目根目录执行：`npx surge web/ fitcamp-test.surge.sh`（需先 `npm run export-web-config` 且 `web/` 内已有 `abis.json`、`addresses.base-sepolia.json`）。 |
| **ngrok**（临时测试） | `https://xxx.ngrok.io` | 本地运行 `npm run serve` 后，另开终端执行 `npx ngrok http 3000`，用给出的 https 链接分享；关掉 serve/ngrok 后链接失效。 |

**注意**：线上要能连 Base Sepolia，需在仓库的 `web/` 下已有 **`abis.json`** 和 **`addresses.base-sepolia.json`**（内含你部署的合约地址与 `chainId: 84532`）。若用 GitHub Pages 且站点根目录是**仓库根**，需让访问路径指向 `web`（例如 `https://xxx.github.io/fitcamp/` 且把 `web` 内容放到仓库根，或使用 Actions 把 `web/` 发布到 gh-pages 的根）。

---

---

## 方式一：线上演示（推荐）— 部署前端 + 测试网模式

效果：在 README 里放一个 **Live Demo** 链接（如 `https://your-name.github.io/fitcamp` 或 Vercel 的链接），访客打开后连接 MetaMask、切换到 Base Sepolia，即可试用界面（参加、打卡、提现等需已部署的合约）。

### 前置条件

- 合约已部署到 **Base Sepolia**（见 [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) 的测试网部署步骤）。
- 部署后得到 `FitCamp` 和 `MockUSDC` 的地址。

### 步骤概览

1. **准备前端可用的配置（测试网）**
   - 在仓库里保留或生成 `web/abis.json`（合约 ABI，见下）。
   - 在 `web/` 下增加 `addresses.base-sepolia.json`，内容为你在 Base Sepolia 上部署的地址，例如：
     ```json
     {
       "fitCamp": "0x你的FitCamp地址",
       "mockUsdc": "0x你的MockUSDC地址",
       "chainId": 84532
     }
     ```
   - 前端已支持「测试网模式」：当没有本地 `addresses.json` 时，会尝试加载 `addresses.base-sepolia.json` 并使用 Base Sepolia 公网 RPC + MetaMask。

2. **导出 ABI（供静态页面使用）**
   - 编译后执行：
     ```bash
     npm run compile
     npm run export-web-config
     ```
   - 会在 `web/` 下生成 `abis.json`，并创建占位文件 `addresses.base-sepolia.json`。把其中的地址改为你在 Base Sepolia 上部署的合约地址后，可将 `web/abis.json` 与 `web/addresses.base-sepolia.json` 一并提交（见下方 .gitignore 说明）。

3. **部署前端到静态托管**
   - **GitHub Pages**：在仓库 Settings → Pages → Source 选 `main` 分支、根目录或 `web` 目录（若只有 `web` 作为站点根）；或使用 GitHub Actions 把 `web/` 推到 `gh-pages`。
   - **Vercel / Netlify**：连接本仓库，把「站点根目录」或「发布目录」设为 `web`，部署即可。
   - 部署后得到 URL，例如 `https://your-username.github.io/fitcamp/` 或 `https://fitcamp-xxx.vercel.app`。

4. **在 README 里加上「在 GitHub 上测试用户界面」**
   - 在 README 顶部或 Features 下加一行，例如：
     ```markdown
     **Live Demo (Base Sepolia):** [点击试用](https://your-username.github.io/fitcamp/)
     ```
   - 说明：请先安装 MetaMask 并切换到 Base Sepolia 网络，再连接钱包。

这样，别人在 GitHub 上打开仓库后，通过「Live Demo」链接即可在浏览器里测试用户界面（连接钱包后与合约交互）。

---

## 方式二：仅本地 + CI 里不跑界面

若暂时不提供线上演示，只希望「在 GitHub 上」有可复现的验证：

- **代码与文档**：README 中写清「如何本地测试用户界面」：
  1. `git clone` 后 `npm install && npm run compile`
  2. 终端 1：`npm run node`
  3. 终端 2：`npm run init-local && npm run serve`
  4. 浏览器打开 http://localhost:3000，用页面内 K/A/B/C 切换身份操作
- **CI**：已有 `.github/workflows/test.yml` 只跑 `npm run compile` 和 `npm run test`（不启动浏览器、不跑 E2E）。如需「在 GitHub 上」自动测界面，需要再加 E2E（如 Playwright），在 Actions 里启动本地链、部署、serve 后再跑测试，步骤较多，一般放在后续再做。

---

## 测试网模式说明（前端行为）

- **本地模式**：当前页面来自 `http://localhost:3000` 且能加载到 `addresses.json` 时，使用本地 RPC 代理（`/rpc` → 本机 8545）和内置 K/A/B/C 账户。
- **测试网模式**：当无法加载 `addresses.json`（例如部署在 GitHub Pages 上）时，前端会尝试加载 `addresses.base-sepolia.json`，并使用公网 Base Sepolia RPC（如 `https://sepolia.base.org`）和 MetaMask。用户需「连接钱包」；若当前账户为合约 Owner，则显示群主操作，否则显示用户操作。

---

## .gitignore 与要提交的文件

- `web/addresses.json`：由 `npm run init-local` 生成，仅本地使用，**保持被 .gitignore 忽略**。
- `web/abis.json`：若希望线上演示直接用仓库里的 ABI，可**不再忽略** `web/abis.json`（从 .gitignore 中移除该项），并在执行 `scripts/export-web-config.ts` 后提交。
- `web/addresses.base-sepolia.json`：测试网合约地址，可提交到仓库（不要写私钥或敏感信息），以便 GitHub 上的静态站点能加载测试网配置。

这样即可在 GitHub 上通过「Live Demo」链接测试用户界面，而本地开发流程不变。

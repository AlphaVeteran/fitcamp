# Build in Public 与求职参考

本文档面向「用 FitCamp 验证全流程能力、在 X / Farcaster / GitHub 上 build in public、希望 3 个月内获得 Web3 远程工作」的目标，给出：**优秀 DApp 参考**、**整体建议**、**开发优先级任务**。

---

## 一、优秀 DApp / 开源项目参考

以下项目代码质量高、文档或社区成熟，适合学习架构与实现，面试时也常被问到。

### 协议 / 合约层

| 项目 | 类型 | 为什么值得看 | 链接/关键词 |
|------|------|--------------|-------------|
| **Uniswap v2 / v3** | DEX | 行业标准、AMM、工厂模式、安全实践 | GitHub: uniswap |
| **Compound v2/v3** | 借贷 | 利率模型、cToken、治理 | GitHub: compound-finance |
| **Aave v3** | 借贷 | 模块化、跨链、文档全 | GitHub: aave |
| **OpenZeppelin Contracts** | 库 | 标准实现（ERC20/721、Ownable、ReentrancyGuard） | GitHub: OpenZeppelin/openzeppelin-contracts |
| **Safe (Gnosis Safe)** | 多签钱包 | 模块化、代理模式、生产级 | GitHub: safe-global |
| **Juicebox** | 金库/众筹 | 清晰的金库与分配逻辑，DAO 常用 | GitHub: jbx-protocol |

### 全栈 / 脚手架

| 项目 | 说明 | 适合用来 |
|------|------|----------|
| **Scaffold-ETH 2** | Hardhat + React + 部署/测试脚本 | 快速搭 DApp、学前后端与链交互 | scaffold.eth |
| **Create Eth App** | 多种前端框架可选 | 对比不同栈的 DApp 结构 | GitHub: ethereum.org 相关 |

### 与你方向相关的生态

| 项目 | 说明 |
|------|------|
| **Farcaster** | 你在用 Farcaster 更新进度，可看协议/Hub 设计、如何做去中心化社交与身份。 |
| **Lens Protocol** | 链上社交图、可组合性，适合了解「可组合 DApp」思路。 |
| **Base** | 你已用 Base Sepolia，可看 Base 官方示例与最佳实践（部署、索引、前端）。 |

### 学习方式建议

- **不要贪多**：选 1～2 个（例如 Uniswap v2 + OpenZeppelin），读核心合约和测试，理解「为什么这样设计」。
- **做对比**：把你的 FitCamp 与参考项目对比（状态设计、权限、结算流程、错误处理），在文档或推文里写「我参考了 X，在 FitCamp 里做了 Y」。
- **引用到简历/作品集**：在 README 或博客写「学习与参考：Uniswap v2, OpenZeppelin」，体现你有标准协议阅读习惯。

---

## 二、整体建议：3 个月 + Build in Public + 求职

### 1. 先「做完一个完整闭环」，再扩展

- **一个让人能点开、能用的项目** 比多个半成品更有说服力。FitCamp 已经包含：合约、多期逻辑、前端、文档（含协议文档），很适合作为主作品。
- **目标**：从「能跑」到「别人能无需你讲解就部署/使用」，即：README 清晰、有测试、有公开部署（如 Base Sepolia）+ 合约验证。

### 2. Build in Public 要「可验证」

- **X / Farcaster**：不只说「在做 FitCamp」，而是发「今天完成了 X，遇到 Y 问题，用 Z 解决了」或「合约已上 Base Sepolia：链接」。
- **GitHub**：commit 信息清晰、有 PR/issue 更好；README 里写「Live Demo」链接和「Contract (Explorer)」链接。
- **效果**：招聘方点进 GitHub / 推文就能看到「这人独立完成过从设计到上链到前端的流程」。

### 3. 主动对齐「Web3 远程岗位」的常见要求

- **Solidity**：FitCamp 已有；可再强调：多期状态、权限控制、结算与提现逻辑。
- **测试**：单元测试覆盖主要路径和边界（无获胜者、一人获胜、余数）。
- **部署与运维**：能部署到测试网/主网、验证合约、写简单部署文档。
- **前端/集成**：ethers.js 或 viem、连接钱包、切换网络、交易状态反馈。
- **文档与协作**：协议文档、用户说明、开发文档（你已有），体现能写技术文档。

### 4. 时间分配建议（3 个月）

- **约 40%**：把 FitCamp 打磨到「作品集级别」（测试、部署、前端体验、文档）。
- **约 30%**：持续在 X / Farcaster / GitHub 输出进度与思考，并和 Web3 开发者/团队互动。
- **约 20%**：深入学习 1～2 个参考项目（见上），并能在面试里讲清楚。
- **约 10%**：投递、修改简历/作品集、模拟面试（把 FitCamp 讲清楚、讲出设计取舍）。

---

## 三、开发优先级任务（建议顺序）

按「对证明能力 + 求职」的收益排序，优先做前面的项。

### P0：必须做（证明「能独立完成全流程」）

| 序号 | 任务 | 说明 |
|------|------|------|
| 1 | **测试覆盖与 CI** | 补全/完善 `test/FitCamp.test.ts`（正常流程、无获胜者、单人获胜、余数、权限）。在 GitHub 上跑 `npm run test`（可加 GitHub Actions），保证主分支始终可测。 |
| 2 | **部署到 Base Sepolia 并验证** | 用现有 `scripts/deploy.ts` 部署，在 BaseScan 上验证合约，把「合约地址 + 区块浏览器链接」写进 README。 |
| 3 | **README 作品集化** | 增加：项目简介、技术栈、**Live Demo 链接**（或「测试网演示」）、**合约地址与 Explorer 链接**、如何运行/测试、文档索引（含协议文档）。让陌生人 5 分钟内能理解「这是什么、怎么试」。 |

### P1：强烈建议（提升专业度与可信度）

| 序号 | 任务 | 说明 |
|------|------|------|
| 4 | **前端接真实钱包** | 支持 MetaMask（或其它常用钱包）连接、切换 Base Sepolia、发起交易并显示 pending/success/fail，而不是仅本地测试账户。可保留本地模式作为「本地开发说明」。 |
| 5 | **协议/安全说明** | 在 `docs/PROTOCOL.md` 或 README 中加一小节「设计取舍与风险」（例如：中心化打卡确认、整除余数、无预言机等），体现你有安全与权衡意识。 |
| 6 | **Build in Public 的「第一篇文章」** | 在 X 或 Farcaster 发一篇短文：FitCamp 是什么、解决了什么问题、技术亮点、合约/演示链接。之后每完成一个 P0/P1 任务就发一条更新。 |

### P2：有时间就做（加分项）

| 序号 | 任务 | 说明 |
|------|------|------|
| 7 | **区块链浏览器集成** | 前端「在 Explorer 查看交易」链接，方便别人核查链上行为。 |
| 8 | **第二个小项目或 OSS 贡献** | 一个小工具（如一个简单 CLI）或给 OpenZeppelin/Scaffold-ETH 等提一个小的 PR，证明你能在现有代码库上协作。 |
| 9 | **简单数据展示** | 例如当前期数、参与人数、某期奖池（读链上数据即可），让 Demo 更「像产品」。 |

### 不建议现在花大时间的

- 做很多个新 DApp 而不把 FitCamp 收尾。
- 从零造轮子（例如自己写 ERC20 而不是用 OpenZeppelin）。
- 过度设计（例如为 FitCamp 做复杂治理或多链），先单链、单合约、流程完整更重要。

---

## 四、可复用的「进度更新」模板（Build in Public）

发推/发 Farcaster 时可以直接套用或改写：

- **本周/今日完成**：例如「FitCamp 合约已部署到 Base Sepolia 并完成验证，链接：…」
- **技术点**：例如「实现了无获胜者时的结算路径，并加了单元测试」
- **下一步**：例如「接下来做前端接 MetaMask 和网络切换」
- **链接**：Repo、Live Demo、合约 Explorer 链接

---

## 五、文档与仓库内的对应关系

| 目标 | 可引用文档 |
|------|------------|
| 协议设计 | [PROTOCOL.md](PROTOCOL.md) |
| 用户怎么用 | [USER_GUIDE.md](USER_GUIDE.md) |
| 本地/测试网怎么跑 | [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) |
| 发布与展示 | [GITHUB_PUBLISH.md](GITHUB_PUBLISH.md) |
| 本参考与优先级 | 本文档 |

---

*把 FitCamp 做到「陌生人能看懂、能试用、能信你独立完成全流程」，再配合持续 build in public，是 3 个月内争取 Web3 远程工作的务实路径。*

# 本地模拟跨链环境

Hardhat 默认只跑**一条**本地链。要模拟「跨链」应用，需要：**多条本地链** + **跨链逻辑**（桥/中继/协议）。下面分几种做法说明。

---

## 一、思路概览

| 方式 | 多条链从哪来 | 跨链怎么模拟 | 适用场景 |
|------|--------------|--------------|----------|
| **A. 多节点（Anvil + Hardhat）** | 本机跑 2+ 个节点，不同 port、chainId | 自己写脚本：监听链 A 事件，在链 B 发交易（模拟中继） | 通用、不依赖特定协议 |
| **B. 多节点（多个 Hardhat node）** | 开多个终端，不同 config 跑多次 `hardhat node` | 同上 | 不想装 Foundry 时 |
| **C. 协议自带本地网** | LayerZero / Hyperlane / Wormhole 等提供的 local validator | 用协议的 SDK/合约在本地多链间发消息 | 真要接某条跨链协议时 |

下面以 **A** 为主（最省事）：用 **Anvil 跑第二条链**，Hardhat 只负责编译和部署，两条链都可用 Hardhat 部署合约。

---

## 二、推荐：Anvil 第二条链 + Hardhat 双网络配置

### 1. 安装 Foundry（含 Anvil）

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

（如已安装 Foundry，可跳过。）

### 2. 两条链同时跑起来

- **链 1（沿用现有）**：Hardhat 节点  
  - 终端 1：`npm run node`  
  - 即 `http://127.0.0.1:8545`，chainId 31337  

- **链 2**：Anvil 再起一条  
  - 终端 2：`anvil --port 8546 --chain-id 31338`  
  - 即 `http://127.0.0.1:8546`，chainId 31338  

这样你就有两条互不共享状态的「本地链」，可视为两条「链」做跨链模拟。

### 3. Hardhat 里加第二条网络

在 `hardhat.config.ts` 的 `networks` 里增加一条，例如：

```ts
localhost2: {
  url: "http://127.0.0.1:8546",
  chainId: 31338,
},
```

部署时：

- 链 1：`npx hardhat run scripts/deploy.ts --network localhost`
- 链 2：`npx hardhat run scripts/deploy.ts --network localhost2`

两条链上各有同一套合约，地址不同。

### 4. 「跨链」在本地怎么体现

本地没有真正的跨链共识，一般是**自己写中继逻辑**，在两条链之间传状态或消息，例如：

- **链 A**：用户在某合约上发起「我要跨链到 B」的操作（例如 lock、发事件）。
- **你的脚本或简单服务**：监听链 A 的该事件，再在**链 B** 上调用对应合约（例如 mint、unlock）。
- **链 B**：合约只信任「中继」的调用（例如只允许某个 relayer 地址调用）。

也就是说：**链 A 和链 B 各跑一份合约，中间用你自己写的一个 Node 脚本（或以后换成协议）做「桥」**。  
本地模拟时，这个「桥」可以就是一个 Hardhat 脚本：`ethers.getSigners()` 连两条链的 provider，一边监听事件，另一边发交易。

---

## 三、可选：不用 Anvil，用两个 Hardhat node

若不想装 Foundry，可以跑两个 Hardhat 节点，用**不同端口和 chainId**。做法之一：

1. **第一个节点**（和现在一样）  
   - 终端 1：`npm run node`  
   - 8545，chainId 31337（来自当前 config）

2. **第二个节点**（需要不同 chainId）  
   - Hardhat 的 `hardhat node` 默认只读一个网络配置，且 chainId 来自该配置。要第二条链不同 chainId，可以：
     - 再建一个配置文件（如 `hardhat.config.chain2.ts`），里面对应 `url: "http://127.0.0.1:8546"`, `chainId: 31338`，然后：
       - 终端 2：`npx hardhat node --port 8546 --config hardhat.config.chain2.ts`
     - 或在当前 config 里用环境变量区分 chainId，例如 `chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : 31337`，然后终端 2：`CHAIN_ID=31338 npx hardhat node --port 8546`

这样你也有两条链，部署方式同上（一个用 `localhost`，一个用 `localhost2`）。

---

## 四、若打算接「真实」跨链协议（主网/测试网同构）

要做和主网一致的跨链逻辑，可再用协议自带的**本地/测试网多链环境**：

- **LayerZero**：有 local endpoint 和测试网多链，用其 Endpoint 合约在本地两条链之间发 message。
- **Hyperlane**：有本地 validator 部署方式，适合本地多链邮件/消息。
- **Wormhole**：有 devnet，可本地起多链 + guardarian。
- **Chainlink CCIP**：测试网多链 + 脚本。

这些会引入各自 SDK 和合约，部署和测试都在其文档的「local / devnet」章节里。  
你本地已经用「两条链（Hardhat + Anvil 或双 node）」把「多链环境」搭好后，再选一个协议，把上面的「自己写中继」换成「协议的消息收发」即可。

---

## 五、和当前 FitCamp 的关系

- 当前 FitCamp 是单链应用，**不强制**要跨链；若你只是先**体验多链部署和脚本**，按第二节把 `localhost2` 配好，跑两条链并分别部署即可。
- 若后续要做「链 A 报名、链 B 打卡」或「多链奖池」等，就需要：
  - 在两条链上各部署一套（或部分）合约；
  - 用**中继脚本**或 **LayerZero/Hyperlane 等**在链间传事件或消息；
  - 前端可连两条链（例如用 ethers 多 provider），或只连一条链，另一条由后端/中继负责。

总结：**本地模拟跨链 = 多条本地链（Anvil + Hardhat node 或双 node）+ 你自己或协议提供的「跨链」逻辑。** 先加第二条网络并跑起两条链，再在脚本里写「链 A → 链 B」的调用即可。

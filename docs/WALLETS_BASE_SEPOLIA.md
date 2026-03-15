# 在 MetaMask / Rabby / Rainbow 中添加 Base Sepolia

Base Sepolia 是 Base 的测试网，FitCamp 测试网模式使用该网络。添加后即可「连接钱包」参与打卡。

---

## 网络参数（三种钱包通用）

| 项 | 值 |
|----|-----|
| **网络名称** | Base Sepolia |
| **RPC URL** | `https://sepolia.base.org` 或 `https://base-sepolia-rpc.publicnode.com` |
| **Chain ID** | 84532 |
| **货币符号** | ETH |
| **区块浏览器** | https://sepolia.basescan.org |

---

## MetaMask

1. 打开 MetaMask，点击顶部**网络下拉框**（显示「Ethereum 主网」等）。
2. 点 **「添加网络」** → **「手动添加网络」**（或「Add a network manually」）。
3. 填写：
   - **网络名称**：Base Sepolia  
   - **RPC URL**：`https://sepolia.base.org` 或 `https://base-sepolia-rpc.publicnode.com`  
   - **Chain ID**：84532  
   - **货币符号**：ETH  
   - **区块浏览器 URL**（选填）：`https://sepolia.basescan.org`
4. 点 **「保存」**，再选择该网络即可。

---

## Rabby

1. 打开 Rabby，点击顶部**当前网络名称**。
2. 点 **「添加网络」**（或「Add Network」）。
3. 在列表里找 **「Base Sepolia」**，点 **「添加」**；若没有，选 **「自定义网络」** / **「Add custom network」**。
4. 自定义时填写：
   - **网络名称**：Base Sepolia  
   - **RPC URL**：`https://sepolia.base.org` 或 `https://base-sepolia-rpc.publicnode.com`  
   - **Chain ID**：84532  
   - **货币符号**：ETH  
   - **区块浏览器**（选填）：`https://sepolia.basescan.org`
5. 保存后切换到 Base Sepolia。

---

## Rainbow

1. 打开 Rainbow，底部点 **「浏览器」** 或 **「设置」**。
2. 进入 **「网络」** / **「Networks」**，点 **「添加网络」** 或 **「+」**。
3. 若列表中有 **Base Sepolia**，直接选并添加；否则选 **「自定义」** / **「Custom」**。
4. 自定义时填写：
   - **Network Name**：Base Sepolia  
   - **RPC URL**：`https://sepolia.base.org` 或 `https://base-sepolia-rpc.publicnode.com`  
   - **Chain ID**：84532  
   - **Currency**：ETH  
   - **Block Explorer**（选填）：`https://sepolia.basescan.org`
5. 保存后切到 Base Sepolia，再在 FitCamp 页面点「连接钱包」。

---

## 测试 ETH

测试网需要少量 ETH 作为 gas。可到 [Base 官方水龙头](https://www.coinbase.com/faucets/base-sepolia-faucet) 或 [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia) 领取 Base Sepolia ETH。

---

## 测试 USDC（缴纳定金用）

部署脚本只给**部署者地址**铸造了 1000 测试 USDC，其他用户地址为 0。参与需 **100 USDC** 定金。

**推荐（无需 Basescan）**：群主在 **FitCamp 页面**用部署者钱包连接后，在「群主操作」区域会看到 **「测试网：给参与用户铸造 100 测试 USDC」**：在输入框粘贴用户地址，点 **「铸造 100 USDC」** 并确认交易即可。铸造后让该用户在页面或 Basescan 对 FitCamp 做一次 **approve**，再点「缴纳打卡定金」。

若要在 Basescan 上操作，合约需先**验证**；未验证的合约不会显示 "Read Contract" / "Write Contract"。下面为 Basescan 操作步骤（验证后或使用页面铸造后授权时参考）。

---

### 群主在 Basescan 给用户铸造 100 测试 USDC（界面操作）

1. **打开 Base Sepolia 区块浏览器**  
   浏览器打开：**https://sepolia.basescan.org**

2. **进入 MockUSDC 合约页**  
   顶部搜索框粘贴 **MockUSDC 合约地址**（你项目里 `web/addresses.base-sepolia.json` 的 `mockUsdc`，例如 `0x680E3dbf8fDBb8518969F0d4b1DC4ae9b55685ca`），回车。  
   或直接打开：  
   **https://sepolia.basescan.org/address/0x680E3dbf8fDBb8518969F0d4b1DC4ae9b55685ca**  
   （若你部署时地址不同，把链接里这串换成你的 `mockUsdc` 地址。）

3. **点「Contract」**  
   合约页里有一排标签：**Contract | Read | Write | …**，点 **Contract**。

4. **点「Write Contract」**  
   在 Contract 子菜单里点 **Write Contract**。

5. **连接钱包**  
   若页面提示「Connect to Web3」，点 **Connect Wallet**，选 MetaMask（或你用的钱包），选**部署者账户**，确认连接。确保当前网络是 **Base Sepolia**（chainId 84532）。

6. **找到并展开 `mint`**  
   在「Write Contract」下的函数列表里找到 **mint**，点开。

7. **填写参数**  
   - **to**：粘贴要参与的用户地址，例如 `0x20196010b8469ac5f252720c00Fe9F22396E6857`  
   - **amount**：填 `100000000`（即 100 × 10⁶，表示 100 USDC，6 位小数）

8. **写合约**  
   点 **Write**（或 **Confirm**），在 MetaMask 里用**部署者钱包**确认交易。等交易成功，该用户地址就有 100 测试 USDC。

---

### 用户授权 FitCamp 使用 USDC（界面操作）

用户拿到 USDC 后，需要授权 FitCamp 合约才能扣 100 USDC 作为定金。

1. **打开 Basescan**  
   打开 **https://sepolia.basescan.org**，搜索框粘贴 **MockUSDC 合约地址**（同上，`addresses.base-sepolia.json` 里的 `mockUsdc`），进入合约页。

2. **Contract → Write Contract**  
   点 **Contract** → **Write Contract**。

3. **连接用户钱包**  
   点 **Connect Wallet**，选 MetaMask/其他钱包，选**用户自己的账户**（即上面收到 100 USDC 的地址），确认网络为 Base Sepolia。

4. **找到 `approve`**  
   在函数列表里找到 **approve**，点开。

5. **填写参数**  
   - **spender**：粘贴 **FitCamp 合约地址**（`addresses.base-sepolia.json` 里的 `fitCamp`，例如 `0x70a42Ac4f1AA24779c6520E0be96c824F7433820`）  
   - **value**：填 `100000000`（授权 100 USDC），或填 `115792089237316195423570985008687907853269984665640564039457584007913129639935` 表示无限授权

6. **写合约**  
   点 **Write**，在钱包里用**用户账户**确认。成功后即可回到 FitCamp 页面点「缴纳打卡定金」。

---

**若 Basescan 上没有 "Write Contract"**：说明该合约尚未在 Basescan **验证**（Verify）。未验证合约只显示字节码，不会出现 Read/Write 入口。可直接用 FitCamp 页面群主区的「测试网：给参与用户铸造 100 测试 USDC」完成铸造，无需验证合约。

## 与 FitCamp 配合

- 部署到 Base Sepolia 后，在 FitCamp 页面点 **「连接钱包 (Base Sepolia)」**，钱包会提示切换到 Base Sepolia（若已添加则会自动切换）。
- 若遇 RPC 限流，可在 `web/addresses.base-sepolia.json` 中设置 `"rpcUrl": "https://base-sepolia-rpc.publicnode.com"`，前端读链会用该 RPC；钱包里添加的网络仍可为 `https://sepolia.base.org`。

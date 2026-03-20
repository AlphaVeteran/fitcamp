# FitCamp 网页交互

## 运行步骤

### 1. 启动本地链（终端 1）

```bash
cd /Users/amberlu/Documents/fitcamp
npm run node
```

保持该终端不关闭。

### 2. 初始化合约并生成前端配置（终端 2）

```bash
cd /Users/amberlu/Documents/fitcamp
npm run compile
npm run init-local
```

会部署 MockUSDC、FitCamp，给 K/A/B/C 各 1000 USDC，并生成 `web/addresses.json`、`web/abis.json`。

### 3. 启动网页（终端 2）

```bash
npm run serve
```

**必须用上面的命令**（会启动带 RPC 代理的服务器）。浏览器打开：**http://localhost:3000**。若用 `npx serve web` 直接打开，会因 CORS 一直显示「加载中」。

### CampVault 独立首页（新增）
打开：**http://localhost:3000/campvault/**  
在页面中填写已部署的 `CampVault` 合约地址后即可演示 CampVault：
- `缴纳打卡定金`：Deposit（会先自动 approve USDC）
- `提现（赎回全部份额）`：Redeem 全部 shares
- `刷新状态`：读取 `totalAssets` 与你的份额余额

该页面不显示 FitCamp 的“群主/用户”面板，仅用于展示 CampVault 合约交互与 7 天策略输入（演示输入不改变 FitCamp 合约逻辑）。

### 4. 使用说明

- **当前用户**：选 K（群主）或 A、B、C。
- **K（群主）**：先点「开始打卡」，此时 A/B/C 才能「缴纳打卡定金」和「打卡」；再点「结束打卡」推进链上时间并灰掉打卡；最后点「结算」。
- **A/B/C**：在 K 开始打卡后点「缴纳打卡定金」参加；在期限内点「打卡」（由 K 的账号代为执行）；K 结束并结算后，完成 7 次打卡的用户可点「提现」查看账户变化。

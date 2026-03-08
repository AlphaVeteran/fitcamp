# FitCamp 网页交互

## 运行步骤

### 1. 启动本地链（终端 1）

```bash
cd /Users/amberlu/Documents/cursor
npm run node
```

保持该终端不关闭。

### 2. 初始化合约并生成前端配置（终端 2）

```bash
cd /Users/amberlu/Documents/cursor
npm run compile
npm run init-local
```

会部署 MockUSDC、FitCamp，给 K/A/B/C 各 1000 USDC，并生成 `web/addresses.json`、`web/abis.json`。

### 3. 启动网页（终端 2）

```bash
npm run serve
```

**必须用上面的命令**（会启动带 RPC 代理的服务器）。浏览器打开：**http://localhost:3000**。若用 `npx serve web` 直接打开，会因 CORS 一直显示「加载中」。

### 4. 使用说明

- **当前用户**：选 K（群主）或 A、B、C。
- **K（群主）**：先点「开始打卡」，此时 A/B/C 才能「缴纳打卡定金」和「打卡」；再点「结束打卡」推进链上时间并灰掉打卡；最后点「结算」。
- **A/B/C**：在 K 开始打卡后点「缴纳打卡定金」参加；在期限内点「打卡」（由 K 的账号代为执行）；K 结束并结算后，完成 7 次打卡的用户可点「提现」查看账户变化。

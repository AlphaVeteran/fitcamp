# FitCamp 协议文档

本文档描述 FitCamp 链上协议的设计、角色、流程与经济模型。

---

## 1. 协议概述

FitCamp 是一个**多期打卡挑战**的智能合约协议：用户每期缴纳 **100 USDC** 作为打卡定金，在**规定天数内完成 7 次打卡**即视为「获胜者」，可**平分当期奖池**；未完成 7 次打卡的用户其定金进入奖池，由获胜者瓜分。

- **每期时长**：由群主在开启新一期时设定（如默认 7 天）。
- **结算**：当期结束后，完成 7 次打卡的用户可提现；群主在所有获胜者提完后可提取余数，再开启新一期。

---

## 2. 核心参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 质押金额 | 100 USDC | 6 位精度（`100 * 10^6`），参加当期所需 |
| 获胜条件 | ≥ 7 次打卡 | 当期内在链上被确认的打卡次数 |
| 每期时长 | 可配置（如 7 天） | 由群主在 `startNewRound` 时指定 |
| 代币 | ERC20 USDC | 主网/测试网 USDC，本地可用 MockUSDC |

---

## 3. 角色与权限

| 角色 | 说明 | 链上权限 |
|------|------|----------|
| **群主（Owner）** | 合约部署者，负责运营每期挑战 | 确认用户打卡、无获胜者时结算、提取余数、开启新一期 |
| **用户** | 参加打卡挑战的参与者 | 缴纳定金、请求打卡（由群主执行链上确认）、期结束后达标则提现 |

---

## 4. 合约接口与流程

### 4.0 群主开放当期报名 `openRoundForJoin(uint256 _roundId)`

- **调用方**：仅群主（Owner）
- **作用**：开放某期报名（「建群」），开放后用户方可对该期缴纳定金参与。
- **前置条件**：`_roundId <= currentRoundId` 且该期未结束。
- **状态变更**：`roundOpenForJoin[_roundId] = true`。部署后第 1 期（round 0）默认未开放，群主须先调用 `openRoundForJoin(0)`；`startNewRound` 会为新期自动设置开放。

### 4.1 参加当期 `joinCamp()`

- **调用方**：用户
- **作用**：向合约转入 100 USDC，参加当前期（`currentRoundId`）。
- **前置条件**：
  - 该期已开放报名（`roundOpenForJoin[round]`）
  - 未参加过本期（`!participants[round][msg.sender].hasStaked`）
  - 本期未结束（`block.timestamp < roundEndTime[round]`）
  - USDC `transferFrom(msg.sender, address(this), STAKE_AMOUNT)` 成功
- **状态变更**：写入 `participants[round][msg.sender]`，并加入 `participantList[round]`。

### 4.2 打卡确认 `checkIn(address _user)`

- **调用方**：仅群主（Owner）
- **作用**：为指定地址 `_user` 增加一次当期打卡次数。
- **前置条件**：当期未结束（`block.timestamp < roundEndTime[round]`）。
- **状态变更**：`participants[round][_user].checkInCount += 1`。

### 4.2b 群主主动结算 `settleRound(uint256 _roundId)`

- **调用方**：仅群主（Owner）
- **作用**：当期结束后，由群主主动执行结算（统计获胜人数、计算 `rewardPerWinner`），之后用户再调用 `settleAndWithdraw` 领奖。若群主不调用，则仍由首个提现用户触发结算。
- **前置条件**：该期已结束、未结算、且至少有 1 名获胜者（`checkInCount >= 7`）。
- **状态变更**：`winnersCount[_roundId]`、`rewardPerWinner[_roundId]`、`isSettled[_roundId] = true`。

### 4.3 结算并提现 `settleAndWithdraw(uint256 _roundId)`

- **调用方**：用户（参与过该期的地址）
- **作用**：对指定期数执行「结算（若尚未结算）+ 本人领奖」。
- **结算逻辑（仅在该期首次有人提现时执行）**：
  - 统计该期 `checkInCount >= 7` 的人数 `count`；
  - 若 `count == 0` 则 revert（"No winners"）；
  - `winnersCount[_roundId] = count`；
  - `rewardPerWinner[_roundId] = 合约当前 USDC 余额 / count`（整除）；
  - `isSettled[_roundId] = true`。
- **领奖条件**：`participants[_roundId][msg.sender].checkInCount >= 7` 且未提现。
- **状态变更**：`user.isWithdrawn = true`，`winnersWithdrawnCount[_roundId]++`，向 `msg.sender` 转账 `rewardPerWinner[_roundId]`。

### 4.4 群主提取余数 `withdrawDust(uint256 _roundId)`

- **调用方**：仅群主（Owner）
- **作用**：在该期已结算且所有获胜者均已提现后，将合约内剩余 USDC（整除产生的余数等）提至群主地址。
- **前置条件**：
  - 该期已结算（`isSettled[_roundId]`）；
  - 所有获胜者已提现（`winnersWithdrawnCount[_roundId] == winnersCount[_roundId]`）；
  - 合约余额 > 0。

### 4.5 无获胜者结算 `settleRoundWithNoWinners(uint256 _roundId)`

- **调用方**：仅群主（Owner）
- **作用**：当该期**无人**完成 7 次打卡时，将当期标记为已结算，以便群主后续提取池内全部资金并开启新一期。
- **前置条件**：
  - 该期已结束（`block.timestamp >= roundEndTime[_roundId]`）；
  - 该期未结算（`!isSettled[_roundId]`）；
  - 该期确实无获胜者（所有参与者 `checkInCount < 7`）。
- **状态变更**：`isSettled[_roundId] = true`，`winnersCount[_roundId] = 0`。之后群主可调用 `withdrawDust` 提走池内全部 USDC。

### 4.6 开启新一期 `startNewRound(uint256 _durationDays)`

- **调用方**：仅群主（Owner）
- **作用**：在满足条件后开启新一轮挑战。**群主可不提现余数**，当期余数会自动滚入下一期奖金池。
- **前置条件**：
  - 当前期已结束（`block.timestamp >= roundEndTime[currentRoundId]`）；
  - 当前期已结算（`isSettled[currentRoundId]`）；
  - 当前期所有获胜者已提现（`winnersWithdrawnCount == winnersCount`）。
- **状态变更**：`currentRoundId++`，`roundEndTime[newRound] = block.timestamp + _durationDays * 1 days`。合约内剩余 USDC（若有）保留，作为下一期奖池的一部分。

### 4.7 查询接口 `getParticipant(uint256 _roundId, address _user)`

- **调用方**：任意（view）
- **返回值**：`(hasStaked, checkInCount, isWithdrawn)`，表示该用户在该期是否已质押、打卡次数、是否已提现。

---

## 5. 经济模型

- **奖池构成**：当期所有参与者缴纳的 100 USDC 汇总于合约。
- **分配规则**：
  - **获胜者**（当期完成 ≥ 7 次打卡）：平分奖池（整除），每人获得 `rewardPerWinner = 合约余额 / 获胜人数`。
  - **余数**：因整除产生的零头留在合约，由群主通过 `withdrawDust` 提走。
- **无人达标**：若当期无人完成 7 次打卡，群主先调用 `settleRoundWithNoWinners`，再调用 `withdrawDust` 提走池内全部 USDC，然后可调用 `startNewRound` 开启下一期。

---

## 6. 安全与约束

- 每期每人只能参加一次（同一 `roundId` 下 `hasStaked` 唯一）。
- 本期结束后不可再参加或打卡（时间以 `roundEndTime[round]` 为准）。
- 每期结算只执行一次（由首次 `settleAndWithdraw` 触发，通过 `isSettled` 保证）。
- 每位用户每期最多提现一次（`isWithdrawn` 标记）。
- 开启新一期前必须将合约余额清空，避免跨期资金混淆。

---

## 7. 相关文档

- [用户说明](USER_GUIDE.md) — 前端操作与常见提示
- [开发者搭建](DEVELOPER_SETUP.md) — 本地链与部署
- [发布到 GitHub](GITHUB_PUBLISH.md) — 仓库发布说明

---

*协议实现见合约：`contracts/FitCamp.sol`*

# FitCamp 资源文件

本目录用于存放项目示意图、图片等资源。

## 生成示意图时指定风格

若希望得到**黑白、简单线条**的架构图（而非彩色渐变风格），在请求生成图像时加上例如：

- 「黑白示意图，简单线条，不要渐变和彩色」
- 「用黑白简约风格，只要线框和方框，不要复杂配色」

或英文：`black and white`, `simple line style`, `no gradients`, `minimal`.

若希望得到**现代、彩色、柔和渐变**的架构图，在请求生成图像时加上例如：

- 「现代风格、柔和渐变（蓝紫绿）、圆角矩形、简约线稿图标」
- 「清爽配色、轻微阴影、背景有淡色电路/网格纹理、中英双语标注」

或英文：`modern`, `colorful`, `soft pastel gradients`, `blue purple green`, `rounded rectangles`, `subtle drop shadows`, `clean minimal line-art icons`, `light circuit board background`.

**风格对比**：黑白简约 = 线框、无渐变；现代彩色 = 渐变、圆角、有层次感。

## Fit NFT 通用图（GitHub）

- **fit-nft.svg**：Fit NFT 的默认图标（奖杯/星形），所有 Fit NFT 共用这一张图。
- 推送到 GitHub 后，可用 **raw 直链** 作为 NFT 的 `image`：
  - 格式：`https://raw.githubusercontent.com/你的用户名/fitcamp/分支名/assets/fit-nft.svg`
  - 例如：`https://raw.githubusercontent.com/amberlu/fitcamp/main/assets/fit-nft.svg`
- 部署 FitCamp + FitNFT 后，由**群主**调用 **FitCamp.setFitNFTImageURI(上述 URL)**，即可让所有 Fit NFT 的元数据里带上该图片；钱包与市场会显示此图。
- 若想用自己的图，可替换 `assets/fit-nft.svg` 或新增 `fit-nft.png`，再更新 `setFitNFTImageURI` 的 URL。

## 架构图

- **fitcamp-architecture.png**：FitCamp 架构示意图（用户界面、钱包、区块链、FitCamp 合约、USDC 合约、EOA 地址及交互关系）。
- 若该图片缺失，可在对话中请助手重新生成并保存到本目录。

## 架构说明（文字版）

```
用户界面 (Web)  →  通过 ethers.js / 钱包签名  →  区块链 (Base / Ethereum)
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    ▼                                   ▼                                   ▼
              USDC 合约                          FitCamp 合约                          EOA 地址
         (balanceOf, transfer)            (joinCamp, checkIn, 提现等)              (Owner, User A/B/C)
                    ▲                                   │
                    │ 奖金池 = FitCamp 地址在 USDC 的余额   │ 用户缴纳定金 (transferFrom)
                    └───────────────────────────────────┘
```

/* global ethers */

/** CampVault LP 演示与 Uniswap Trading API / MCP 对齐：Base Mainnet */
const BASE_MAINNET_CHAIN_ID = 8453;

const VAULT_ABI = [
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function balanceOf(address owner) view returns (uint256)"
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

function shortAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

function setTx(msg) {
  const txStatus = document.getElementById("txStatus");
  if (!txStatus) return;
  txStatus.textContent = msg || "—";
  txStatus.className = "info";
}

function setVaultStatus(msg, isError) {
  const vaultStatus = document.getElementById("vaultStatus");
  if (!vaultStatus) return;
  vaultStatus.textContent = msg || "";
  vaultStatus.className = "info" + (isError ? " error" : "");
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("未检测到钱包（window.ethereum）。");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const account = accounts && accounts[0] ? accounts[0] : null;
  if (!account) throw new Error("未获取到账户地址。");
  return account;
}

function getProvider() {
  return new ethers.BrowserProvider(window.ethereum);
}

async function loadContracts() {
  const vaultAddr = document.getElementById("campVaultAddress").value.trim();
  if (!vaultAddr) throw new Error("请先填写 CampVault 地址。");
  const provider = getProvider();
  const signer = await provider.getSigner();
  const user = await signer.getAddress();

  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, provider);
  const assetAddr = await vault.asset();
  const asset = new ethers.Contract(assetAddr, ERC20_ABI, provider);

  const assetDecimals = await asset.decimals();
  const assetSymbol = await asset.symbol();

  const totalAssets = await vault.totalAssets();
  const shares = await vault.balanceOf(user);

  return {
    provider,
    signer,
    user,
    vaultAddr,
    vault,
    asset,
    assetDecimals,
    assetSymbol,
    totalAssets,
    shares
  };
}

async function refreshStatus() {
  setTx("");
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const chainLabel = document.getElementById("chainLabel");
    if (chainLabel) {
      const cid = Number(network.chainId);
      if (cid === BASE_MAINNET_CHAIN_ID) chainLabel.textContent = "Base Mainnet · " + cid;
      else if (cid === 84532) chainLabel.textContent = "Base Sepolia · " + cid;
      else chainLabel.textContent = "Chain " + cid;
    }

    const vaultAddrInput = document.getElementById("campVaultAddress");
    if (!vaultAddrInput || !vaultAddrInput.value.trim()) {
      setVaultStatus("请输入 CampVault 地址。");
      return;
    }

    const ctx = await loadContracts();
    const totalAssetsFmt = ethers.formatUnits(ctx.totalAssets, ctx.assetDecimals);
    const sharesFmt = ethers.formatUnits(ctx.shares, 18); // shares 是 ERC20，decimals 通常 18；若不一致可再查 vault.decimals

    setVaultStatus(
      [
        "CampVault 已加载：",
        "Vault: " + ctx.vaultAddr,
        "Asset: " + ctx.assetSymbol + " (" + ctx.asset.target + ")",
        "总资产 totalAssets: " + totalAssetsFmt + " " + ctx.assetSymbol,
        "你的份额 shares: " + sharesFmt,
        ""
      ].join("\n")
    );
    return;
  } catch (e) {
    setVaultStatus("加载失败: " + (e.message || String(e)), true);
    setTx("—");
  }
}

async function ensureAllowanceAndDeposit(ctx, amountAssets) {
  const signerVault = ctx.vault.connect(ctx.signer);
  const signerAsset = ctx.asset.connect(ctx.signer);

  setTx("检查 USDC 授权…");
  const allowance = await signerAsset.allowance(ctx.user, ctx.vaultAddr);
  if (allowance < amountAssets) {
    setTx("USDC 授权中（approve）…");
    const tx1 = await signerAsset.approve(ctx.vaultAddr, ethers.MaxUint256);
    await tx1.wait();
    setTx("授权完成，开始 Deposit…");
  }

  setTx("Deposit 中（deposit）…");
  const tx2 = await signerVault.deposit(amountAssets, ctx.user);
  await tx2.wait();
  setTx("Deposit 成功。");
}

async function deposit() {
  const depositInput = document.getElementById("cvDeposit");
  const vaultAddrInput = document.getElementById("campVaultAddress");
  if (!depositInput || !vaultAddrInput) return;

  const depositValue = Number(depositInput.value || "0");
  if (!Number.isFinite(depositValue) || depositValue <= 0) {
    setTx("Deposit 金额无效。");
    return;
  }

  const ctx = await loadContracts();
  const amountAssets = ethers.parseUnits(String(depositValue), ctx.assetDecimals);

  await ensureAllowanceAndDeposit(ctx, amountAssets);
  await refreshStatus();
}

async function redeemAll() {
  const ctx = await loadContracts();
  const shares = await ctx.vault.balanceOf(ctx.user);
  if (!shares || shares === 0n) {
    setTx("你的份额为 0，无法赎回。");
    return;
  }

  const signerVault = ctx.vault.connect(ctx.signer);
  setTx("赎回中（redeem 全部份额）…");
  const tx = await signerVault.redeem(shares, ctx.user, ctx.user);
  await tx.wait();
  setTx("赎回成功。");
  await refreshStatus();
}

async function main() {
  const btnConnectWallet = document.getElementById("btnConnectWallet");
  const btnDeposit = document.getElementById("btnDeposit");
  const btnRedeemAll = document.getElementById("btnRedeemAll");
  const btnApplyCampVaultConfig = document.getElementById("btnApplyCampVaultConfig");
  const btnRefreshStatus = document.getElementById("btnRefreshStatus");
  const campVaultConfigSummaryEl = document.getElementById("campVaultConfigSummary");
  const campVaultAddressInput = document.getElementById("campVaultAddress");
  const btnGenerateUniswapMcpRequest = document.getElementById("btnGenerateUniswapMcpRequest");
  const btnCopyMcpRequest = document.getElementById("btnCopyMcpRequest");
  const mcpRequestEl = document.getElementById("mcpRequest");
  const mcpRequestHintEl = document.getElementById("mcpRequestHint");
  const agentJsonInput = document.getElementById("agentJsonInput");
  const btnParseAgentJson = document.getElementById("btnParseAgentJson");
  const btnClearAgentJson = document.getElementById("btnClearAgentJson");
  const agentStage1Output = document.getElementById("agentStage1Output");
  const agentStage2Output = document.getElementById("agentStage2Output");
  const agentStage3Output = document.getElementById("agentStage3Output");

  const inputs = {
    deposit: document.getElementById("cvDeposit"),
    horizon: document.getElementById("cvHorizonDays"),
    risk: document.getElementById("cvRisk")
  };

  // 点击“应用参数”后把策略约束锁定，后续生成请求只使用锁定值，保证演示一致性。
  let lockedConfig = null;

  function readCurrentConfig() {
    const dep = inputs.deposit ? Number(inputs.deposit.value || 0) : 0;
    const horizonDays = inputs.horizon ? Number(inputs.horizon.value || 0) : 0;
    const risk = inputs.risk ? String(inputs.risk.value || "conservative") : "conservative";
    return { dep, horizonDays, risk };
  }

  function formatMcpRequestText(cfg) {
    // 固定 slippage/deadline，风险 conservative/medium 只用于 tick 区间与策略倾向。
    const depStr = String(cfg.dep);
    const horizonDaysStr = String(cfg.horizonDays);
    const riskStr = cfg.risk;
    const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const baseWeth = "0x4200000000000000000000000000000000000006";

    return [
      "你是 CampVault Agent（MVP）。",
      "",
      "链：Base Mainnet（chainId / chain_id = " + BASE_MAINNET_CHAIN_ID + "）；与 Uniswap MCP 报价一致，勿使用 Base Sepolia（84532），Trading API 不支持。",
      "",
      "任务：为 7 天（Horizon = " + horizonDaysStr + "）单币 USDC 策略生成 Uniswap LP 建仓计划。",
      "你必须调用 Uniswap MCP 获取报价/路由（quote+route）。",
      "LP 参数（tickLower/tickUpper/fee/slippage）允许由 Uniswap AI skills 生成（不要求只能从 MCP 获得），但必须真实可计算，不能编造。",
      "",
      "演示顺序要求（仍然在同一个回复的 JSON 里完成）：",
      "1) 第一步：返回 quote + route（exactIn = Deposit）",
      "2) 第二步：返回 LP 建仓计划参数（fee tier / tickLower / tickUpper / 建仓 swap 数量 / slippage / deadlineMinutes）",
      "3) 第三步：返回可验证执行证据（txHash 或模拟成功结果/调用预览 calldataOrTxPreview）",
      "",
      "约束：",
      "- Deposit（USDC）：" + depStr,
      "- Horizon：7 days（演示输入 horizon = " + horizonDaysStr + "）",
      "- Risk：" + riskStr + "（用于 tick 区间宽窄与策略倾向：conservative 更保守更集中）",
      "- 目标交易对：USDC / WETH（V3 或 V4 以 MCP 支持为准）",
      "",
      "强约束：",
      "- quote/route（以及 minimumReceived/priceImpact 等 quote 相关字段）必须来自 Uniswap MCP（通过 tool 输出解析得到）。",
      "- lpPlan 与 execution 若无法通过已加载的 Uniswap AI skills 与/或 MCP 获得，则必须写入 `error`，并把对应字段留空（\"\" 或 null），不要编造占位值。",
      "- 最终仅返回单个 JSON 对象，且不得包含其他任何文本。",
      "",
      "输出 schema（严格保持字段存在性；仅允许值为空/空数组/null；error 为空表示成功）：",
      '{',
      '  "chainId": ' + BASE_MAINNET_CHAIN_ID + ',',
      '  "pair": ["USDC","WETH"],',
      '  "feeTierOrPool": {"selected":"","candidates":[],"reason":""},',
      '  "quote": {"amountIn":"' + depStr + '","estimatedOut":"","minimumReceived":"","route":"","priceImpact":""},',
      '  "lpPlan": {"tickLower":"","tickUpper":"","amountUSDCToSwap":"","slippage":"0.5%","deadlineMinutes":20},',
      '  "execution": {"calldataOrTxPreview":"","txHash":null},',
      '  "error": null',
      '}',
      "",
      "MCP 工具调用指引（优先级从高到低）：",
      "- 用 clawncher_uniswap_swap 生成 quote：设置 quote_only=true，token_in=" + baseUsdc + "，token_out=" + baseWeth + "，amount=" + depStr + "，chain_id=" + BASE_MAINNET_CHAIN_ID + "，slippage_bps=50。",
      "- 从该 tool 的返回文本中解析出：estimatedOut、minimumReceived、priceImpact、route（放到 quote.route 里，允许是字符串或序列化后的结构）。",
      "计算要求：",
      "- lpPlan：使用 Uniswap AI skills，基于 7 天期限与风险 conservative，给出 tickLower/tickUpper 与 amountUSDCToSwap（单币入场先换部分 WETH）。",
      "- execution：MVP 阶段可以返回 calldataOrTxPreview（若 skills 提供），或返回模拟成功结果的预览；若做不到真实/模拟证据，则在 error 里说明原因。"
    ].join("\n");
  }

  // 尝试读取本地部署地址：/addresses.json（由 init-local 写入）
  // 这样你不必每次手动粘贴 CampVault 合约地址。
  if (campVaultAddressInput && (!campVaultAddressInput.value || !campVaultAddressInput.value.trim())) {
    try {
      const res = await fetch("/addresses.json");
      if (res.ok) {
        const data = await res.json();
        if (data && data.campVault) campVaultAddressInput.value = data.campVault;
      }
    } catch (_) {
      // ignore
    }
  }

  if (btnApplyCampVaultConfig && campVaultConfigSummaryEl) {
    btnApplyCampVaultConfig.onclick = function () {
      const cfg = readCurrentConfig();
      if (!Number.isFinite(cfg.dep) || cfg.dep <= 0) {
        campVaultConfigSummaryEl.textContent = "Deposit 金额无效（必须 > 0）。";
        return;
      }
      if (!Number.isFinite(cfg.horizonDays) || cfg.horizonDays < 1) {
        campVaultConfigSummaryEl.textContent = "Horizon 天数无效（必须 >= 1）。";
        return;
      }

      lockedConfig = cfg;
      const depEl = inputs.deposit;
      const horizonEl = inputs.horizon;
      const riskEl = inputs.risk;
      if (depEl) depEl.disabled = true;
      if (horizonEl) horizonEl.disabled = true;
      if (riskEl) riskEl.disabled = true;

      campVaultConfigSummaryEl.textContent =
        "已固定策略约束：Deposit " + String(cfg.dep) + " USDC；Horizon " + String(cfg.horizonDays) + " days；Risk " + String(cfg.risk) + "。";
    };
  }

  if (btnGenerateUniswapMcpRequest && mcpRequestEl) {
    btnGenerateUniswapMcpRequest.onclick = function () {
      if (!lockedConfig) {
        if (mcpRequestHintEl) mcpRequestHintEl.textContent = "请先点击“应用参数（固定策略约束）”，锁定 Deposit/Horizon/Risk 后再生成请求。";
        return;
      }
      const text = formatMcpRequestText(lockedConfig);
      mcpRequestEl.value = text;
      if (mcpRequestHintEl)
        mcpRequestHintEl.textContent =
          "已生成请求文本（已锁定策略约束）：下一步点击“复制”，粘贴给 CampVault Agent；它会按 quote/route → LP → 可验证执行 三段返回同一个 JSON。";
    };
  }

  if (btnCopyMcpRequest && mcpRequestEl) {
    btnCopyMcpRequest.onclick = async function () {
      try {
        await navigator.clipboard.writeText(mcpRequestEl.value || "");
        if (mcpRequestHintEl) mcpRequestHintEl.textContent = "已复制到剪贴板。";
      } catch (e) {
        if (mcpRequestHintEl) mcpRequestHintEl.textContent = "复制失败：请手动全选复制。";
      }
    };
  }

  function renderStageOutputs(agentJson) {
    // 默认清空
    if (agentStage1Output) agentStage1Output.textContent = "—";
    if (agentStage2Output) agentStage2Output.textContent = "—";
    if (agentStage3Output) agentStage3Output.textContent = "—";

    if (!agentJson || typeof agentJson !== "object") return;
    if (Object.keys(agentJson).length === 0) return;

    if (agentJson.error) {
      const errMsg = typeof agentJson.error === "string" ? agentJson.error : JSON.stringify(agentJson.error);
      if (agentStage1Output) agentStage1Output.textContent = "error：" + errMsg;
      if (agentStage2Output) agentStage2Output.textContent = "—（因为上一步失败）";
      if (agentStage3Output) agentStage3Output.textContent = "—（因为上一步失败）";
      return;
    }

    const fee = agentJson.feeTierOrPool || {};
    const quote = agentJson.quote || {};
    const lpPlan = agentJson.lpPlan || {};
    const exec = agentJson.execution || {};

    if (agentStage1Output) {
      agentStage1Output.textContent = [
        "feeTierOrPool.selected: " + (fee.selected || ""),
        "quote.amountIn: " + (quote.amountIn || ""),
        "quote.estimatedOut: " + (quote.estimatedOut || ""),
        "quote.minimumReceived: " + (quote.minimumReceived || ""),
        "quote.priceImpact: " + (quote.priceImpact || ""),
        "quote.route: " + (quote.route || ""),
      ].join("\n");
    }

    if (agentStage2Output) {
      agentStage2Output.textContent = [
        "lpPlan.tickLower: " + (lpPlan.tickLower || ""),
        "lpPlan.tickUpper: " + (lpPlan.tickUpper || ""),
        "lpPlan.amountUSDCToSwap: " + (lpPlan.amountUSDCToSwap || ""),
        "lpPlan.slippage: " + (lpPlan.slippage || ""),
        "lpPlan.deadlineMinutes: " + String(lpPlan.deadlineMinutes ?? ""),
      ].join("\n");
    }

    if (agentStage3Output) {
      agentStage3Output.textContent = [
        "execution.txHash: " + (exec.txHash || null),
        "execution.calldataOrTxPreview: " + (exec.calldataOrTxPreview || ""),
      ].join("\n");
    }
  }

  if (btnParseAgentJson && agentJsonInput) {
    btnParseAgentJson.onclick = function () {
      const raw = agentJsonInput.value || "";
      if (!raw.trim()) {
        if (agentStage1Output) agentStage1Output.textContent = "请先粘贴 JSON。";
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        renderStageOutputs(parsed);
      } catch (e) {
        if (agentStage1Output) agentStage1Output.textContent = "JSON 解析失败：" + (e.message || String(e));
        if (agentStage2Output) agentStage2Output.textContent = "—";
        if (agentStage3Output) agentStage3Output.textContent = "—";
      }
    };
  }

  if (btnClearAgentJson && agentJsonInput) {
    btnClearAgentJson.onclick = function () {
      agentJsonInput.value = "";
      renderStageOutputs({});
    };
  }

  if (btnConnectWallet) {
    btnConnectWallet.onclick = async function () {
      try {
        const account = await connectWallet();
        const connectedAddress = document.getElementById("connectedAddress");
        if (connectedAddress) connectedAddress.textContent = shortAddress(account);
        await refreshStatus();
      } catch (e) {
        setTx("连接失败: " + (e.message || String(e)));
      }
    };
  }

  if (btnRefreshStatus) {
    btnRefreshStatus.onclick = async function () {
      await refreshStatus();
    };
  }

  if (btnDeposit) {
    btnDeposit.onclick = async function () {
      try {
        await deposit();
      } catch (e) {
        setTx("Deposit 失败: " + (e.message || String(e)));
      }
    };
  }

  if (btnRedeemAll) {
    btnRedeemAll.onclick = async function () {
      try {
        await redeemAll();
      } catch (e) {
        setTx("Redeem 失败: " + (e.message || String(e)));
      }
    };
  }

  // 初始刷新（无钱包也能显示，但可能加载失败）
  await refreshStatus();
}

main().catch((e) => {
  console.error(e);
  setVaultStatus("初始化失败: " + (e.message || String(e)), true);
});


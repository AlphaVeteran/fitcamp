(function () {
  "use strict";
  var ethers = window.ethers;
  if (!ethers) {
    document.getElementById("status").textContent = "正在加载 ethers.js…";
    var t = 0;
    var id = setInterval(function () {
      ethers = window.ethers;
      if (ethers) {
        clearInterval(id);
        run(ethers);
      } else if (++t > 100) {
        clearInterval(id);
        document.getElementById("status").textContent = "ethers 未加载，请检查网络或刷新页面。";
        document.getElementById("status").className = "error";
      }
    }, 100);
    return;
  }
  run(ethers);

  function run(ethers) {
    var RPC = window.location.origin + "/rpc";
    var CHALLENGE_DAYS = 7;
    var isTestnetMode = false;
    var walletModeOnLocal = false;
    var testnetSigner = null;

    // Hardhat 默认前 5 个账户私钥，与 init-local 部署时使用的完全一致（仅本地开发）
    var HARDHAT_PRIVATE_KEYS = [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    ];

    var provider, addresses, abis, wallets;
    var fitCamp, usdc;
    var uiStarted = false;
    var uiCheckInEnded = false;
    var uiSettled = false;

    var userSelect = document.getElementById("userSelect");
    var userSelectWrap = document.getElementById("userSelectWrap");
    var connectWalletWrap = document.getElementById("connectWalletWrap");
    var btnConnectWallet = document.getElementById("btnConnectWallet");
    var connectedAddressEl = document.getElementById("connectedAddress");
    var CONNECT_WALLET_BTN_TEXT = "连接钱包 (Base Sepolia)";

    function shortAddress(addr) {
      if (!addr) return "";
      var a = addr.slice(0, 2) === "0x" ? addr.slice(2) : addr;
      return "0x" + a.slice(0, 6) + "…" + a.slice(-4);
    }

    function setConnectedWalletUI(connected) {
      if (connected && testnetSigner) {
        if (btnConnectWallet) {
          btnConnectWallet.textContent = shortAddress(testnetSigner.address);
          btnConnectWallet.disabled = true;
          btnConnectWallet.style.display = "";
        }
        if (connectedAddressEl) connectedAddressEl.textContent = "";
      } else {
        if (btnConnectWallet) {
          btnConnectWallet.textContent = CONNECT_WALLET_BTN_TEXT;
          btnConnectWallet.disabled = false;
          btnConnectWallet.style.display = "";
        }
        if (connectedAddressEl) connectedAddressEl.textContent = "";
      }
    }
    var localWalletWrap = document.getElementById("localWalletWrap");
    var btnConnectLocal = document.getElementById("btnConnectLocal");
    var btnDisconnectLocal = document.getElementById("btnDisconnectLocal");
    var kPanel = document.getElementById("kPanel");
    var userPanel = document.getElementById("userPanel");
    var btnStart = document.getElementById("btnStart");
    var btnEnd = document.getElementById("btnEnd");
    var btnApproveUsdc = document.getElementById("btnApproveUsdc");
    var btnJoin = document.getElementById("btnJoin");
    var btnCheckIn = document.getElementById("btnCheckIn");
    var btnWithdraw = document.getElementById("btnWithdraw");
    var btnRefreshStatus = document.getElementById("btnRefreshStatus");
    var userPanelHint = document.getElementById("userPanelHint");
    var btnWithdrawDust = document.getElementById("btnWithdrawDust");
    var mintUsdcWrap = document.getElementById("mintUsdcWrap");
    var btnMintUsdc = document.getElementById("btnMintUsdc");
    var mintUsdcAddress = document.getElementById("mintUsdcAddress");
    var btnNewRound = document.getElementById("btnNewRound");
    var newRoundDurationSelect = document.getElementById("newRoundDuration");
    var currentRoundLabel = document.getElementById("currentRoundLabel");
    var participantInfo = document.getElementById("participantInfo");
    var settlementResult = document.getElementById("settlementResult");
    var campPoolBalance = document.getElementById("campPoolBalance");
    var myFitNFTList = document.getElementById("myFitNFTList");
    var myFitNFTTip = document.getElementById("myFitNFTTip");
    var statusEl = document.getElementById("status");
    var txEl = document.getElementById("tx");
    var chainLabelEl = document.getElementById("chainLabel");

    function getOwnerWallet() {
      if ((isTestnetMode || walletModeOnLocal) && testnetSigner) return testnetSigner;
      return wallets[0];
    }

    function deriveWallets() {
      return HARDHAT_PRIVATE_KEYS.map(function (pk) {
        return new ethers.Wallet(pk, provider);
      });
    }

    function userKey() {
      return userSelect.value;
    }

    function currentWallet() {
      if ((isTestnetMode || walletModeOnLocal) && testnetSigner) return testnetSigner;
      var k = userKey();
      return wallets[{ K: 0, A: 1, B: 2, C: 3, D: 4 }[k]];
    }

    function isK() {
      if (isTestnetMode || walletModeOnLocal) return !!window._isK;
      return userKey() === "K";
    }

    var ACCOUNT_LABELS = { K: "群主 owner", A: "会员 Alice", B: "会员 Bob", C: "会员 Carol", D: "会员 David" };
    function displayNameForAddress(addr) {
      if (!addresses || !addresses.accounts) return (addr || "").slice(0, 8) + "…" + (addr || "").slice(-6);
      var a = (addr || "").toLowerCase();
      for (var key in addresses.accounts) {
        if (addresses.accounts[key] && addresses.accounts[key].toLowerCase() === a)
          return ACCOUNT_LABELS[key] || (addr || "").slice(0, 8) + "…" + (addr || "").slice(-6);
      }
      return (addr || "").slice(0, 8) + "…" + (addr || "").slice(-6);
    }

    async function loadContracts() {
      var addrRes = await fetch("addresses.json");
      var abiRes = await fetch("abis.json");
      if (abiRes.ok && addrRes.ok) {
        addresses = await addrRes.json();
        abis = await abiRes.json();
        provider = new ethers.JsonRpcProvider(RPC);
        wallets = deriveWallets();
        fitCamp = new ethers.Contract(addresses.fitCamp, abis.FitCamp, provider);
        usdc = new ethers.Contract(addresses.mockUsdc, abis.MockUSDC, provider);
        if (userSelectWrap) userSelectWrap.style.display = "";
        if (connectWalletWrap) connectWalletWrap.style.display = "none";
        if (localWalletWrap) localWalletWrap.style.display = walletModeOnLocal ? "none" : "block";
        if (connectWalletWrap && walletModeOnLocal && testnetSigner) {
          connectWalletWrap.style.display = "block";
          userSelectWrap.style.display = "none";
          setConnectedWalletUI(true);
        }
        if (btnConnectLocal) btnConnectLocal.onclick = connectWalletForLocal;
        return true;
      }
      var baseRes = await fetch("addresses.base-sepolia.json");
      if (abiRes.ok && baseRes.ok) {
        addresses = await baseRes.json();
        abis = await abiRes.json();
        var fitCampAddr = addresses && addresses.fitCamp && String(addresses.fitCamp).trim();
        var mockUsdcAddr = addresses && addresses.mockUsdc && String(addresses.mockUsdc).trim();
        var fitNftAddr = addresses && addresses.fitNFT && String(addresses.fitNFT).trim();
        if (!fitCampAddr || !mockUsdcAddr || !fitNftAddr) {
          statusEl.textContent = "addresses.base-sepolia.json 缺少 fitCamp / mockUsdc / fitNFT 或为空，请检查配置。";
          statusEl.className = "error";
          return false;
        }
        addresses.fitCamp = fitCampAddr;
        addresses.mockUsdc = mockUsdcAddr;
        addresses.fitNFT = fitNftAddr;
        RPC = (addresses && addresses.rpcUrl) ? addresses.rpcUrl : "https://sepolia.base.org";
        isTestnetMode = true;
        provider = new ethers.JsonRpcProvider(RPC);
        wallets = [];
        fitCamp = new ethers.Contract(addresses.fitCamp, abis.FitCamp, provider);
        usdc = new ethers.Contract(addresses.mockUsdc, abis.MockUSDC, provider);
        if (userSelectWrap) userSelectWrap.style.display = "none";
        if (connectWalletWrap) connectWalletWrap.style.display = "block";
        if (localWalletWrap) localWalletWrap.style.display = "none";
        if (btnDisconnectLocal) btnDisconnectLocal.style.display = "none";
        statusEl.textContent = "测试网模式 (Base Sepolia)。请连接钱包。";
        statusEl.className = "info";
        if (btnConnectWallet) {
          btnConnectWallet.onclick = connectTestnetWallet;
        }
        return true;
      }
      statusEl.textContent = "请先运行: npx hardhat node，再运行: npx hardhat run scripts/init-local.ts --network localhost，并用 npm run serve 启动；或部署到测试网并配置 addresses.base-sepolia.json。";
      statusEl.className = "error";
      return false;
    }

    async function connectTestnetWallet() {
      if (!window.ethereum) {
        setTx("请安装 MetaMask 或支持 Base Sepolia 的钱包。");
        return;
      }
      setTx("连接中…");
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        var chainId = await window.ethereum.request({ method: "eth_chainId" });
        var wantChainId = "0x14a34";
        if (chainId !== wantChainId) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: wantChainId }],
            });
          } catch (e) {
            setTx("请手动在钱包中切换到 Base Sepolia 网络 (chainId 84532)。");
            return;
          }
        }
        var browserProvider = new ethers.BrowserProvider(window.ethereum);
        testnetSigner = await browserProvider.getSigner();
        setConnectedWalletUI(true);
        setTx("");
        uiStarted = true;
        refreshStatus();
      } catch (e) {
        setTx("连接失败: " + (e.message || e));
      }
    }

    async function connectWalletForLocal() {
      if (!window.ethereum) {
        setTx("请安装 MetaMask 或 Rabby 等钱包，用于模拟测试网操作。");
        return;
      }
      setTx("连接中…");
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        var chainId = await window.ethereum.request({ method: "eth_chainId" });
        var wantChainId = "0x7a69";
        if (chainId !== wantChainId) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: wantChainId }],
            });
          } catch (e) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: wantChainId,
                  chainName: "Hardhat Local",
                  rpcUrls: [window.location.origin + "/rpc"],
                }],
              });
              await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: wantChainId }] });
            } catch (e2) {
              setTx("请手动在钱包中添加网络：链 ID 31337，RPC " + (window.location.origin + "/rpc"));
              return;
            }
          }
        }
        var browserProvider = new ethers.BrowserProvider(window.ethereum);
        testnetSigner = await browserProvider.getSigner();
        walletModeOnLocal = true;
        if (userSelectWrap) userSelectWrap.style.display = "none";
        if (localWalletWrap) localWalletWrap.style.display = "none";
        if (connectWalletWrap) connectWalletWrap.style.display = "block";
        setConnectedWalletUI(true);
        if (btnDisconnectLocal) btnDisconnectLocal.style.display = "";
        setTx("已用钱包连接本地链，操作与测试网一致（需在钱包中确认交易）。");
        uiStarted = true;
        refreshStatus();
      } catch (e) {
        setTx("连接失败: " + (e.message || e));
      }
    }

    function disconnectLocalWallet() {
      testnetSigner = null;
      walletModeOnLocal = false;
      if (userSelectWrap) userSelectWrap.style.display = "";
      if (localWalletWrap) localWalletWrap.style.display = "block";
      if (connectWalletWrap) connectWalletWrap.style.display = "none";
      if (btnDisconnectLocal) btnDisconnectLocal.style.display = "none";
      setConnectedWalletUI(false);
      setTx("");
      refreshStatus();
    }

    async function tryRestoreWalletConnection() {
      if (!window.ethereum || !isTestnetMode) return;
      try {
        var accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) return;
        var chainId = await window.ethereum.request({ method: "eth_chainId" });
        if (chainId !== "0x14a34") return;
        var browserProvider = new ethers.BrowserProvider(window.ethereum);
        testnetSigner = await browserProvider.getSigner();
        if (connectWalletWrap) connectWalletWrap.style.display = "block";
        setConnectedWalletUI(true);
        if (btnDisconnectLocal) btnDisconnectLocal.style.display = "none";
        refreshStatus();
      } catch (_) {}
    }

    function setupWalletEvents() {
      if (!window.ethereum) return;
      window.ethereum.on("accountsChanged", function (accounts) {
        if (!(isTestnetMode || walletModeOnLocal)) return;
        if (!accounts || accounts.length === 0) {
          testnetSigner = null;
          refreshStatus();
        } else {
          (async function () {
            try {
              var browserProvider = new ethers.BrowserProvider(window.ethereum);
              testnetSigner = await browserProvider.getSigner();
              setConnectedWalletUI(true);
              refreshStatus();
            } catch (_) {
              testnetSigner = null;
              refreshStatus();
            }
          })();
        }
      });
      window.ethereum.on("chainChanged", function () {
        testnetSigner = null;
        if (isTestnetMode || walletModeOnLocal) refreshStatus();
      });
    }

    function setTx(msg) {
      txEl.textContent = msg || "";
    }

    function testnetTxOverrides() {
      return isTestnetMode && addresses && addresses.chainId != null ? { chainId: addresses.chainId } : {};
    }

    function showConnectWalletUI() {
      if (connectWalletWrap) connectWalletWrap.style.display = "block";
      setConnectedWalletUI(false);
      if (btnDisconnectLocal && walletModeOnLocal) btnDisconnectLocal.style.display = "none";
    }

    async function refreshStatus() {
      if ((isTestnetMode || walletModeOnLocal) && !testnetSigner) {
        showConnectWalletUI();
        if (statusEl && isTestnetMode) {
          statusEl.textContent = "测试网模式 (Base Sepolia)。请连接钱包。";
          statusEl.className = "info";
        }
        return;
      }
      var w = currentWallet();
      var addr = w.address;
      if ((isTestnetMode || walletModeOnLocal) && testnetSigner) {
        try {
          window._isK = (await fitCamp.owner()) === testnetSigner.address;
        } catch (_) {
          window._isK = false;
        }
      }
      var ethBalance = "—";
      var usdcBalance = "—";
      var hasStaked = false;
      var checkInCount = 0;
      var isWithdrawn = false;
      var roundEndTime = 0;
      var settled = false;
      var challengeOver = false;
      var currentRoundId = 0;
      var withdrawableRoundId = null;
      var isLocalChain = false;

      try {
        var network = await provider.getNetwork();
        var chainIdNum = Number(network.chainId);
        isLocalChain = (chainIdNum === 31337);
        if (chainLabelEl) chainLabelEl.textContent = isLocalChain ? "Local · 31337" : (chainIdNum === 84532 ? "Base Sepolia" : "Chain " + chainIdNum);
        var block = await provider.getBlock("latest");
        var now = block ? Number(block.timestamp) : 0;
        ethBalance = ethers.formatEther(await provider.getBalance(addr));
        usdcBalance = ethers.formatUnits(await usdc.balanceOf(addr), 6);
        currentRoundId = Number(await fitCamp.currentRoundId());
        var u = await fitCamp.participants(currentRoundId, addr);
        hasStaked = u.hasStaked;
        checkInCount = Number(u.checkInCount);
        isWithdrawn = u.isWithdrawn;
        roundEndTime = Number(await fitCamp.roundEndTime(currentRoundId));
        settled = await fitCamp.isSettled(currentRoundId);
        challengeOver = now >= roundEndTime;
        window._roundOpenForJoin = !!(await fitCamp.roundOpenForJoin(currentRoundId));

        for (var r = 0; r <= currentRoundId; r++) {
          var end = Number(await fitCamp.roundEndTime(r));
          if (now < end) continue;
          var ur = await fitCamp.participants(r, addr);
          if (!ur.hasStaked || ur.isWithdrawn || Number(ur.checkInCount) < 7) continue;
          withdrawableRoundId = r;
          break;
        }
        window._currentRoundSettled = settled;
        window._currentRoundId = currentRoundId;
        var wc = 0, wwc = 0;
        if (currentRoundId >= 0) {
          wc = Number(await fitCamp.winnersCount(currentRoundId));
          wwc = Number(await fitCamp.winnersWithdrawnCount(currentRoundId));
          var campBalance = await usdc.balanceOf(addresses.fitCamp);
          window._canWithdrawDust = settled && wwc === wc && campBalance > 0n;
        window._campBalance = campBalance;
        } else {
          window._canWithdrawDust = false;
          window._campBalance = 0n;
        }
        window._canStartNewRound = challengeOver && settled && wwc === wc;
        window._challengeOver = challengeOver;
        window._isLocalChain = isLocalChain;

        if (myFitNFTList && addresses && addresses.fitNFT) {
          var nftList = [];
          for (var rn = 0; rn <= currentRoundId; rn++) {
            var claimedN = await fitCamp.hasClaimedFitNFT(rn, addr);
            if (!claimedN) continue;
            var tid = await fitCamp.claimedFitNFTTokenId(rn, addr);
            if (tid && tid !== 0n) nftList.push({ round: rn, tokenId: tid });
          }
          if (nftList.length === 0) {
            myFitNFTList.textContent = "暂无";
            if (myFitNFTTip) myFitNFTTip.textContent = "";
          } else {
            myFitNFTList.textContent = nftList.map(function (x) {
              return "Token #" + x.tokenId + "（第 " + (x.round + 1) + " 期获胜者）";
            }).join("\n");
            if (myFitNFTTip) myFitNFTTip.textContent = "在 MetaMask 中：NFT → 导入 NFT，合约地址填 " + addresses.fitNFT.slice(0, 8) + "…" + addresses.fitNFT.slice(-6) + "，Token ID 填上表数字。";
          }
        }
      } catch (e) {
        var msg = e.message || String(e);
        if (msg.indexOf("could not decode result") !== -1 || msg.indexOf("BAD_DATA") !== -1) {
          msg = "合约地址与当前链不一致。请先启动本地链（npm run node），再在另一终端运行 npm run init-local，然后刷新本页。";
        } else {
          msg = "读取状态失败: " + msg;
        }
        statusEl.textContent = msg;
        statusEl.className = "error";
        return;
      }

      var lines = [
        "当期: 第 " + (currentRoundId + 1) + " 期",
        "当期已开放报名: " + (window._roundOpenForJoin ? "是" : "否"),
        "地址: " + addr,
        "ETH: " + ethBalance,
        "USDC: " + usdcBalance,
        "已参加当期: " + (hasStaked ? "是" : "否"),
        "当期打卡次数: " + checkInCount,
        "当期已提现: " + (isWithdrawn ? "是" : "否"),
        "当期结束时间戳: " + roundEndTime,
        "当期已结算: " + (settled ? "是" : "否"),
      ];
      statusEl.textContent = lines.join("\n");
      statusEl.className = "info";

      kPanel.style.display = isK() ? "block" : "none";
      userPanel.style.display = isK() ? "none" : "block";

      if (currentRoundLabel) currentRoundLabel.textContent = "当前：第 " + (currentRoundId + 1) + " 期";
      var canWithdraw = withdrawableRoundId !== null;
      if (btnWithdrawDust) {
        btnWithdrawDust.disabled = !window._canWithdrawDust;
        btnWithdrawDust.title = window._canWithdrawDust ? "" : "需本期已结算且所有获胜者已提现（或无获胜者时直接可提）、合约有余额时可用";
      }
      if (btnEnd) {
        var endAllowed = isLocalChain || !isTestnetMode || window._challengeOver;
        btnEnd.disabled = !isK() || settled;
        btnEnd.title = settled ? "本期已结算，无需重复操作" : (!endAllowed ? "测试网需等当期结束时间到达后再点（点后会提示）" : "点击执行结算（本地将自动快进 7 天并结算）");
      }
      if (campPoolBalance) {
        if (isK()) {
          var bal = window._campBalance != null ? window._campBalance : 0n;
          campPoolBalance.textContent = "目前奖金池总金额：" + ethers.formatUnits(bal, 6) + " USDC";
          campPoolBalance.style.display = "";
        } else {
          campPoolBalance.style.display = "none";
        }
      }
      if (mintUsdcWrap) mintUsdcWrap.style.display = isK() && isTestnetMode ? "block" : "none";
      if (btnNewRound) {
        var canOpenCurrentRound = !window._roundOpenForJoin && !challengeOver;
        btnNewRound.disabled = (window._roundOpenForJoin && !challengeOver) || (challengeOver && !window._canStartNewRound);
        if (canOpenCurrentRound) {
          btnNewRound.title = "点击开放本期报名，用户即可缴纳定金参与";
        } else if (window._canStartNewRound) {
          btnNewRound.title = "本期已结束且已结算，可开启下一期";
        } else if (!challengeOver) {
          btnNewRound.title = "本期已开放报名；期结束后请先点「结束打卡」完成结算，再点此开启下一期";
        } else if (!settled) {
          btnNewRound.title = "请先点「结束打卡」完成结算后再开启下一期";
        } else {
          btnNewRound.title = "请等待所有获胜者提现后再开启下一期";
        }
      }

      btnJoin.disabled = !window._roundOpenForJoin || hasStaked || challengeOver;
      if (btnJoin) {
        if (!window._roundOpenForJoin && !challengeOver) btnJoin.title = "请等待群主先点「开始打卡」或「新建 FitCamp」开放报名";
        else if (challengeOver && !hasStaked) btnJoin.title = "本期已结束，请等待群主开启下一期";
        else btnJoin.title = "";
      }
      btnCheckIn.disabled = !window._roundOpenForJoin || challengeOver || !hasStaked;
      btnWithdraw.disabled = !canWithdraw;
      window._withdrawableRoundId = withdrawableRoundId;
      if (userPanelHint) {
        if (!isK() && !window._roundOpenForJoin && !challengeOver)
          userPanelHint.textContent = "本期尚未开放报名（见上方「当前状态」）。请群主在群主界面点「开始打卡」并确认交易成功；或点「新建 FitCamp」开放报名。同一网络、同一合约下用户点「刷新状态」后即可缴纳定金。";
        else
          userPanelHint.textContent = "";
      }
    }

    async function main() {
      var ok = await loadContracts();
      if (!ok) return;

      setupWalletEvents();
      if (isTestnetMode) await tryRestoreWalletConnection();

      btnStart.onclick = async function () {
        if (participantInfo) participantInfo.textContent = "加载中…";
        try {
          var roundId = Number(await fitCamp.currentRoundId());
          var openForJoin = await fitCamp.roundOpenForJoin(roundId);
          var roundEnd = Number(await fitCamp.roundEndTime(roundId));
          var block = await provider.getBlock("latest");
          var now = block ? Number(block.timestamp) : 0;
          if (!openForJoin && now < roundEnd) {
            setTx("正在开放本期报名（开始打卡）…");
            var ownerWallet = getOwnerWallet();
            var tx = await fitCamp.connect(ownerWallet).openRoundForJoin(roundId, testnetTxOverrides());
            await tx.wait();
            uiStarted = true;
            setTx("已开始打卡，用户可缴纳定金并参与。");
          } else {
            setTx("已开始打卡。");
          }
          var list = await fitCamp.getParticipantList(roundId);
          var lines = ["参与人数：" + list.length + "（每人已缴 100 USDC 定金）"];
          for (var i = 0; i < list.length; i++) {
            var addr = list[i];
            lines.push(displayNameForAddress(addr) + " => 已缴 100 USDC 定金");
          }
          if (participantInfo) participantInfo.textContent = lines.join("\n");
        } catch (e) {
          setTx("开始打卡失败: " + (e.message || e));
          if (participantInfo) participantInfo.textContent = "";
        }
        refreshStatus();
      };

      btnEnd.onclick = async function () {
        var roundId = window._currentRoundId;
        if (roundId === undefined) roundId = Number(await fitCamp.currentRoundId());
        var alreadySettled = await fitCamp.isSettled(roundId);
        if (alreadySettled) {
          setTx("本期已结算，无需重复操作。");
          refreshStatus();
          return;
        }
        if (!window._isLocalChain && !window._challengeOver) {
          setTx("需等当期结束时间到达后再点（测试网按真实时间）。");
          return;
        }
        setTx("正在结束打卡并结算…");
        try {
          if (window._isLocalChain) {
            await provider.send("evm_increaseTime", [CHALLENGE_DAYS * 24 * 3600]);
            await provider.send("evm_mine", []);
          }
          uiCheckInEnded = true;
          var list = await fitCamp.getParticipantList(roundId);
          var winners = 0;
          for (var i = 0; i < list.length; i++) {
            var u = await fitCamp.participants(roundId, list[i]);
            if (Number(u.checkInCount) >= 7) winners++;
          }
          var ownerWallet = getOwnerWallet();
          if (winners > 0) {
            var tx = await fitCamp.connect(ownerWallet).settleRound(roundId, testnetTxOverrides());
            await tx.wait();
          } else {
            var tx2 = await fitCamp.connect(ownerWallet).settleRoundWithNoWinners(roundId, testnetTxOverrides());
            await tx2.wait();
          }
          setTx("已结束打卡并完成结算。");
          if (winners > 0 && addresses && addresses.fitNFT) {
            try {
              setTx("正在为优胜者铸造 Fit NFT…");
              var nextNonce = await provider.getTransactionCount(ownerWallet.address, "latest");
              var mintTx = await fitCamp.connect(ownerWallet).mintFitNFTsForRound(roundId, Object.assign({ nonce: nextNonce }, testnetTxOverrides()));
              await mintTx.wait();
              setTx("已结束打卡并完成结算，Fit NFT 已发放给优胜者。");
            } catch (mintErr) {
              setTx("已结束打卡并完成结算；Fit NFT 发放失败: " + (mintErr.message || mintErr));
            }
          }
          var rewardPer = await fitCamp.rewardPerWinner(roundId);
          var lines = ["结算结果（每人可获奖金）："];
          for (var j = 0; j < list.length; j++) {
            var addr = list[j];
            var u2 = await fitCamp.participants(roundId, addr);
            var amt = Number(u2.checkInCount) >= 7 ? rewardPer : 0n;
            lines.push(displayNameForAddress(addr) + " => " + ethers.formatUnits(amt, 6) + " USDC");
          }
          if (settlementResult) settlementResult.textContent = lines.join("\n");
        } catch (e) {
          setTx("结束打卡/结算失败: " + (e.message || e));
          if (settlementResult) settlementResult.textContent = "";
        }
        refreshStatus();
      };

      var STAKE_AMOUNT = 100n * 10n ** 6n;
      if (btnApproveUsdc) {
        btnApproveUsdc.onclick = async function () {
          var signer = currentWallet();
          if (!addresses || !addresses.fitCamp) {
            setTx("配置异常，无法授权。");
            return;
          }
          setTx("正在授权 FitCamp 使用 USDC…");
          try {
            var tx = await usdc.connect(signer).approve(addresses.fitCamp, ethers.MaxUint256, testnetTxOverrides());
            await tx.wait();
            setTx("已授权，可点「缴纳打卡定金」参与。");
          } catch (e) {
            setTx("授权失败: " + (e.message || e));
          }
          refreshStatus();
        };
      }
      btnJoin.onclick = async function () {
        var signer = currentWallet();
        var balance = await usdc.balanceOf(signer.address);
        if (balance < STAKE_AMOUNT) {
          setTx("USDC 余额不足（需 100 USDC）。当前 " + ethers.formatUnits(balance, 6) + " USDC。请让群主从部署账户转入测试 USDC 到你的地址，或使用已持有 USDC 的账户。");
          refreshStatus();
          return;
        }
        setTx("提交参加中…");
        try {
          var tx = await fitCamp.connect(signer).joinCamp(testnetTxOverrides());
          await tx.wait();
          setTx("参加成功。");
        } catch (e) {
          var msg = e.message || String(e);
          if (msg.indexOf("Round ended") !== -1) {
            setTx("本期已结束，无法参加。请等待群主「开启新一期」后在新期参加。");
          } else if (msg.indexOf("reverted") !== -1 && balance < STAKE_AMOUNT) {
            setTx("USDC 余额不足（需 100 USDC）。请让群主转入测试 USDC 到你的地址。");
          } else if (msg.indexOf("missing revert data") !== -1 || msg.indexOf("CALL_EXCEPTION") !== -1) {
            setTx("请先点「授权 FitCamp（100 USDC）」再点「缴纳打卡定金」。");
          } else if (msg.indexOf("reverted") !== -1 || msg.indexOf("Transfer") !== -1) {
            setTx("参加失败（可能未授权）。请先点「授权 FitCamp（100 USDC）」再缴纳定金。");
          } else {
            setTx("参加失败: " + msg);
          }
        }
        refreshStatus();
      };

      btnCheckIn.onclick = async function () {
        var signer = currentWallet();
        setTx("提交打卡中…");
        try {
          var tx = await fitCamp.connect(signer).checkIn(testnetTxOverrides());
          await tx.wait();
          setTx("打卡成功。");
        } catch (e) {
          setTx("打卡失败: " + (e.message || e));
        }
        refreshStatus();
      };

      btnWithdraw.onclick = async function () {
        var signer = currentWallet();
        var roundId = window._withdrawableRoundId;
        if (roundId === undefined || roundId === null) {
          setTx("无可提现期数。");
          return;
        }
        setTx("提现中（第 " + roundId + " 期）…");
        try {
          var tx = await fitCamp.connect(signer).settleAndWithdraw(roundId, testnetTxOverrides());
          await tx.wait();
          setTx("提现成功。");
        } catch (e) {
          setTx("提现失败: " + (e.message || e));
        }
        refreshStatus();
      };

      if (btnWithdrawDust) {
        btnWithdrawDust.onclick = async function () {
          if (!window._canWithdrawDust) {
            setTx("请先让完成 7 次打卡的用户点击「提现」，结算完成且有余数后再群主提现。");
            return;
          }
          var ownerWallet = getOwnerWallet();
          var roundId = window._currentRoundId;
          if (roundId === undefined) roundId = Number(await fitCamp.currentRoundId());
          setTx("群主提现（第 " + (roundId + 1) + " 期）…");
          try {
            var tx = await fitCamp.connect(ownerWallet).withdrawDust(roundId, testnetTxOverrides());
            await tx.wait();
            setTx("群主已提现。");
          } catch (e) {
            var msg = e.message || String(e);
            if (msg.indexOf("Round not settled") !== -1) {
              setTx("本期尚未结算。请先点「结束打卡」完成结算。");
            } else if (msg.indexOf("Not all winners withdrawn") !== -1) {
              setTx("尚有获胜者未提现，请等所有人提现后再群主提现。");
            } else if (msg.indexOf("No dust") !== -1) {
              setTx("本期无余数可提。");
            } else {
              setTx("提现失败: " + msg);
            }
          }
          refreshStatus();
        };
      }

      if (btnNewRound) {
        btnNewRound.onclick = async function () {
          var ownerWallet = getOwnerWallet();
          var roundId = window._currentRoundId;
          if (roundId === undefined) roundId = Number(await fitCamp.currentRoundId());
          if (!window._roundOpenForJoin && !window._challengeOver) {
            setTx("正在开放本期报名…");
            try {
              var tx = await fitCamp.connect(ownerWallet).openRoundForJoin(roundId, testnetTxOverrides());
              await tx.wait();
              uiStarted = true;
              setTx("本期已开放报名，用户可缴纳定金参与。");
            } catch (e) {
              setTx("开放报名失败: " + (e.message || e));
            }
          } else {
            var durationDays = newRoundDurationSelect ? Number(newRoundDurationSelect.value) : 7;
            setTx("建立新群 / 开启新一期（" + durationDays + " 天）…");
            try {
              var tx = await fitCamp.connect(ownerWallet).startNewRound(durationDays, testnetTxOverrides());
              await tx.wait();
              uiStarted = true;
              uiCheckInEnded = false;
              uiSettled = false;
              if (participantInfo) participantInfo.textContent = "";
              if (settlementResult) settlementResult.textContent = "";
              setTx("新一期已开启，用户可缴纳定金并打卡。");
            } catch (e) {
              var msg = e.message || String(e);
              if (msg.indexOf("Current round not settled") !== -1) {
                setTx("本期尚未结算。请先点「结束打卡」完成结算。");
              } else if (msg.indexOf("Not all winners withdrawn") !== -1) {
                setTx("尚有获胜者未提现，请等所有人提现后再开启新一期。");
              } else {
                setTx("开启失败: " + msg);
              }
            }
          }
          refreshStatus();
        };
      }

      userSelect.onchange = refreshStatus;
      if (btnDisconnectLocal) btnDisconnectLocal.onclick = disconnectLocalWallet;
      if (btnRefreshStatus) btnRefreshStatus.onclick = function () { setTx(""); refreshStatus(); };
      if (btnMintUsdc) {
        btnMintUsdc.onclick = async function () {
          var addr = mintUsdcAddress && mintUsdcAddress.value ? mintUsdcAddress.value.trim() : "";
          if (!addr || !ethers.isAddress(addr)) {
            setTx("请填写有效的用户地址（0x 开头）。");
            return;
          }
          setTx("正在铸造 100 测试 USDC…");
          try {
            var ownerWallet = getOwnerWallet();
            var tx = await usdc.connect(ownerWallet).mint(addr, 100n * 10n ** 6n, testnetTxOverrides());
            await tx.wait();
            setTx("已向 " + addr.slice(0, 10) + "… 铸造 100 测试 USDC。请让该用户对 FitCamp 做 approve 后再缴纳定金。");
          } catch (e) {
            setTx("铸造失败: " + (e.message || e));
          }
          refreshStatus();
        };
      }
      refreshStatus();
    }

    main();
  }
})();

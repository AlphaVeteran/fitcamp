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

    // Hardhat 默认前 4 个账户私钥，与 init-local 部署时使用的完全一致（仅本地开发）
    var HARDHAT_PRIVATE_KEYS = [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    ];

    var provider, addresses, abis, wallets;
    var fitCamp, usdc;
    var uiStarted = false;
    var uiCheckInEnded = false;
    var uiSettled = false;

    var userSelect = document.getElementById("userSelect");
    var kPanel = document.getElementById("kPanel");
    var userPanel = document.getElementById("userPanel");
    var btnStart = document.getElementById("btnStart");
    var btnEnd = document.getElementById("btnEnd");
    var btnSettle = document.getElementById("btnSettle");
    var btnJoin = document.getElementById("btnJoin");
    var btnCheckIn = document.getElementById("btnCheckIn");
    var btnWithdraw = document.getElementById("btnWithdraw");
    var btnWithdrawDust = document.getElementById("btnWithdrawDust");
    var btnSettleNoWinners = document.getElementById("btnSettleNoWinners");
    var btnNewRound = document.getElementById("btnNewRound");
    var statusEl = document.getElementById("status");
    var txEl = document.getElementById("tx");

    function deriveWallets() {
      return HARDHAT_PRIVATE_KEYS.map(function (pk) {
        return new ethers.Wallet(pk, provider);
      });
    }

    function userKey() {
      return userSelect.value;
    }

    function currentWallet() {
      var k = userKey();
      return wallets[{ K: 0, A: 1, B: 2, C: 3 }[k]];
    }

    function isK() {
      return userKey() === "K";
    }

    async function loadContracts() {
      var addrRes = await fetch("addresses.json");
      var abiRes = await fetch("abis.json");
      if (!addrRes.ok || !abiRes.ok) {
        statusEl.textContent = "请先运行: npx hardhat node，再运行: npx hardhat run scripts/init-local.ts --network localhost，并用 npm run serve 启动";
        statusEl.className = "error";
        return false;
      }
      addresses = await addrRes.json();
      abis = await abiRes.json();
      provider = new ethers.JsonRpcProvider(RPC);
      wallets = deriveWallets();
      fitCamp = new ethers.Contract(addresses.fitCamp, abis.FitCamp, provider);
      usdc = new ethers.Contract(addresses.mockUsdc, abis.MockUSDC, provider);
      return true;
    }

    function setTx(msg) {
      txEl.textContent = msg || "";
    }

    async function refreshStatus() {
      var w = currentWallet();
      var addr = w.address;
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

      try {
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
        if (currentRoundId >= 0 && settled) {
          var wc = Number(await fitCamp.winnersCount(currentRoundId));
          var wwc = Number(await fitCamp.winnersWithdrawnCount(currentRoundId));
          var campBalance = await usdc.balanceOf(addresses.fitCamp);
          window._canWithdrawDust = wc > 0 && wwc === wc && campBalance > 0n;
        } else {
          window._canWithdrawDust = false;
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
        "当期: 第 " + currentRoundId + " 期",
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

      var canWithdraw = withdrawableRoundId !== null;
      if (btnWithdrawDust) {
        btnWithdrawDust.style.display = isK() ? "inline-block" : "none";
        btnWithdrawDust.disabled = !window._canWithdrawDust;
        btnWithdrawDust.title = window._canWithdrawDust ? "" : "需本期已结算且所有获胜者已提现、合约有余数时可用";
      }
      if (btnNewRound) btnNewRound.style.display = isK() ? "inline-block" : "none";
      var canSettleNoWinners = isK() && challengeOver && !settled;
      if (btnSettleNoWinners) {
        btnSettleNoWinners.style.display = isK() ? "inline-block" : "none";
        btnSettleNoWinners.disabled = !canSettleNoWinners;
        btnSettleNoWinners.title = canSettleNoWinners ? "当期无人完成 7 次打卡时点此，再「提取余数」→「开启新一期」" : "";
      }

      btnJoin.disabled = !uiStarted || hasStaked || challengeOver;
      if (btnJoin) btnJoin.title = challengeOver && !hasStaked ? "本期已结束，请等待群主「开启新一期」" : "";
      btnCheckIn.disabled = !uiStarted || uiCheckInEnded || !hasStaked;
      btnSettle.disabled = !uiCheckInEnded;
      btnWithdraw.disabled = !canWithdraw;
      window._withdrawableRoundId = withdrawableRoundId;
    }

    async function main() {
      var ok = await loadContracts();
      if (!ok) return;

      btnStart.onclick = async function () {
    uiStarted = true;
    setTx("已开始打卡，其他用户可参加并打卡。");
    refreshStatus();
      };

      btnEnd.onclick = async function () {
        setTx("正在推进链上时间…");
        try {
          await provider.send("evm_increaseTime", [CHALLENGE_DAYS * 24 * 3600]);
          await provider.send("evm_mine", []);
          uiCheckInEnded = true;
          setTx("已结束打卡，用户打卡已关闭。");
        } catch (e) {
          setTx("结束打卡失败: " + (e.message || e));
        }
        refreshStatus();
      };

      btnSettle.onclick = function () {
    uiSettled = true;
    setTx("已结算。请切换用户查看余额并提现。");
    refreshStatus();
      };

      btnJoin.onclick = async function () {
        var signer = currentWallet();
        setTx("提交参加中…");
        try {
          var tx = await fitCamp.connect(signer).joinCamp();
          await tx.wait();
          setTx("参加成功。");
        } catch (e) {
          var msg = e.message || String(e);
          if (msg.indexOf("Round ended") !== -1) {
            setTx("本期已结束，无法参加。请等待群主「开启新一期」后在新期参加。");
          } else {
            setTx("参加失败: " + msg);
          }
        }
        refreshStatus();
      };

      btnCheckIn.onclick = async function () {
        var userAddr = currentWallet().address;
        var ownerWallet = wallets[0];
    setTx("提交打卡中（由群主 K 执行）…");
    try {
      const tx = await fitCamp.connect(ownerWallet).checkIn(userAddr);
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
          var tx = await fitCamp.connect(signer).settleAndWithdraw(roundId);
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
            setTx("请先让完成 7 次打卡的用户点击「提现」，结算完成且有余数后再提取余数。");
            return;
          }
          var ownerWallet = wallets[0];
          var roundId = window._currentRoundId;
          if (roundId === undefined) roundId = Number(await fitCamp.currentRoundId());
          setTx("提取第 " + roundId + " 期余数…");
          try {
            var tx = await fitCamp.connect(ownerWallet).withdrawDust(roundId);
            await tx.wait();
            setTx("余数已提取。");
          } catch (e) {
            var msg = e.message || String(e);
            if (msg.indexOf("Round not settled") !== -1) {
              setTx("本期尚未结算。请先让完成 7 次打卡的用户点击「提现」，再提取余数。");
            } else if (msg.indexOf("Not all winners withdrawn") !== -1) {
              setTx("尚有获胜者未提现，请等所有人提现后再提取余数。");
            } else if (msg.indexOf("No dust") !== -1) {
              setTx("本期无余数可提取。");
            } else {
              setTx("提取失败: " + msg);
            }
          }
          refreshStatus();
        };
      }

      if (btnSettleNoWinners) {
        btnSettleNoWinners.onclick = async function () {
          var ownerWallet = wallets[0];
          var roundId = window._currentRoundId;
          if (roundId === undefined) roundId = Number(await fitCamp.currentRoundId());
          setTx("无获胜者结算（第 " + roundId + " 期）…");
          try {
            var tx = await fitCamp.connect(ownerWallet).settleRoundWithNoWinners(roundId);
            await tx.wait();
            setTx("已标记为已结算，请点击「提取余数」再「开启新一期」。");
          } catch (e) {
            var msg = e.message || String(e);
            if (msg.indexOf("There are winners") !== -1) {
              setTx("本期有完成 7 次打卡的用户，请让他们先「提现」，再「提取余数」。");
            } else {
              setTx("操作失败: " + msg);
            }
          }
          refreshStatus();
        };
      }

      if (btnNewRound) {
        btnNewRound.onclick = async function () {
          var ownerWallet = wallets[0];
          setTx("开启新一期（" + CHALLENGE_DAYS + " 天）…");
          try {
            var tx = await fitCamp.connect(ownerWallet).startNewRound(CHALLENGE_DAYS);
            await tx.wait();
            uiStarted = true;
            uiCheckInEnded = false;
            uiSettled = false;
            setTx("新一期已开启，可参加并打卡。");
          } catch (e) {
            var msg = e.message || String(e);
            if (msg.indexOf("Current round not settled") !== -1) {
              setTx("本期尚未结算。若有获胜者请让他们「提现」；若无人完成 7 次打卡请先点「无获胜者结算」再「提取余数」。");
            } else if (msg.indexOf("Withdraw dust first") !== -1) {
              setTx("请先「提取余数」清空合约余额后再开启新一期。");
            } else {
              setTx("开启失败: " + msg);
            }
          }
          refreshStatus();
        };
      }

      userSelect.onchange = refreshStatus;
      refreshStatus();
    }

    main();
  }
})();

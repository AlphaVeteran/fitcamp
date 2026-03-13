// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FitCamp is Ownable {
    IERC20 public usdcToken;
    uint256 public constant STAKE_AMOUNT = 100 * 10**6; // 6 位精度 USDC

    struct User {
        bool hasStaked;
        uint256 checkInCount;
        bool isWithdrawn;
    }

    uint256 public currentRoundId;
    mapping(uint256 => uint256) public roundEndTime;
    mapping(uint256 => bool) public roundOpenForJoin;
    mapping(uint256 => mapping(address => User)) public participants;
    mapping(uint256 => address[]) public participantList;
    mapping(uint256 => uint256) public rewardPerWinner;
    mapping(uint256 => uint256) public winnersCount;
    mapping(uint256 => uint256) public winnersWithdrawnCount;
    mapping(uint256 => bool) public isSettled;

    address public fitNFT;
    mapping(uint256 roundId => mapping(address => bool)) public hasClaimedFitNFT;
    mapping(uint256 roundId => mapping(address => uint256)) public claimedFitNFTTokenId;

    constructor(address _usdcAddress, uint256 _durationDays) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
        currentRoundId = 0;
        roundEndTime[0] = block.timestamp + (_durationDays * 1 days);
    }

    // 0. 群主开放当期报名（建群后用户方可缴纳定金）
    function openRoundForJoin(uint256 _roundId) external onlyOwner {
        require(_roundId <= currentRoundId, "Round does not exist");
        require(block.timestamp < roundEndTime[_roundId], "Round already ended");
        roundOpenForJoin[_roundId] = true;
    }

    // 0b. 群主在当期未结束前修改当期打卡天数（含第 0 期部署后的调整）
    function setRoundDuration(uint256 _roundId, uint256 _durationDays) external onlyOwner {
        require(_roundId <= currentRoundId, "Round does not exist");
        require(block.timestamp < roundEndTime[_roundId], "Round already ended");
        roundEndTime[_roundId] = block.timestamp + (_durationDays * 1 days);
    }

    // 1. 缴纳定金（参加当期；须群主先开放该期报名）
    function joinCamp() external {
        uint256 round = currentRoundId;
        require(roundOpenForJoin[round], "Round not open for join");
        require(!participants[round][msg.sender].hasStaked, "Already joined this round");
        require(block.timestamp < roundEndTime[round], "Round ended");
        require(usdcToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT), "Transfer failed");

        participants[round][msg.sender] = User(true, 0, false);
        participantList[round].push(msg.sender);
    }

    // 2. 会员自己打卡（当期）
    function checkIn() external {
        uint256 round = currentRoundId;
        require(block.timestamp < roundEndTime[round], "Round over");
        require(participants[round][msg.sender].hasStaked, "Not a participant");
        participants[round][msg.sender].checkInCount += 1;
    }

    // 2b. 群主主动结算当期（期结束后调用，有获胜者时计算 rewardPerWinner）
    function settleRound(uint256 _roundId) external onlyOwner {
        require(block.timestamp >= roundEndTime[_roundId], "Round not ended");
        require(!isSettled[_roundId], "Already settled");
        uint256 count = 0;
        address[] storage list = participantList[_roundId];
        for (uint256 i = 0; i < list.length; i++) {
            if (participants[_roundId][list[i]].checkInCount >= 7) count++;
        }
        require(count > 0, "No winners");
        winnersCount[_roundId] = count;
        rewardPerWinner[_roundId] = usdcToken.balanceOf(address(this)) / count;
        isSettled[_roundId] = true;
    }

    // 3. 结算并提现（指定期数；若未结算则首次提现者会触发结算逻辑，群主也可先调 settleRound）
    function settleAndWithdraw(uint256 _roundId) external {
        require(block.timestamp >= roundEndTime[_roundId], "Round still active");
        User storage user = participants[_roundId][msg.sender];
        require(user.hasStaked && !user.isWithdrawn, "Invalid withdrawal");

        if (!isSettled[_roundId]) {
            uint256 count = 0;
            address[] storage list = participantList[_roundId];
            for (uint256 i = 0; i < list.length; i++) {
                if (participants[_roundId][list[i]].checkInCount >= 7) count++;
            }
            require(count > 0, "No winners");
            winnersCount[_roundId] = count;
            rewardPerWinner[_roundId] = usdcToken.balanceOf(address(this)) / count;
            isSettled[_roundId] = true;
        }

        require(participants[_roundId][msg.sender].checkInCount >= 7, "Not eligible");

        user.isWithdrawn = true;
        winnersWithdrawnCount[_roundId]++;
        require(usdcToken.transfer(msg.sender, rewardPerWinner[_roundId]), "Transfer failed");
    }

    // 4. 群主提取当期余数（须在该期所有获胜者提完后调用）
    function withdrawDust(uint256 _roundId) external onlyOwner {
        require(isSettled[_roundId], "Round not settled");
        require(
            winnersWithdrawnCount[_roundId] == winnersCount[_roundId],
            "Not all winners withdrawn"
        );
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No dust");
        require(usdcToken.transfer(owner(), balance), "Transfer failed");
    }

    // 4b. 当期无人完成 7 次打卡时，群主可标记该期为已结算，以便提走池内资金并开启新一期
    function settleRoundWithNoWinners(uint256 _roundId) external onlyOwner {
        require(block.timestamp >= roundEndTime[_roundId], "Round not ended");
        require(!isSettled[_roundId], "Already settled");
        uint256 count = 0;
        address[] storage list = participantList[_roundId];
        for (uint256 i = 0; i < list.length; i++) {
            if (participants[_roundId][list[i]].checkInCount >= 7) count++;
        }
        require(count == 0, "There are winners");
        isSettled[_roundId] = true;
        winnersCount[_roundId] = 0;
    }

    // 5. 开启新一期（余数可不提现，自动滚入下一期奖金池）
    // 若当期无人参加，再开新一期时期数不增加，只重置当前期结束时间并开放报名
    function startNewRound(uint256 _durationDays) external onlyOwner {
        require(block.timestamp >= roundEndTime[currentRoundId], "Current round not ended");
        require(isSettled[currentRoundId], "Current round not settled");
        require(
            winnersWithdrawnCount[currentRoundId] == winnersCount[currentRoundId],
            "Not all winners withdrawn"
        );
        if (participantList[currentRoundId].length == 0) {
            roundEndTime[currentRoundId] = block.timestamp + (_durationDays * 1 days);
            roundOpenForJoin[currentRoundId] = true;
        } else {
            currentRoundId++;
            roundEndTime[currentRoundId] = block.timestamp + (_durationDays * 1 days);
            roundOpenForJoin[currentRoundId] = true;
        }
    }

    // 查询某期某用户
    function getParticipant(uint256 _roundId, address _user)
        external
        view
        returns (bool hasStaked, uint256 checkInCount, bool isWithdrawn)
    {
        User storage u = participants[_roundId][_user];
        return (u.hasStaked, u.checkInCount, u.isWithdrawn);
    }

    // 查询某期参与名单（前端一次取回，避免 getter 只支持 participantList(roundId, index)）
    function getParticipantList(uint256 _roundId) external view returns (address[] memory) {
        return participantList[_roundId];
    }

    function setFitNFT(address _fitNFT) external onlyOwner {
        fitNFT = _fitNFT;
    }

    // 群主为当期所有优胜者铸造并发放 Fit NFT（结束打卡后调用）
    function mintFitNFTsForRound(uint256 _roundId) external onlyOwner {
        require(fitNFT != address(0), "FitNFT not set");
        require(block.timestamp >= roundEndTime[_roundId], "Round not ended");
        require(isSettled[_roundId], "Round not settled");
        address[] storage list = participantList[_roundId];
        for (uint256 i = 0; i < list.length; i++) {
            address w = list[i];
            if (participants[_roundId][w].checkInCount >= 7 && !hasClaimedFitNFT[_roundId][w]) {
                hasClaimedFitNFT[_roundId][w] = true;
                uint256 tokenId = IFitNFT(fitNFT).mint(w, _roundId);
                claimedFitNFTTokenId[_roundId][w] = tokenId;
            }
        }
    }

    // 优胜者自行领取当期 Fit NFT（每期每人最多领 1 个；若群主已通过 mintFitNFTsForRound 发放则无需调用）
    function claimFitNFT(uint256 _roundId) external {
        require(fitNFT != address(0), "FitNFT not set");
        require(block.timestamp >= roundEndTime[_roundId], "Round not ended");
        require(isSettled[_roundId], "Round not settled");
        require(participants[_roundId][msg.sender].checkInCount >= 7, "Not a winner");
        require(!hasClaimedFitNFT[_roundId][msg.sender], "Already claimed");
        hasClaimedFitNFT[_roundId][msg.sender] = true;
        uint256 tokenId = IFitNFT(fitNFT).mint(msg.sender, _roundId);
        claimedFitNFTTokenId[_roundId][msg.sender] = tokenId;
    }

    // 群主设置 Fit NFT 的通用图片 URL（如 GitHub raw 链接）
    function setFitNFTImageURI(string calldata _uri) external onlyOwner {
        if (fitNFT != address(0)) IFitNFT(fitNFT).setImageBaseURI(_uri);
    }
}

interface IFitNFT {
    function mint(address to, uint256 roundId) external returns (uint256 tokenId);
    function setImageBaseURI(string calldata _uri) external;
}

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
    mapping(uint256 => mapping(address => User)) public participants;
    mapping(uint256 => address[]) public participantList;
    mapping(uint256 => uint256) public rewardPerWinner;
    mapping(uint256 => uint256) public winnersCount;
    mapping(uint256 => uint256) public winnersWithdrawnCount;
    mapping(uint256 => bool) public isSettled;

    constructor(address _usdcAddress, uint256 _durationDays) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
        currentRoundId = 0;
        roundEndTime[0] = block.timestamp + (_durationDays * 1 days);
    }

    // 1. 缴纳定金（参加当期）
    function joinCamp() external {
        uint256 round = currentRoundId;
        require(!participants[round][msg.sender].hasStaked, "Already joined this round");
        require(block.timestamp < roundEndTime[round], "Round ended");
        require(usdcToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT), "Transfer failed");

        participants[round][msg.sender] = User(true, 0, false);
        participantList[round].push(msg.sender);
    }

    // 2. 群主确认打卡（当期）
    function checkIn(address _user) external onlyOwner {
        uint256 round = currentRoundId;
        require(block.timestamp < roundEndTime[round], "Round over");
        participants[round][_user].checkInCount += 1;
    }

    // 3. 结算并提现（指定期数）
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

    // 5. 开启新一期（须先提走上期余数，保证合约余额为 0）
    function startNewRound(uint256 _durationDays) external onlyOwner {
        require(block.timestamp >= roundEndTime[currentRoundId], "Current round not ended");
        require(isSettled[currentRoundId], "Current round not settled");
        require(
            winnersWithdrawnCount[currentRoundId] == winnersCount[currentRoundId],
            "Not all winners withdrawn"
        );
        require(usdcToken.balanceOf(address(this)) == 0, "Withdraw dust first");
        currentRoundId++;
        roundEndTime[currentRoundId] = block.timestamp + (_durationDays * 1 days);
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
}

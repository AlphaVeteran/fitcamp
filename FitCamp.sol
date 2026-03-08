// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FitCamp is Ownable {
    IERC20 public usdcToken;
    uint256 public constant STAKE_AMOUNT = 100 * 10**6; // 假设是 6 位精度的 USDC
    uint256 public challengeEndTime;

    struct User {
        bool hasStaked;
        uint256 checkInCount; // 7天打卡次数
        bool isWithdrawn;
    }

    mapping(address => User) public participants;
    address[] public participantList;

    // 结算时快照：每个获胜者应得的固定奖励
    uint256 public rewardPerWinner;
    bool public isSettled;

    constructor(address _usdcAddress, uint256 _durationDays) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
        challengeEndTime = block.timestamp + (_durationDays * 1 days);
    }

    // 1. 缴纳定金 (参加)
    function joinCamp() external {
        require(!participants[msg.sender].hasStaked, "Already joined");
        require(usdcToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT), "Transfer failed");

        participants[msg.sender] = User(true, 0, false);
        participantList.push(msg.sender); // FIX: Solidity uses push(), not append()
    }

    // 2. 裁判确认打卡 (MVP阶段由教练手动触发，或通过前端API同步)
    function checkIn(address _user) external onlyOwner {
        require(block.timestamp < challengeEndTime, "Challenge over");
        participants[_user].checkInCount += 1;
    }

    // 3. 结算逻辑 (核心：平分没完成的人的钱)
    function settleAndWithdraw() external {
        require(block.timestamp >= challengeEndTime, "Challenge still active");
        User storage user = participants[msg.sender];
        require(user.hasStaked && !user.isWithdrawn, "Invalid withdrawal");

        // 首次有人提款时，计算并快照奖励
        if (!isSettled) {
            uint256 winnersCount = 0;
            for (uint256 i = 0; i < participantList.length; i++) {
                if (participants[participantList[i]].checkInCount >= 7) {
                    winnersCount++;
                }
            }
            require(winnersCount > 0, "No winners");
            rewardPerWinner = usdcToken.balanceOf(address(this)) / winnersCount;
            isSettled = true;
        }

        require(participants[msg.sender].checkInCount >= 7, "Not eligible - did not complete 7 check-ins");

        user.isWithdrawn = true;
        require(usdcToken.transfer(msg.sender, rewardPerWinner), "Reward transfer failed");
    }
}

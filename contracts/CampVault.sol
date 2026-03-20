// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title CampVault
/// @notice MVP: single-asset ERC-4626 vault on Base USDC — 存入 / 赎回 / 份额. 罚没 (slash) 预留二期.
/// @dev Pause 时禁止新存入 (deposit/mint)，允许 withdraw/redeem。
contract CampVault is ERC20, Ownable, Pausable {
    error ZeroAddress();
    error ZeroShares();

    IERC20 public immutable assetToken;

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    constructor(IERC20 asset_, address initialOwner) ERC20("CampVault USDC Share", "cvUSDC") Ownable(initialOwner) {
        if (address(asset_) == address(0) || initialOwner == address(0)) revert ZeroAddress();
        assetToken = asset_;
    }

    function asset() external view returns (address) {
        return address(assetToken);
    }

    function totalAssets() public view returns (uint256) {
        return assetToken.balanceOf(address(this));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function deposit(uint256 assets, address receiver) external whenNotPaused returns (uint256 shares) {
        require(receiver != address(0), "receiver=0");
        require(assets > 0, "assets=0");

        shares = _convertToShares(assets);

        // Pull assets then mint shares (reentrancy safety is simplified for MVP).
        assetToken.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(receiver != address(0), "receiver=0");
        if (shares == 0) revert ZeroShares();

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        uint256 supply = totalSupply();
        require(supply > 0, "empty");

        assets = (shares * totalAssets()) / supply;
        _burn(owner, shares);
        assetToken.transfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        if (supply == 0 || total == 0) return assets; // initial exchange rate: 1:1
        return (assets * supply) / total;
    }
}


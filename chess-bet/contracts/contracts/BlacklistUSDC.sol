// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Только для тестов: USDC с чёрным списком, как у Circle (перевод с/на заблокированный адрес откатывается).
contract BlacklistUSDC is ERC20 {
    mapping(address => bool) public blacklisted;

    constructor() ERC20("Blacklist USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlacklisted(address who, bool v) external {
        blacklisted[who] = v;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blacklisted[from] && !blacklisted[to], "Blacklisted");
        super._update(from, to, value);
    }
}

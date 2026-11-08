// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title TCH (ChessTalk Token)
/// @notice Фиксированная эмиссия 888 888 888 TCH, создаётся один раз в конструкторе.
///         Функции mint нет, владельца (owner) нет, остановить или изменить токен нельзя.
///         Любой держатель может сжечь свои токены (burn).
contract TCHToken is ERC20, ERC20Burnable {
    uint256 public constant TOTAL_SUPPLY = 888_888_888 ether; // 18 знаков

    constructor(address initialHolder) ERC20("ChessTalk Token", "TCH") {
        require(initialHolder != address(0), "holder=0");
        _mint(initialHolder, TOTAL_SUPPLY);
    }
}

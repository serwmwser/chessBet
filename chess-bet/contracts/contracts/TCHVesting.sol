// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title Заморозка токенов TCH (владелец, команда, резерв для биржи)
/// @notice До момента start токены забрать нельзя. После start они открываются линейно
///         за duration секунд. Получатель (beneficiary) вызывает release(токен) и забирает открытую часть.
///         Изменить график после создания нельзя. Получателя можно сменить только двумя шагами
///         (transferOwnership, затем acceptOwnership); отказ от владения отключён, чтобы выплаты не сгорели.
contract TCHVesting is VestingWallet, Ownable2Step {
    constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds)
        VestingWallet(beneficiary, startTimestamp, durationSeconds)
    {}

    function transferOwnership(address newOwner) public override(Ownable, Ownable2Step) onlyOwner {
        Ownable2Step.transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal override(Ownable, Ownable2Step) {
        Ownable2Step._transferOwnership(newOwner);
    }

    function renounceOwnership() public pure override { revert("disabled"); }
}

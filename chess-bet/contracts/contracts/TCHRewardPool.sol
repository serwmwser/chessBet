// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Резерв наград TCH
/// @notice Хранит резерв и выдаёт награды за звонки и активность по подписи сервера (EIP-712).
///         Выдача ограничена графиком: резерв открывается линейно за RELEASE_PERIOD (10 лет).
///         Дополнительно действует дневной лимит выдачи (DAILY_FACTOR раз от средней скорости графика):
///         даже при краже ключа подписи за сутки можно забрать не больше лимита, пока владелец не поставил паузу.
///         Владелец может только сменить ключ подписи и поставить выдачу на паузу. Смена владельца двухшаговая,
///         отказ от владения (renounceOwnership) отключён, чтобы пул нельзя было заблокировать навсегда.
///         Вывести токены резерва себе владелец не может: такой функции в контракте нет.
contract TCHRewardPool is EIP712, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    uint256 public constant RELEASE_PERIOD = 3650 days;
    uint256 public constant DAILY_FACTOR = 3; // в день не больше 3 средних суточных порций графика
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,uint256 amount,uint256 nonce,uint256 deadline)");

    IERC20 public immutable token;
    uint256 public immutable startTime;
    uint256 public immutable reserveTotal; // размер резерва на момент создания, для графика
    address public signer;
    uint256 public totalPaid;
    mapping(address => uint256) public nonces;
    mapping(uint256 => uint256) public paidOnDay; // номер суток (UTC) => выдано за эти сутки

    event Claimed(address indexed user, uint256 amount, uint256 nonce);
    event SignerChanged(address indexed signer);

    constructor(IERC20 token_, address signer_, address owner_, uint256 reserveTotal_)
        EIP712("TCHRewardPool", "1")
        Ownable(owner_)
    {
        require(address(token_) != address(0) && signer_ != address(0), "zero");
        require(reserveTotal_ > 0, "reserve=0");
        token = token_;
        signer = signer_;
        reserveTotal = reserveTotal_;
        startTime = block.timestamp;
    }

    /// @notice Сколько всего можно выдать к текущему моменту (нарастающим итогом)
    function allowedTotal() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= RELEASE_PERIOD) return reserveTotal;
        return (reserveTotal * elapsed) / RELEASE_PERIOD;
    }

    /// @notice Сколько можно выдать за одни сутки (всего по приложению)
    function dailyCap() public view returns (uint256) {
        return (reserveTotal * DAILY_FACTOR * 1 days) / RELEASE_PERIOD;
    }

    /// @notice Получить награду. Подпись выдаёт сервер: (user, amount, nonce, deadline).
    function claim(uint256 amount, uint256 deadline, bytes calldata signature) external whenNotPaused {
        require(block.timestamp <= deadline, "expired");
        require(amount > 0, "amount=0");
        uint256 nonce = nonces[msg.sender];
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, msg.sender, amount, nonce, deadline)));
        require(ECDSA.recover(digest, signature) == signer, "bad signature");
        require(totalPaid + amount <= allowedTotal(), "over schedule");
        uint256 day = block.timestamp / 1 days;
        require(paidOnDay[day] + amount <= dailyCap(), "daily cap");
        paidOnDay[day] += amount;
        nonces[msg.sender] = nonce + 1;
        totalPaid += amount;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount, nonce);
    }

    function setSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "zero");
        signer = signer_;
        emit SignerChanged(signer_);
    }

    /// @dev Отказ от владения отключён: иначе пауза и смена ключа пропали бы навсегда.
    function renounceOwnership() public pure override { revert("disabled"); }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}

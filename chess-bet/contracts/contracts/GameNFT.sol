// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IChessEscrow {
    function games(uint256 id) external view returns (address p1, address p2, uint128 bet, uint32 duration, uint64 startedAt, uint8 status, address inviteSigner);
    function entitlement(uint256 id, address who) external view returns (uint256);
    function usdc() external view returns (address);
}

/// @title ChessBet Moment NFT
/// @notice NFT любого момента сыгранной на токены партии (ChessEscrow): игрок после окончания партии выбирает ход
///         (или итоговую позицию с матом) и создаёт NFT-картинку этой позиции. На один ход партии один NFT.
///         Игроков, ставку и победителя контракт сам читает из ChessEscrow; оракул (сервер) подписывает только
///         выбранную позицию (FEN), последний ход и запись ходов. Картинка хранится прямо в контракте (SVG).
///         За создание игрок платит mintFee (1 USDC) на баланс проекта. Роялти ERC-2981 (по умолчанию 5%).
contract GameNFT is ERC721, ERC2981, Ownable {
    using SafeERC20 for IERC20;

    uint8 private constant FINISHED = 3; // ChessEscrow.Status.Finished
    uint96 public constant MAX_ROYALTY_BPS = 1000; // потолок 10%
    uint256 public constant MAX_MINT_FEE = 10_000_000; // потолок платы за создание: 10 USDC
    uint256 private constant MAX_FEN = 100;
    uint256 private constant MAX_PGN = 2000;

    IChessEscrow public immutable escrow;
    IERC20 public immutable usdc; // тот же USDC, что в ChessEscrow
    address public oracle;
    uint256 public mintFee = 1_000_000; // 1 USDC
    address public feeRecipient;
    string public siteUrl = "https://serwmwser.github.io/chessBet/?game=";
    uint256 public totalSupply;

    /// @dev выбранный момент партии; from/to: клетки последнего хода 0..63 (0 = a8, 63 = h1), 255 = нет
    struct Snap { uint64 gameId; uint16 ply; uint16 total; uint8 from; uint8 to; string san; string fen; string pgn; }
    mapping(uint256 => Snap) private snaps;
    mapping(uint256 => bool) public taken; // ключ: gameId * 100000 + ply

    event Minted(uint256 indexed tokenId, uint256 indexed gameId, uint16 ply, address indexed owner);
    event OracleChanged(address oracle);
    event RoyaltyChanged(address receiver, uint96 bps);
    event SiteUrlChanged(string url);
    event MintFeeChanged(uint256 fee, address recipient);

    constructor(address escrow_, address oracle_, address royaltyReceiver, uint96 royaltyBps, address owner_)
        ERC721("ChessBet Moments", "CBMOMENT")
        Ownable(owner_)
    {
        require(escrow_ != address(0) && oracle_ != address(0) && royaltyReceiver != address(0), "zero");
        require(royaltyBps <= MAX_ROYALTY_BPS, "royalty");
        escrow = IChessEscrow(escrow_);
        usdc = IERC20(IChessEscrow(escrow_).usdc());
        feeRecipient = royaltyReceiver;
        oracle = oracle_;
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    // ------------------------------------------------------------------ минт
    /// @notice Создать NFT выбранного момента завершённой партии (любой ход или итоговая позиция).
    ///         Вызвать может только один из двух игроков; подпись выдаёт сервер (оракул).
    ///         Плата mintFee списывается с игрока на баланс проекта (нужен approve USDC на этот контракт).
    function mint(Snap calldata s, bytes calldata sig) external returns (uint256 tokenId) {
        require(s.ply >= 1 && s.ply <= s.total && s.total <= 1000, "ply");
        require(bytes(s.fen).length > 0 && bytes(s.fen).length <= MAX_FEN, "fen");
        require(bytes(s.pgn).length <= MAX_PGN && bytes(s.san).length <= 16, "size");
        uint256 key = uint256(s.gameId) * 100000 + s.ply;
        require(!taken[key], "taken");
        {
            (address p1, address p2,,,, uint8 status,) = escrow.games(s.gameId);
            require(status == FINISHED, "not finished");
            require(msg.sender == p1 || msg.sender == p2, "not player");
        }
        bytes32 digest = keccak256(abi.encode(address(this), block.chainid, s));
        require(ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), sig) == oracle, "bad sig");
        taken[key] = true;
        tokenId = ++totalSupply;
        Snap storage d = snaps[tokenId];
        d.gameId = s.gameId; d.ply = s.ply; d.total = s.total; d.from = s.from; d.to = s.to;
        d.san = s.san; d.fen = s.fen; d.pgn = s.pgn;
        if (mintFee > 0) usdc.safeTransferFrom(msg.sender, feeRecipient, mintFee);
        _mint(msg.sender, tokenId);
        emit Minted(tokenId, s.gameId, s.ply, msg.sender);
    }

    /// @notice Победитель партии из ChessEscrow (address(0) = ничья)
    function winnerOf(uint256 gameId) public view returns (address) {
        (address p1, address p2, uint128 bet,,,,) = escrow.games(gameId);
        if (escrow.entitlement(gameId, p1) > bet) return p1;
        if (escrow.entitlement(gameId, p2) > bet) return p2;
        return address(0);
    }

    function momentOf(uint256 tokenId) external view returns (uint256 gameId, uint16 ply, uint16 total, string memory san, string memory fen, string memory pgn) {
        _requireOwned(tokenId);
        Snap storage s = snaps[tokenId];
        return (s.gameId, s.ply, s.total, s.san, s.fen, s.pgn);
    }

    // ------------------------------------------------------------- метаданные
    struct G { address p1; address p2; address w; uint128 bet; }

    function _g(uint256 gameId) private view returns (G memory g) {
        (g.p1, g.p2, g.bet,,,,) = escrow.games(gameId);
        g.w = winnerOf(gameId);
    }

    function _result(G memory g) private pure returns (string memory) {
        return g.w == address(0) ? "Draw" : (g.w == g.p1 ? "White won" : "Black won");
    }

    function _moveText(Snap storage s) private view returns (string memory) {
        return string.concat("Move ", Strings.toString(s.ply), "/", Strings.toString(s.total), bytes(s.san).length > 0 ? string.concat(" ", s.san) : "");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Snap storage s = snaps[tokenId];
        G memory g = _g(s.gameId);
        string memory head = string.concat(
            '{"name":"Chess Bet #', Strings.toString(s.gameId), ' - ', _moveText(s), '","description":"A moment of Chess Bet game #', Strings.toString(s.gameId),
            ' on Polygon: ', _short(g.p1), ' (White) vs ', _short(g.p2), ' (Black), bet ', _usdc(g.bet), ' USDC each. ', _result(g), '.",'
        );
        string memory mid = string.concat(
            '"external_url":"', siteUrl, Strings.toString(s.gameId), '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_svg(s, g))), '",'
        );
        string memory tail = string.concat(
            '"attributes":[{"trait_type":"Game","display_type":"number","value":', Strings.toString(s.gameId), '},',
            '{"trait_type":"Move","display_type":"number","value":', Strings.toString(s.ply), '},',
            '{"trait_type":"Moves in game","display_type":"number","value":', Strings.toString(s.total), '},',
            '{"trait_type":"Last move","value":"', s.san, '"},',
            '{"trait_type":"Final position","value":"', s.ply == s.total ? "Yes" : "No", '"},',
            '{"trait_type":"Result","value":"', _result(g), '"},',
            '{"trait_type":"Bet (USDC)","display_type":"number","value":', _usdc(g.bet), '},',
            '{"trait_type":"White","value":"', Strings.toHexString(g.p1), '"},',
            '{"trait_type":"Black","value":"', Strings.toHexString(g.p2), '"},',
            '{"trait_type":"Position","value":"', s.fen, '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(string.concat(head, mid, tail))));
    }

    /// @notice Описание коллекции для OpenSea (в том числе роялти)
    function contractURI() external view returns (string memory) {
        (address rcv, uint256 bps) = royaltyInfo(0, 10_000);
        string memory json = string.concat(
            '{"name":"ChessBet Moments","description":"NFT of moments from chess games played for USDC on Polygon. The board, the players and the result are stored on-chain.",',
            '"seller_fee_basis_points":', Strings.toString(bps), ',"fee_recipient":"', Strings.toHexString(rcv), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _svg(Snap storage s, G memory g) private view returns (string memory) {
        bytes memory o = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset=".55" stop-color="#6d3df0"/><stop offset="1" stop-color="#9333ea"/></linearGradient></defs>',
            '<rect width="400" height="480" rx="28" fill="url(#g)"/>',
            '<text x="200" y="36" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="#ffd54a">CHESS BET #', Strings.toString(s.gameId), '</text>',
            '<text x="200" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="#ffffff">', _moveText(s), s.ply == s.total ? " (final)" : "", '</text>',
            '<rect x="34" y="70" width="332" height="332" rx="8" fill="#0d0a2a"/>',
            '<rect x="40" y="76" width="320" height="320" fill="#f0d9b5"/>'
        );
        for (uint256 i = 0; i < 64; i++) {
            if ((i / 8 + i % 8) % 2 == 1) o = abi.encodePacked(o, _sq(i, "#b58863"));
        }
        if (s.from < 64) o = abi.encodePacked(o, _sq(s.from, "#f7d046"), _sq(s.to < 64 ? s.to : s.from, "#f7d046"));
        o = abi.encodePacked(o, '<g font-size="34" text-anchor="middle" stroke-width="3" paint-order="stroke" stroke-linejoin="round" font-family="Arial,sans-serif">', _pieces(s.fen), '</g>');
        o = abi.encodePacked(
            o,
            '<text x="200" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="17" fill="#ffffff">',
            _result(g), ' | ', _usdc(g.bet), ' USDC</text>',
            '<text x="200" y="454" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#e5dcff">', _short(g.p1), ' vs ', _short(g.p2), '</text>',
            '</svg>'
        );
        return string(o);
    }

    function _sq(uint256 i, string memory fill) private pure returns (bytes memory) {
        return abi.encodePacked('<rect x="', Strings.toString(40 + (i % 8) * 40), '" y="', Strings.toString(76 + (i / 8) * 40), '" width="40" height="40" fill="', fill, '"/>');
    }

    function _pieces(string memory fen) private pure returns (bytes memory o) {
        bytes memory f = bytes(fen);
        uint256 r = 0; uint256 c = 0;
        for (uint256 i = 0; i < f.length; i++) {
            bytes1 ch = f[i];
            if (ch == 0x20) break;
            if (ch == 0x2f) { r++; c = 0; continue; }
            if (ch >= 0x31 && ch <= 0x38) { c += uint8(ch) - 48; continue; }
            string memory glyph = _glyph(ch);
            if (bytes(glyph).length != 0 && r < 8 && c < 8) {
                o = abi.encodePacked(o, '<text x="', Strings.toString(60 + c * 40), '" y="', Strings.toString(76 + r * 40 + 31),
                    (ch >= 0x41 && ch <= 0x5a) ? '" fill="#ffffff" stroke="#1a1030">' : '" fill="#1a1030" stroke="#ffffff">', glyph, hex"efb88e", '</text>');
            }
            c++;
        }
    }

    function _glyph(bytes1 ch) private pure returns (string memory) {
        uint8 u = uint8(ch);
        if (u >= 0x61) u -= 32; // в верхний регистр
        if (u == 0x4b) return unicode"♚";
        if (u == 0x51) return unicode"♛";
        if (u == 0x52) return unicode"♜";
        if (u == 0x42) return unicode"♝";
        if (u == 0x4e) return unicode"♞";
        if (u == 0x50) return unicode"♟";
        return "";
    }

    function _short(address a) private pure returns (string memory) {
        bytes memory h = bytes(Strings.toHexString(a)); // 42 символа
        bytes memory out = new bytes(13);
        for (uint256 i = 0; i < 6; i++) out[i] = h[i];
        out[6] = "."; out[7] = "."; out[8] = ".";
        for (uint256 i = 0; i < 4; i++) out[9 + i] = h[38 + i];
        return string(out);
    }

    function _usdc(uint256 v) private pure returns (string memory) {
        uint256 cents = v / 10_000;
        uint256 frac = cents % 100;
        return string.concat(Strings.toString(cents / 100), ".", frac < 10 ? "0" : "", Strings.toString(frac));
    }

    // ------------------------------------------------------------- управление
    function setOracle(address o) external onlyOwner { require(o != address(0), "zero"); oracle = o; emit OracleChanged(o); }
    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(receiver != address(0) && bps <= MAX_ROYALTY_BPS, "royalty");
        _setDefaultRoyalty(receiver, bps);
        emit RoyaltyChanged(receiver, bps);
    }
    function setMintFee(uint256 fee, address recipient) external onlyOwner {
        require(fee <= MAX_MINT_FEE && recipient != address(0), "fee");
        mintFee = fee;
        feeRecipient = recipient;
        emit MintFeeChanged(fee, recipient);
    }
    function setSiteUrl(string calldata url) external onlyOwner { siteUrl = url; emit SiteUrlChanged(url); }

    function supportsInterface(bytes4 i) public view override(ERC721, ERC2981) returns (bool) { return super.supportsInterface(i); }
}

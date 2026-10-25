// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IChessEscrow {
    function games(uint256 id) external view returns (address p1, address p2, uint128 bet, uint32 duration, uint64 startedAt, uint8 status, address inviteSigner);
    function entitlement(uint256 id, address who) external view returns (uint256);
}

/// @title ChessBet Game NFT
/// @notice NFT сыгранной партии на токены (ChessEscrow). Один NFT на партию, номер токена = номер партии.
///         Игроков, ставку и победителя контракт сам читает из ChessEscrow (оракул их подделать не может);
///         оракул подписывает только конечную позицию (FEN) и запись ходов (PGN) для картинки.
///         Картинка и данные хранятся прямо в контракте (SVG), IPFS не нужен. Роялти ERC-2981 (по умолчанию 5%).
contract GameNFT is ERC721, ERC2981, Ownable {
    uint8 private constant FINISHED = 3; // ChessEscrow.Status.Finished
    uint96 public constant MAX_ROYALTY_BPS = 1000; // потолок 10%
    uint256 private constant MAX_FEN = 100;
    uint256 private constant MAX_PGN = 2000;

    IChessEscrow public immutable escrow;
    address public oracle;
    string public siteUrl = "https://serwmwser.github.io/chessBet/?game=";

    struct Rec { string fen; string pgn; }
    mapping(uint256 => Rec) private rec;

    event Minted(uint256 indexed id, address indexed owner);
    event OracleChanged(address oracle);
    event RoyaltyChanged(address receiver, uint96 bps);
    event SiteUrlChanged(string url);

    constructor(address escrow_, address oracle_, address royaltyReceiver, uint96 royaltyBps, address owner_)
        ERC721("ChessBet Games", "CBGAME")
        Ownable(owner_)
    {
        require(escrow_ != address(0) && oracle_ != address(0) && royaltyReceiver != address(0), "zero");
        require(royaltyBps <= MAX_ROYALTY_BPS, "royalty");
        escrow = IChessEscrow(escrow_);
        oracle = oracle_;
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    // ------------------------------------------------------------------ минт
    /// @notice Создать NFT завершённой партии. Вызвать может только один из двух игроков; подпись выдаёт сервер (оракул).
    function mint(uint256 id, string calldata fen, string calldata pgn, bytes calldata sig) external {
        require(!_exists(id), "minted");
        require(bytes(fen).length > 0 && bytes(fen).length <= MAX_FEN, "fen");
        require(bytes(pgn).length <= MAX_PGN, "pgn");
        (address p1, address p2,,,, uint8 status,) = escrow.games(id);
        require(status == FINISHED, "not finished");
        require(msg.sender == p1 || msg.sender == p2, "not player");
        bytes32 digest = keccak256(abi.encode(address(this), block.chainid, id, fen, pgn));
        require(ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), sig) == oracle, "bad sig");
        rec[id] = Rec(fen, pgn);
        _mint(msg.sender, id);
        emit Minted(id, msg.sender);
    }

    function _exists(uint256 id) internal view returns (bool) { return _ownerOf(id) != address(0); }

    /// @notice Победитель партии из ChessEscrow (address(0) = ничья)
    function winnerOf(uint256 id) public view returns (address) {
        (address p1, address p2, uint128 bet,,,,) = escrow.games(id);
        if (escrow.entitlement(id, p1) > bet) return p1;
        if (escrow.entitlement(id, p2) > bet) return p2;
        return address(0);
    }

    function gameFen(uint256 id) external view returns (string memory) { return rec[id].fen; }
    function gamePgn(uint256 id) external view returns (string memory) { return rec[id].pgn; }

    // ------------------------------------------------------------- метаданные
    struct G { address p1; address p2; address w; uint128 bet; }

    function _g(uint256 id) private view returns (G memory g) {
        (g.p1, g.p2, g.bet,,,,) = escrow.games(id);
        g.w = winnerOf(id);
    }

    function _result(G memory g) private pure returns (string memory) {
        return g.w == address(0) ? "Draw" : (g.w == g.p1 ? "White won" : "Black won");
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        G memory g = _g(id);
        string memory head = string.concat(
            '{"name":"Chess Bet #', Strings.toString(id), '","description":"Chess Bet game #', Strings.toString(id),
            ' on Polygon: ', _short(g.p1), ' (White) vs ', _short(g.p2), ' (Black), bet ', _usdc(g.bet), ' USDC each. ', _result(g), '.",'
        );
        string memory mid = string.concat(
            '"external_url":"', siteUrl, Strings.toString(id), '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_svg(id, rec[id].fen, g))), '",'
        );
        string memory tail = string.concat(
            '"attributes":[{"trait_type":"Result","value":"', _result(g), '"},',
            '{"trait_type":"Bet (USDC)","display_type":"number","value":', _usdc(g.bet), '},',
            '{"trait_type":"White","value":"', Strings.toHexString(g.p1), '"},',
            '{"trait_type":"Black","value":"', Strings.toHexString(g.p2), '"},',
            '{"trait_type":"Final position","value":"', rec[id].fen, '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(string.concat(head, mid, tail))));
    }

    /// @notice Описание коллекции для OpenSea (в том числе роялти)
    function contractURI() external view returns (string memory) {
        (address rcv, uint256 bps) = royaltyInfo(0, 10_000);
        string memory json = string.concat(
            '{"name":"ChessBet Games","description":"NFT of finished chess games played for USDC on Polygon. The board, the players and the result are stored on-chain.",',
            '"seller_fee_basis_points":', Strings.toString(bps), ',"fee_recipient":"', Strings.toHexString(rcv), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _svg(uint256 id, string memory fen, G memory g) private pure returns (string memory) {
        bytes memory o = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 470">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset=".55" stop-color="#6d3df0"/><stop offset="1" stop-color="#9333ea"/></linearGradient></defs>',
            '<rect width="400" height="470" rx="28" fill="url(#g)"/>',
            '<text x="200" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="26" fill="#ffd54a">CHESS BET #', Strings.toString(id), '</text>',
            '<rect x="34" y="64" width="332" height="332" rx="8" fill="#0d0a2a"/>',
            '<rect x="40" y="70" width="320" height="320" fill="#f0d9b5"/>'
        );
        for (uint256 i = 0; i < 64; i++) {
            if ((i / 8 + i % 8) % 2 == 1) {
                o = abi.encodePacked(o, '<rect x="', Strings.toString(40 + (i % 8) * 40), '" y="', Strings.toString(70 + (i / 8) * 40), '" width="40" height="40" fill="#b58863"/>');
            }
        }
        o = abi.encodePacked(o, '<g font-size="34" text-anchor="middle" stroke-width="3" paint-order="stroke" stroke-linejoin="round" font-family="Arial,sans-serif">');
        bytes memory f = bytes(fen);
        uint256 r = 0; uint256 c = 0;
        for (uint256 i = 0; i < f.length; i++) {
            bytes1 ch = f[i];
            if (ch == 0x20) break;
            if (ch == 0x2f) { r++; c = 0; continue; }
            if (ch >= 0x31 && ch <= 0x38) { c += uint8(ch) - 48; continue; }
            bool white = ch >= 0x41 && ch <= 0x5a; // заглавная буква = белая фигура
            string memory glyph = _glyph(ch);
            if (bytes(glyph).length != 0 && r < 8 && c < 8) {
                o = abi.encodePacked(o, '<text x="', Strings.toString(60 + c * 40), '" y="', Strings.toString(70 + r * 40 + 31), white ? '" fill="#ffffff" stroke="#1a1030">' : '" fill="#1a1030" stroke="#ffffff">', glyph, "\ufe0e", '</text>');
            }
            c++;
        }
        o = abi.encodePacked(o, '</g>');
        o = abi.encodePacked(
            o,
            '<text x="200" y="424" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="17" fill="#ffffff">',
            _result(g), ' | ', _usdc(g.bet), ' USDC</text>',
            '<text x="200" y="448" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#e5dcff">', _short(g.p1), ' vs ', _short(g.p2), '</text>',
            '</svg>'
        );
        return string(o);
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
    function setSiteUrl(string calldata url) external onlyOwner { siteUrl = url; emit SiteUrlChanged(url); }

    function supportsInterface(bytes4 i) public view override(ERC721, ERC2981) returns (bool) { return super.supportsInterface(i); }
}

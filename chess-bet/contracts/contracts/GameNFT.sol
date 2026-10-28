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

/// @title ChessBet Moment NFT v2
/// @notice NFT любого момента сыгранной на токены партии (ChessEscrow): игрок после окончания партии выбирает ход
///         (или итоговую позицию с матом) и создаёт NFT-картинку этой позиции. На один ход партии один NFT.
///         Игроков, ставку и победителя контракт сам читает из ChessEscrow; оракул (сервер) подписывает только
///         выбранную позицию (FEN), последний ход и запись ходов. Игрок сам выбирает мультяшную фигуру (0-29),
///         настроение (0-3) и фон (0-7): половина картинки это позиция выбранного хода, половина это фигура.
///         Данные (позиция, игроки, результат, выбор игрока) хранятся в контракте, а картинку по ним рисует
///         сервер проекта по адресу imageUrl + номер токена + .svg.
///         За создание игрок платит mintFee (1 USDC) на баланс проекта. Роялти ERC-2981 (по умолчанию 5%).
contract GameNFT is ERC721, ERC2981, Ownable {
    using SafeERC20 for IERC20;

    uint8 private constant FINISHED = 3; // ChessEscrow.Status.Finished
    uint96 public constant MAX_ROYALTY_BPS = 1000; // потолок 10%
    uint256 public constant MAX_MINT_FEE = 10_000_000; // потолок платы за создание: 10 USDC
    uint256 private constant MAX_FEN = 100;
    uint256 private constant MAX_PGN = 2000;
    uint8 public constant FIGURES = 30;
    uint8 public constant MOODS = 4;
    uint8 public constant BGS = 8;

    IChessEscrow public immutable escrow;
    IERC20 public immutable usdc; // тот же USDC, что в ChessEscrow
    address public oracle;
    uint256 public mintFee = 1_000_000; // 1 USDC
    address public feeRecipient;
    string public siteUrl = "https://chessbet.lol/?game=";
    string public imageUrl = "https://api.chessbet.lol/nft/img/";
    uint256 public totalSupply;

    /// @dev выбранный момент партии; from/to: клетки последнего хода 0..63 (0 = a8, 63 = h1), 255 = нет
    struct Snap { uint64 gameId; uint16 ply; uint16 total; uint8 from; uint8 to; string san; string fen; string pgn; }
    /// @dev выбор игрока: фигура 0..29, настроение 0..3 (улыбка, спокойный, злость, грусть), фон 0..7
    struct Art { uint8 figure; uint8 mood; uint8 bg; }
    mapping(uint256 => Snap) private snaps;
    mapping(uint256 => Art) public arts;
    mapping(uint256 => bool) public taken; // ключ: gameId * 100000 + ply

    event Minted(uint256 indexed tokenId, uint256 indexed gameId, uint16 ply, address indexed owner, uint8 figure, uint8 mood, uint8 bg);
    event OracleChanged(address oracle);
    event RoyaltyChanged(address receiver, uint96 bps);
    event SiteUrlChanged(string url);
    event ImageUrlChanged(string url);
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
    function mint(Snap calldata s, Art calldata a, bytes calldata sig) external returns (uint256 tokenId) {
        require(a.figure < FIGURES && a.mood < MOODS && a.bg < BGS, "art");
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
        arts[tokenId] = a;
        if (mintFee > 0) usdc.safeTransferFrom(msg.sender, feeRecipient, mintFee);
        _mint(msg.sender, tokenId);
        emit Minted(tokenId, s.gameId, s.ply, msg.sender, a.figure, a.mood, a.bg);
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
            '"external_url":"', siteUrl, Strings.toString(s.gameId), '","image":"', imageUrl, Strings.toString(tokenId), '.svg",'
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
            '{"trait_type":"Position","value":"', s.fen, '"},'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(string.concat(head, mid, tail, _artAttrs(tokenId)))));
    }

    function _artAttrs(uint256 tokenId) private view returns (string memory) {
        Art memory a = arts[tokenId];
        return string.concat(
            '{"trait_type":"Piece","value":"', figureName(a.figure), '"},',
            '{"trait_type":"Mood","value":"', moodName(a.mood), '"},',
            '{"trait_type":"Background","value":"', bgName(a.bg), '"}]}'
        );
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

    function figureName(uint8 i) public pure returns (string memory) {
        string[30] memory n;
        n[0] = "King (White, clay)";
        n[1] = "Queen (White, clay)";
        n[2] = "Rook (White, clay)";
        n[3] = "Bishop (White, clay)";
        n[4] = "Knight (White, clay)";
        n[5] = "Ninja (White, clay)";
        n[6] = "Police (White, clay)";
        n[7] = "Lady (White, clay)";
        n[8] = "Bandit (White, clay)";
        n[9] = "King (Black, clay)";
        n[10] = "Queen (Black, clay)";
        n[11] = "Rook (Black, clay)";
        n[12] = "Bishop (Black, clay)";
        n[13] = "Knight (Black, clay)";
        n[14] = "Ninja (Black, clay)";
        n[15] = "Police (Black, clay)";
        n[16] = "Lady (Black, clay)";
        n[17] = "Bandit (Black, clay)";
        n[18] = "King (White, knights)";
        n[19] = "Queen (White, knights)";
        n[20] = "Rook (White, knights)";
        n[21] = "Bishop (White, knights)";
        n[22] = "Knight (White, knights)";
        n[23] = "Pawn (White, knights)";
        n[24] = "King (Black, knights)";
        n[25] = "Queen (Black, knights)";
        n[26] = "Rook (Black, knights)";
        n[27] = "Bishop (Black, knights)";
        n[28] = "Knight (Black, knights)";
        n[29] = "Pawn (Black, knights)";
        return n[i];
    }

    function moodName(uint8 i) public pure returns (string memory) {
        string[4] memory n = ["Smile", "Calm", "Anger", "Sad"];
        return n[i];
    }

    function bgName(uint8 i) public pure returns (string memory) {
        string[8] memory n = ["Orange", "Sky", "Lime", "Pink", "Yellow", "Violet", "Red", "Teal"];
        return n[i];
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
    function setImageUrl(string calldata url) external onlyOwner { imageUrl = url; emit ImageUrlChanged(url); }

    function supportsInterface(bytes4 i) public view override(ERC721, ERC2981) returns (bool) { return super.supportsInterface(i); }
}

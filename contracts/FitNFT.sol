// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Fit NFT：每期优胜者领取的成就 NFT，仅由 FitCamp 合约铸造。
 * 最小 ERC721 实现（0.8.20），兼容钱包与市场。
 */
contract FitNFT {
    address public minter;
    string private _name = "FitCamp Winner";
    string private _symbol = "FIT";
    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => uint256) public roundOfToken;
    string public imageBaseURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Mint(address indexed to, uint256 indexed tokenId, uint256 roundId);

    constructor(address _minter) {
        minter = _minter;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only FitCamp can mint");
        _;
    }

    function setImageBaseURI(string calldata _uri) external onlyMinter {
        imageBaseURI = _uri;
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }

    function mint(address to, uint256 roundId) external onlyMinter returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        roundOfToken[tokenId] = roundId;
        _owners[tokenId] = to;
        _balances[to]++;
        emit Transfer(address(0), to, tokenId);
        emit Mint(to, tokenId, roundId);
        return tokenId;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        uint256 r = roundOfToken[tokenId];
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                _base64(
                    bytes(
                        string(
                            abi.encodePacked(
                                '{"name":"FitCamp Winner #',
                                _toString(tokenId),
                                '","description":"Winner of FitCamp Round ',
                                _toString(r + 1),
                                '","image":"',
                                imageBaseURI,
                                '","attributes":[{"trait_type":"Round","value":',
                                _toString(r + 1),
                                "}]}"
                            )
                        )
                    )
                )
            )
        );
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _base64(bytes memory data) internal pure returns (string memory) {
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        for (uint256 i = 0; i < len; i += 3) {
            uint256 a = uint8(data[i]);
            uint256 b = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < len ? uint8(data[i + 2]) : 0;
            result[i * 4 / 3] = table[a >> 2];
            result[i * 4 / 3 + 1] = table[((a & 3) << 4) | (b >> 4)];
            result[i * 4 / 3 + 2] = i + 1 < len ? table[((b & 15) << 2) | (c >> 6)] : bytes1(0x43);
            result[i * 4 / 3 + 3] = i + 2 < len ? table[c & 63] : bytes1(0x3d);
        }
        return string(result);
    }
}

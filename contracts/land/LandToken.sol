pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract LandToken is Ownable, ERC721, ERC721URIStorage {
    error ID_CLAIMED(uint256 tokenId, address owner);
    error INVALID_PROOF(bytes32[] proof);
    error NONEXISTENT_ID(uint256 tokenId);

    bytes32 public root;

    mapping(uint => bool) public claimed;

    constructor(string memory name, string memory symbol, bytes32 merkleRoot) ERC721(name, symbol) Ownable(msg.sender){
        root = merkleRoot;
    }

    function issue(
        bytes32[] memory proof,
        address recipient,
        uint256 tokenId,
        string calldata _tokenURI
    ) public onlyOwner {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(recipient, tokenId))));
        
        if (claimed[tokenId]) {
            revert ID_CLAIMED(tokenId, ownerOf(tokenId));
        }
        if (!MerkleProof.verify(proof, root, leaf)) {
            revert INVALID_PROOF(proof);
        }
        
        claimed[tokenId] = true;
        _safeMint(recipient, tokenId);
        setTokenURI(tokenId, _tokenURI);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}

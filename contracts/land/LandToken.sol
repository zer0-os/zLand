pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract LandToken is ERC721 {
    error ID_CLAIMED(uint256 tokenId, address owner);
    error INVALID_PROOF(bytes32[] proof);
    error NONEXISTENT_ID(uint256 tokenId);

    bytes32 public root;
    string private _baseTokenURI; // Base URI for all tokens

    mapping(uint => bool) public claimed;

    constructor(string memory name, string memory symbol, string memory baseURI, bytes32 merkleRoot) ERC721(name, symbol) {
        root = merkleRoot;
        _baseTokenURI = baseURI;
    }

    function issue(
        bytes32[] memory proof,
        address recipient,
        uint256 tokenId
    ) public {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(recipient, tokenId))));
        
        if (claimed[tokenId]) {
            revert ID_CLAIMED(tokenId, ownerOf(tokenId));
        }
        if (!MerkleProof.verify(proof, root, leaf)) {
            revert INVALID_PROOF(proof);
        }
        
        claimed[tokenId] = true;
        _safeMint(recipient, tokenId);
    }

    // Override tokenURI to return the base URI concatenated with the tokenId
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if(ownerOf(tokenId) == address(0)){
            revert NONEXISTENT_ID(tokenId);
        }
        return string.concat(_baseTokenURI, Strings.toString(tokenId));
    }
}
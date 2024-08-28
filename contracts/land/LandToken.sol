pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract LandToken is ERC721{
    error ID_CLAIMED(uint256 tokenId, address owner);
    error INVALID_PROOF(bytes32[] proof);

    bytes32 public root;

    mapping(uint => bool) public claimed;

    constructor(bytes32 merkleRoot, string memory name, string memory symbol) ERC721(name,symbol) {
        root = merkleRoot;
    }

    function claim(
        bytes32[] memory proof,
        address addr,
        uint256 tokenId
    ) public {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, tokenId))));
        
        if(claimed[tokenId]){
            revert ID_CLAIMED(tokenId, ownerOf(tokenId));
        }
        if(!MerkleProof.verify(proof, root, leaf)){
            revert INVALID_PROOF(proof);
        }
        
        claimed[tokenId] = true;
        _safeMint(addr, tokenId);
    }
}
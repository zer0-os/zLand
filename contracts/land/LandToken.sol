pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract LandToken is ERC721, Ownable {
    error ID_CLAIMED(uint256 tokenId, address owner);
    error INVALID_PROOF(bytes32[] proof);
    error NONEXISTENT_ID(uint256 tokenId);

    string public contractURI;
    string public baseURI;
    bytes32 public root;

    mapping(uint => bool) public claimed;

    constructor(string memory name, string memory symbol, string memory _contractURI, string memory _baseURI, bytes32 merkleRoot) ERC721(name, symbol) Ownable(msg.sender){
        root = merkleRoot;
        baseURI = _baseURI;
        contractURI = _contractURI;
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
        return string.concat(baseURI, Strings.toString(tokenId));
    }

    function setContractURI(string calldata newContractURI) public onlyOwner() {
        contractURI = newContractURI;
    }
}
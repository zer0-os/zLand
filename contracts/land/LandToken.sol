// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title LandToken
 * @dev ERC721 token contract with Merkle tree-based airdrop issuance and custom URI handling.
 */
contract LandToken is ERC721, Ownable {
    /// @dev Thrown when trying to issue a token that has already been claimed.
    /// @param tokenId The ID of the token that has already been claimed.
    /// @param owner The current owner of the token.
    error ID_CLAIMED(uint256 tokenId, address owner);

    /// @dev Thrown when a Merkle proof is invalid for the provided recipient and token ID.
    /// @param proof The Merkle proof that failed validation.
    error INVALID_PROOF(bytes32[] proof);

    /// @dev Thrown when querying a token ID that does not exist.
    /// @param tokenId The ID of the token that does not exist.
    error NONEXISTENT_ID(uint256 tokenId);

    /// @notice URI containing contract-level metadata.
    string public contractURI;

    /// @notice Base URI for the token metadata.
    string public baseURI;

    /// @notice Root of the Merkle tree used to verify issuance eligibility.
    bytes32 public root;

    /// @notice Mapping of token IDs to their claimed status.
    mapping(uint => bool) public issued;

    /**
     * @notice Constructor to initialize the LandToken contract.
     * @param name The name of the token collection.
     * @param symbol The symbol of the token collection.
     * @param _contractURI The URI pointing to contract-level metadata.
     * @param _baseURI The base URI for token metadata.
     * @param merkleRoot The root of the Merkle tree for claim validation.
     */
    constructor(
        string memory name, 
        string memory symbol, 
        string memory _contractURI, 
        string memory _baseURI, 
        bytes32 merkleRoot
    ) ERC721(name, symbol) Ownable(msg.sender) {
        root = merkleRoot;
        baseURI = _baseURI;
        contractURI = _contractURI;
    }

    /**
     * @notice Issues a token to a recipient if the Merkle proof is valid and the token has not been claimed.
     * @dev This function verifies the Merkle proof before minting the token.
     * @param proof The Merkle proof that validates the recipient's claim.
     * @param recipient The address of the recipient.
     * @param tokenId The ID of the token to be issued.
     * @custom:throws ID_CLAIMED if the token has already been claimed.
     * @custom:throws INVALID_PROOF if the provided Merkle proof is invalid.
     */
    function issue(
        bytes32[] memory proof,
        address recipient,
        uint256 tokenId
    ) public {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(recipient, tokenId))));
        
        if (issued[tokenId]) {
            revert ID_CLAIMED(tokenId, ownerOf(tokenId));
        }
        if (!MerkleProof.verify(proof, root, leaf)) {
            revert INVALID_PROOF(proof);
        }
        
        issued[tokenId] = true;
        _safeMint(recipient, tokenId);
    }

    /**
     * @notice Returns the token URI for a given token ID.
     * @dev Concatenates the base URI with the token ID.
     * @param tokenId The ID of the token to query.
     * @return The token URI string.
     * @custom:throws NONEXISTENT_ID if the token ID does not exist.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) {
            revert NONEXISTENT_ID(tokenId);
        }
        return string.concat(baseURI, Strings.toString(tokenId));
    }

    /**
     * @notice Updates the contract-level metadata URI.
     * @dev Only the owner can call this function.
     * @param newContractURI The new contract URI to be set.
     */
    function setContractURI(string calldata newContractURI) public onlyOwner {
        contractURI = newContractURI;
    }


    /**
     * @notice Updates the token base metadata URI.
     * @dev Only the owner can call this function.
     * @param newBaseURI The new base URI to be set.
     */
    function setBaseURI(string calldata newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }
}

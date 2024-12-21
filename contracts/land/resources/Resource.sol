// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./MiningRig.sol";

/**
 * @title Resource
 * @notice A contract that uses a Merkle proof of (landTokenId, resourceToken, totalAmount).
 *         Each rig can mine up to `totalAmount` of the given ERC20 resource token.
 */
contract Resource {
    IERC721 public landToken;
    MiningRig public miningRig;
    bytes32 public merkleRoot; // Merkle root for (landTokenId, resourceToken, totalAmount)

    // Mappings
    mapping(uint256 => uint256) public resources_per_block; // rigTokenId => how many tokens are produced per block
    mapping(uint256 => uint256) public last_claim;          // rigTokenId => last claim block
    mapping(uint256 => uint256) public totalAllowed;        // rigTokenId => total resources allowed for that rig
    mapping(uint256 => uint256) public minedSoFar;          // rigTokenId => how much has been mined so far
    mapping(uint256 => IERC20)  public rigToResourceToken;  // rigTokenId => which ERC20 token is mined
    mapping(uint256 => uint256) public rigToLand;           // rigTokenId => which land tokenId it's mining

    constructor(
        IERC721 _landToken,
        MiningRig _miningRig,
        bytes32 _merkleRoot
    ) {
        landToken = _landToken;
        miningRig = _miningRig;
        merkleRoot = _merkleRoot;
    }

    /**
     * @notice Start mining with a given rig on a given land, verifying (landTokenId, resourceToken, totalAmount) via Merkle proof.
     * @dev totalAmount is the maximum the rig can mine for that land token's resource.
     * @param rigTokenId   The rig's token ID
     * @param landTokenId  The land token ID
     * @param resourceToken The ERC20 token address for the resource
     * @param totalAmount  The total resource amount allowed
     * @param proof        The Merkle proof for (landTokenId, resourceToken, totalAmount)
     */
    function startMining(
        uint256 rigTokenId,
        uint256 landTokenId,
        IERC20 resourceToken,
        uint256 totalAmount,
        bytes32[] calldata proof
    ) external {
        // Ownership checks
        require(miningRig.ownerOf(rigTokenId) == msg.sender, "Not rig owner");
        require(landToken.ownerOf(landTokenId) == msg.sender, "Not land owner");

        // Ensure this rig is not already mining
        require(resources_per_block[rigTokenId] == 0, "Already mining");

        // Verify Merkle proof
        // leaf = keccak256(abi.encodePacked(landTokenId, resourceToken, totalAmount))
        bytes32 leaf = keccak256(abi.encodePacked(landTokenId, resourceToken, totalAmount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid merkle proof");

        require(totalAmount > 0, "Invalid total amount");

        // Get rig attributes (speed, efficiency, etc.)
        (uint256 speed, uint256 efficiency, , ) = miningRig.rigAttributes(rigTokenId);

        // resources_per_block = speed * efficiency
        uint256 rigResourcesPerBlock = speed * efficiency;

        resources_per_block[rigTokenId] = rigResourcesPerBlock;
        last_claim[rigTokenId] = block.number;
        totalAllowed[rigTokenId] = totalAmount;
        minedSoFar[rigTokenId] = 0;
        rigToResourceToken[rigTokenId] = resourceToken;
        rigToLand[rigTokenId] = landTokenId;
    }

    /**
     * @notice Stop mining for a rig, claims any final pending resources, and resets.
     */
    function stopMining(uint256 rigTokenId) external {
        require(miningRig.ownerOf(rigTokenId) == msg.sender, "Not rig owner");
        require(resources_per_block[rigTokenId] != 0, "Not mining");

        // Claim final resources
        claimMinedResources(rigTokenId);

        // Reset
        resources_per_block[rigTokenId] = 0;
        delete totalAllowed[rigTokenId];
        delete minedSoFar[rigTokenId];
        delete rigToResourceToken[rigTokenId];
        delete rigToLand[rigTokenId];
    }

    /**
     * @notice Claims the mined resources for a rig.
     * @dev Mined resources are limited by totalAllowed - minedSoFar.
     */
    function claimMinedResources(uint256 rigTokenId) public {
        require(miningRig.ownerOf(rigTokenId) == msg.sender, "Not rig owner");

        uint256 newlyMined = resources_mined(rigTokenId);
        last_claim[rigTokenId] = block.number;

        // Cap to (totalAllowed - minedSoFar)
        uint256 allowedLeft = totalAllowed[rigTokenId] - minedSoFar[rigTokenId];
        if (newlyMined > allowedLeft) {
            newlyMined = allowedLeft;
        }

        if (newlyMined > 0) {
            minedSoFar[rigTokenId] += newlyMined;

            // Transfer from this contract to the caller
            IERC20 token = rigToResourceToken[rigTokenId];
            token.transfer(msg.sender, newlyMined);
        }

        // If we've mined everything, auto-stop
        if (minedSoFar[rigTokenId] >= totalAllowed[rigTokenId]) {
            resources_per_block[rigTokenId] = 0;
        }
    }

    /**
     * @notice Calculate how many resources have been mined since the last claim (uncapped).
     */
    function resources_mined(uint256 rigTokenId) public view returns (uint256) {
        if (resources_per_block[rigTokenId] == 0) {
            return 0;
        }
        uint256 blocksPassed = block.number - last_claim[rigTokenId];
        return resources_per_block[rigTokenId] * blocksPassed;
    }
}

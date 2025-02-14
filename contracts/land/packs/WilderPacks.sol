// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Optional: For EIP-2981 Royalties (if you need them)
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// Assume these are your 3 separate reward NFTs
interface IRewardNFT {
    function mint(address to, uint256 tokenId) external;
}

/**
 * @title WilderPacks
 * @notice A weekly "Pack" sale contract:
 *  - 7-day sale windows
 *  - 1st day (24h) is presale for "Trinity holders" (checked via trinityRoot)
 *  - A separate Merkle root (idToSaleRoot) to ensure the pack ID belongs to the correct saleNumber
 *  - Randomness to pick which Pack ID is actually minted out of the 300 available
 *  - Also mints up to 3 random items across 3 separate reward NFT contracts
 *
 * NOTE: This sample is for demonstration. For a production-ready version,
 *       consider secure randomness (Chainlink VRF) instead of blockhash,
 *       better data structures for removing minted IDs, etc.
 */
contract WilderPacks is ERC721, ERC2981, Ownable {
    // -------------------------------------------
    // Events
    // -------------------------------------------
    event PackPurchased(
        address indexed buyer,
        uint256 indexed saleNumber,
        uint256 indexed packId,
        uint256 quantityOfRewards
    );

    event TrinityRootUpdated(bytes32 newRoot);
    event IDToSaleRootUpdated(bytes32 newRoot);

    // -------------------------------------------
    // Storage
    // -------------------------------------------

    // Start time of the entire sale sequence
    uint256 public startTime;

    // The length (in seconds) of one full sale period (7 days)
    uint256 public constant SALE_DURATION = 7 days;

    // The length (in seconds) of the presale period for Trinity holders (1 day)
    uint256 public constant PRESALE_DURATION = 1 days;

    // 300 packs per sale
    uint256 public constant PACKS_PER_SALE = 300;

    // Merkle root for verifying if someone is a Trinity holder
    bytes32 public trinityRoot;

    // Merkle root for verifying (tokenId, saleNumber) pairs
    bytes32 public idToSaleRoot;

    // Keep track of how many packs minted in a sale
    mapping(uint256 => uint256) public mintedCountPerSale;

    // For naive randomness we increment a nonce each time
    uint256 private randomNonce;

    // Addresses of the 3 reward NFT contracts
    IRewardNFT public rewardNFT1;
    IRewardNFT public rewardNFT2;
    IRewardNFT public rewardNFT3;

    // -------------------------------------------
    // Constructor
    // -------------------------------------------
    constructor(
        address _owner, // if you want a different owner than msg.sender
        bytes32 _trinityRoot,
        bytes32 _idToSaleRoot,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator,
        address _rewardNFT1,
        address _rewardNFT2,
        address _rewardNFT3,
        uint256 _startTime
    ) ERC721("Wilder Packs", "PACK") {
        trinityRoot = _trinityRoot;
        idToSaleRoot = _idToSaleRoot;
        rewardNFT1 = IRewardNFT(_rewardNFT1);
        rewardNFT2 = IRewardNFT(_rewardNFT2);
        rewardNFT3 = IRewardNFT(_rewardNFT3);
        startTime = _startTime;

        // Setup EIP-2981 royalties for all tokens (default)
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);

        // Transfer ownership if needed
        if (_owner != msg.sender) {
            _transferOwnership(_owner);
        }
    }

    // -------------------------------------------
    // Time-based logic
    // -------------------------------------------

    /**
     * @notice Returns the current sale number based on how many 7-day periods have passed since startTime.
     *         Sale #1 is from [startTime, startTime+7days),
     *         Sale #2 is from [startTime+7days, startTime+14days), etc.
     */
    function getCurrentSaleNumber() public view returns (uint256) {
        if (block.timestamp < startTime) {
            return 0; // no sale yet
        }
        uint256 elapsed = block.timestamp - startTime;
        // +1 so that the first 7-day window is sale #1
        return (elapsed / SALE_DURATION) + 1;
    }

    /**
     * @notice Returns true if we are still within the 1-day presale window
     *         for the current sale. If currentSale=1, presale is from
     *         [startTime, startTime+1day). For sale 2, it starts from
     *         [startTime+7days, startTime+7days+1day], etc.
     */
    function isPresaleWindow() public view returns (bool) {
        uint256 saleNumber = getCurrentSaleNumber();
        if (saleNumber == 0) {
            return false; // not started
        }

        // Start time of this sale
        uint256 thisSaleStart = startTime + (saleNumber - 1) * SALE_DURATION;
        // If we're < thisSaleStart + 1 day, it's presale
        return (block.timestamp < (thisSaleStart + PRESALE_DURATION));
    }

    // -------------------------------------------
    // Mint / Buy logic
    // -------------------------------------------

    /**
     * @notice Buys 1 "Pack" from the current sale, verifying:
     *  1. If in presale window, caller must be in trinityRoot
     *  2. We use naive randomness to pick an ID from [1..(max range per sale)] or from the Merkle
     *     that says (randomID -> saleNumber).
     *  3. Mints up to `quantityOfRewards` random items from the 3 reward NFT contracts
     *
     * @param proofTrinity Merkle proof that caller is a Trinity holder (only relevant if isPresaleWindow)
     * @param quantityOfRewards How many reward NFTs to mint [1..3]
     * @param proofIDSale Merkle proof that (tokenId, saleNumber) belongs in the idToSaleRoot
     * @param saleNumber The saleNumber we want to buy from (should match getCurrentSaleNumber())
     */
    function buyPack(
        bytes32[] calldata proofTrinity,
        uint256 quantityOfRewards,
        bytes32[] calldata proofIDSale,
        uint256 saleNumber
    ) external {
        require(saleNumber == getCurrentSaleNumber(), "Sale number mismatch");
        require(saleNumber > 0, "Sale not started yet");
        require(quantityOfRewards >= 1 && quantityOfRewards <= 3, "Max 3 reward items");

        // If in presale window, must prove you are a Trinity holder
        if (isPresaleWindow()) {
            _verifyTrinityHolder(proofTrinity, msg.sender);
        }

        // We pick a random token ID among the 300 for this sale. 
        // For demonstration, let's pick from 1..(300), then verify that (tokenId, saleNumber) is valid with the Merkle tree.
        uint256 randomId = _getRandomPackId(saleNumber);

        // Verify (tokenId, saleNumber) in the Merkle (idToSaleRoot) => means that `tokenId` belongs to `saleNumber`.
        _verifyIDToSale(proofIDSale, randomId, saleNumber);

        // Mint the Pack
        _safeMint(msg.sender, randomId);

        // Also mint reward items
        _mintRewardItems(msg.sender, quantityOfRewards);

        emit PackPurchased(msg.sender, saleNumber, randomId, quantityOfRewards);
    }

    /**
     * @dev Example naive random picking of a pack ID from [1..300].
     *      There's no tracking of "used IDs" here! 
     *      In real usage you'd track which IDs are used so you don't double-mint the same ID.
     *      Or you'd keep an array of available IDs and remove them as minted.
     */
    function _getRandomPackId(uint256 /*saleNumber*/) internal returns (uint256) {
        // A simple approach: each buy increments a nonce, then we pick an ID from 1..300
        // Expand or refine as needed
        randomNonce++;
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    msg.sender,
                    randomNonce
                )
            )
        );
        // map it into 1..300
        uint256 tokenId = (rand % PACKS_PER_SALE) + 1; 
        // If you want to offset by saleNumber, do something like:
        // tokenId += (saleNumber - 1) * PACKS_PER_SALE;
        return tokenId;
    }

    /**
     * @dev Example of minting up to 3 reward items across 3 different contracts,
     *      each with a random ID as well (1..10000?), or however you want to do it.
     */
    function _mintRewardItems(address to, uint256 quantityOfRewards) internal {
        // For simplicity, let's just pick random tokenIds for each reward.
        for (uint256 i = 0; i < quantityOfRewards; i++) {
            // We'll pick which reward contract to use in round-robin
            IRewardNFT rewardContract;
            if (i == 0) {
                rewardContract = rewardNFT1;
            } else if (i == 1) {
                rewardContract = rewardNFT2;
            } else {
                rewardContract = rewardNFT3;
            }

            // Naive random ID for the reward
            randomNonce++;
            uint256 randId = uint256(
                keccak256(
                    abi.encodePacked(
                        blockhash(block.number - 1),
                        block.timestamp,
                        msg.sender,
                        randomNonce
                    )
                )
            ) % 10000;  // e.g. limit to 10k, adjust as you see fit

            // Mint it
            rewardContract.mint(to, randId);
        }
    }

    // -------------------------------------------
    // Merkle verification
    // -------------------------------------------
    function _verifyTrinityHolder(bytes32[] calldata proof, address buyer) internal view {
        // leaf = keccak256(abi.encode(buyer))
        bytes32 leaf = keccak256(abi.encode(buyer));
        require(MerkleProof.verify(proof, trinityRoot, leaf), "Not in Trinity set");
    }

    function _verifyIDToSale(bytes32[] calldata proof, uint256 tokenId, uint256 saleNumber) internal view {
        // leaf = keccak256(abi.encode(tokenId, saleNumber))
        bytes32 leaf = keccak256(abi.encode(tokenId, saleNumber));
        require(MerkleProof.verify(proof, idToSaleRoot, leaf), "Invalid ID->sale proof");
    }

    // -------------------------------------------
    // Owner setters
    // -------------------------------------------
    function setTrinityRoot(bytes32 newRoot) external onlyOwner {
        trinityRoot = newRoot;
        emit TrinityRootUpdated(newRoot);
    }

    function setIDToSaleRoot(bytes32 newRoot) external onlyOwner {
        idToSaleRoot = newRoot;
        emit IDToSaleRootUpdated(newRoot);
    }

    // EIP-2981 setter
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @dev Example override for tokenURI. You could store a baseURI if you want, or per-token data, etc.
     */
    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        return string(abi.encodePacked("ipfs://packs/", Strings.toString(tokenId)));
    }

    // -------------------------------------------
    // ERC165
    // -------------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

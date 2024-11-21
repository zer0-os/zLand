pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./MiningRig.sol";

// Resource Contract
contract Resource {
    uint256 public ending_balance;
    uint256 public pool_nom = 9;
    uint256 public pool_div = 10;

    IERC721 landToken;
    IERC4626 resourceToken;
    MiningRig miningRig;

    mapping(uint256 => uint256) public resources_per_block; // rigTokenId => resources per block
    mapping(uint256 => uint256) public last_claim; // rigTokenId => last claim block
    mapping(uint256 => uint256) public rigToLand; // rigTokenId => landTokenId

    constructor(
        IERC721 land_token,
        IERC4626 resource_token,
        MiningRig mining_rig
    ) {
        landToken = land_token;
        resourceToken = resource_token;
        miningRig = mining_rig;
    }

    // Convert tokenId to x and y coordinates
    function tokenIdToCoordinates(uint256 tokenId)
        internal
        pure
        returns (int64 x, int64 y)
    {
        x = int64(int256(tokenId >> 128));
        y = int64(int256(tokenId & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF));
    }

    // Get resource value for a given tokenID
    function get_resource_value(uint256 tokenId) public pure returns (int64) {
        (int64 x, int64 y) = tokenIdToCoordinates(tokenId);
        return get_resources_per_block(x, y);
    }

    // Start mining with a rig on a specific land
    function startMining(uint256 rigTokenId, uint256 landTokenId) external {
        // Ownership checks
        require(
            miningRig.ownerOf(rigTokenId) == msg.sender,
            "Not owner of the mining rig"
        );
        require(
            landToken.ownerOf(landTokenId) == msg.sender,
            "Not owner of the land token"
        );
        require(
            resources_per_block[rigTokenId] == 0,
            "Rig is already mining"
        );

        // Calculate base resource per block
        (int64 x, int64 y) = tokenIdToCoordinates(landTokenId);
        int64 baseResourcePerBlock = get_resources_per_block(x, y);
        require(baseResourcePerBlock > 0, "Invalid resource value");

        // Get mining rig attributes
        (uint256 speed, uint256 efficiency, uint256 depth, uint256 health) = miningRig.rigAttributes(
            rigTokenId
        );

        // Calculate resources per block
        uint256 rigResourcesPerBlock = (uint256(int256(baseResourcePerBlock)) *
            speed *
            efficiency) / 1e4; // Adjusted by 1e4 for precision

        // Update mappings
        resources_per_block[rigTokenId] = rigResourcesPerBlock;
        last_claim[rigTokenId] = block.number;
        rigToLand[rigTokenId] = landTokenId;
    }

    // Stop mining with a rig
    function stopMining(uint256 rigTokenId) external {
        // Ownership check
        require(
            miningRig.ownerOf(rigTokenId) == msg.sender,
            "Not owner of the mining rig"
        );
        require(
            resources_per_block[rigTokenId] != 0,
            "Rig is not mining"
        );

        // Claim pending resources
        claimMinedResources(rigTokenId);

        // Reset mappings
        resources_per_block[rigTokenId] = 0;
        delete rigToLand[rigTokenId];
    }

    // Claim mined resources
    function claimMinedResources(uint256 rigTokenId) public {
        // Ownership check
        require(
            miningRig.ownerOf(rigTokenId) == msg.sender,
            "Not owner of the mining rig"
        );

        uint256 mined = resources_mined(rigTokenId);
        last_claim[rigTokenId] = block.number;

        // Mint resource tokens to the miner
        resourceToken.transfer(msg.sender, mined);
    }

    // Calculate resources mined by a rig
    function resources_mined(uint256 rigTokenId)
        public
        view
        returns (uint256)
    {
        return
            resources_per_block[rigTokenId] *
            (block.number - last_claim[rigTokenId]);
    }

    // Noise functions (unchanged)
    int64 constant max = 256;

    function integer_noise(int64 n) public pure returns (int64) {
        n = (n >> 13) ^ n;
        int64 nn = (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
        return ((((nn * 100000)) / (1073741824))) % max;
    }

    function local_average_noise(int64 x, int64 y)
        public
        pure
        returns (int64)
    {
        int64 xq = x + ((y - x) / 3);
        int64 yq = y - ((x + y) / 3);

        int64 result = ((integer_noise(xq) + integer_noise(yq - 1))) +
            ((integer_noise(xq - 1) + integer_noise(yq))) +
            ((integer_noise(xq + 1) + integer_noise(yq))) +
            ((integer_noise(xq) + integer_noise(yq + 1)));

        return (result * 1000) / 8;
    }

    int64 constant iterations = 5;

    function stacked_squares(int64 x, int64 y)
        public
        pure
        returns (int64)
    {
        int64 accumulator;
        for (int64 iteration_idx = 0; iteration_idx < iterations; iteration_idx++) {
            accumulator +=
                integer_noise((x * iteration_idx) + accumulator + y) +
                integer_noise((y * iteration_idx) + accumulator - x);
        }

        return (accumulator * 1000) / (iterations * 2);
    }

    function get_resources_per_block(int64 x, int64 y)
        public
        pure
        returns (int64)
    {
        return
            (local_average_noise(x / 4, y / 7) + stacked_squares(x / 9, y / 4)) /
            2000;
    }
}
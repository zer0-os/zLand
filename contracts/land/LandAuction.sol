// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @dev This contract runs a 365-day auction of land plots. Each day, a certain batch of plots
 * is available to bid on until the day's end block. After that point, the highest bid is locked in.
 * Winners can claim their tokens any time after the day ends, and losers can withdraw their refunds.
 */
contract AutomaticDailyAuction is ReentrancyGuard {
    IERC721 public immutable landToken;
    uint256 public immutable startTokenId;
    uint256 public immutable endTokenId;

    uint256 public immutable startBlock;
    uint256 public immutable blocksPerDay; // Number of blocks per "day"
    uint256 public constant TOTAL_DAYS = 365;

    uint256 public immutable plotsPerDay;

    struct Bid {
        address bidder;
        uint256 amount;
    }

    // Mapping from tokenId to the highest bid
    mapping(uint256 => Bid) public highestBids;

    // Mapping from address to total refunds available for withdrawal
    mapping(address => uint256) public refunds;

    // Mapping to track whether a token has been claimed by the winner
    mapping(uint256 => bool) public tokenClaimed;

    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event TokenClaimed(uint256 indexed tokenId, address indexed winner);
    event RefundWithdrawn(address indexed user, uint256 amount);

    constructor(
        IERC721 _landToken,
        uint256 _startTokenId,
        uint256 _endTokenId,
        uint256 _startBlock,
        uint256 _blocksPerDay
    ) {
        require(_endTokenId >= _startTokenId, "Invalid token range");
        require((_endTokenId - _startTokenId + 1) % TOTAL_DAYS == 0, "Plots not divisible by 365");
        landToken = _landToken;
        startTokenId = _startTokenId;
        endTokenId = _endTokenId;
        startBlock = _startBlock;
        blocksPerDay = _blocksPerDay;

        plotsPerDay = (endTokenId - startTokenId + 1) / TOTAL_DAYS;
    }

    /**
     * @dev Place a bid on a specific land plot tokenId.
     * Requirements:
     * - Token must be in auction range.
     * - The day for this token must not have ended yet.
     * - Must send more ETH than the current highest bid.
     */
    function placeBid(uint256 tokenId) external payable nonReentrant {
        require(tokenId >= startTokenId && tokenId <= endTokenId, "Token not in auction range");
        uint256 dayIndex = getDayIndexForToken(tokenId);
        require(block.number <= dayEndBlock(dayIndex), "Bidding period ended for this token");

        Bid memory currentBid = highestBids[tokenId];
        require(msg.value > currentBid.amount, "Bid not high enough");

        // Refund the previous highest bidder
        if (currentBid.amount > 0) {
            refunds[currentBid.bidder] += currentBid.amount;
        }

        // Record the new highest bid
        highestBids[tokenId] = Bid({
            bidder: msg.sender,
            amount: msg.value
        });

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    /**
     * @dev Claim the token after the day's auction for that token has ended.
     * The caller must be the highest bidder.
     */
    function claimToken(uint256 tokenId) external nonReentrant {
        require(tokenId >= startTokenId && tokenId <= endTokenId, "Token not in auction range");
        uint256 dayIndex = getDayIndexForToken(tokenId);
        require(block.number > dayEndBlock(dayIndex), "Auction day not ended yet");
        require(!tokenClaimed[tokenId], "Token already claimed");

        Bid memory winBid = highestBids[tokenId];
        require(winBid.bidder == msg.sender, "Not the winner");

        tokenClaimed[tokenId] = true;
        landToken.transferFrom(address(this), msg.sender, tokenId);

        emit TokenClaimed(tokenId, msg.sender);
    }

    /**
     * @dev Withdraw any refunds for outbid amounts.
     */
    function withdrawRefund() external nonReentrant {
        uint256 amount = refunds[msg.sender];
        require(amount > 0, "No refunds available");
        refunds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");
        emit RefundWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Returns which day a given token falls into.
     */
    function getDayIndexForToken(uint256 tokenId) public view returns (uint256) {
        require(tokenId >= startTokenId && tokenId <= endTokenId, "Token not in auction range");
        uint256 offset = tokenId - startTokenId;
        return offset / plotsPerDay;
    }

    /**
     * @dev Returns the start and end tokenId for a given day.
     */
    function tokensForDay(uint256 dayIndex) public view returns (uint256 dayStartToken, uint256 dayEndToken) {
        require(dayIndex < TOTAL_DAYS, "Invalid day index");
        dayStartToken = startTokenId + dayIndex * plotsPerDay;
        dayEndToken = dayStartToken + plotsPerDay - 1;
    }

    /**
     * @dev Returns the block number at which a given day ends.
     * Day 0 ends at startBlock + blocksPerDay - 1.
     * Day 1 ends at startBlock + 2*blocksPerDay - 1, etc.
     */
    function dayEndBlock(uint256 dayIndex) public view returns (uint256) {
        return startBlock + (dayIndex + 1) * blocksPerDay - 1;
    }

    /**
     * @dev Returns the current dayIndex based on the current block number.
     */
    function currentDay() external view returns (uint256) {
        if (block.number < startBlock) {
            return 0;
        }
        uint256 elapsed = block.number - startBlock;
        uint256 dayIndex = elapsed / blocksPerDay;
        if (dayIndex >= TOTAL_DAYS) {
            dayIndex = TOTAL_DAYS - 1;
        }
        return dayIndex;
    }

    // Fallback to prevent accidental ETH sends
    receive() external payable {
        revert("Use placeBid()");
    }
}

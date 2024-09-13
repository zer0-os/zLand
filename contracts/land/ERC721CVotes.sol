// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721C, ERC721OpenZeppelinBase } from "../../lib/creator-token-contracts/contracts/erc721c/ERC721C.sol";
import { ERC721Votes, ERC721 } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";

/**
 * @title ERC721CVotes
 * @dev Combines ERC721C and ERC721Votes to resolve inheritance conflicts.
 */
abstract contract ERC721CVotes is ERC721C, ERC721Votes {
    // Override required functions to resolve conflicts
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override(ERC721C, ERC721Votes) {
        super._afterTokenTransfer(from, to, tokenId, batchSize);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721C) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721C, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function name() public view virtual override(ERC721OpenZeppelinBase, ERC721) returns (string memory) {
        return super.name();
    }

    function symbol() public view virtual override(ERC721OpenZeppelinBase, ERC721) returns (string memory) {
        return super.symbol();
    }
}
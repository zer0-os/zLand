// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILandToken {
    function claim(bytes32[] memory proof, address recipient, uint256 tokenId) external;

    function issue(bytes32[] memory proof, address recipient, uint256 tokenId, string memory metadata) external;

    function setContractURI(string calldata newContractURI) external;

    function setBaseURI(string calldata newBaseURI) external;

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external;

    function setTokenURI(uint256 tokenId, string memory _tokenURI) external;
}

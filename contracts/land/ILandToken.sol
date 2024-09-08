// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILandToken {
    function issue(bytes32[] memory proof, address recipient, uint256 tokenId) external;

    function setContractURI(string calldata newContractURI) external;

    function setBaseURI(string calldata newBaseURI) external;

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external;

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) external;
}

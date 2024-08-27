// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface IFabricator{
    struct Build {
        string uri;
        ERC1155 tokenContract;
        uint[] tokenIDs; /// Which erc20 materials are needed for fulfillment
        uint[] amountsRequired; /// How many of each material is required per amount fulfilled
        uint fee;
    }
    function fabricate(uint id, uint amount) external payable;

    function addBuild(uint id, string calldata uri, ERC1155 tokenContract, uint[] calldata tokenIDs, uint[] calldata amountsRequired, uint fee) external;

    function collectFees() external;

    function getBuild(uint at) external view returns(Build memory);
}
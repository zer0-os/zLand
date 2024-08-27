// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IRefinery {
    struct Blueprint {
        string uri;
        ERC20[] tokens; /// Erc20 tokens needed for fulfillment
        uint[] amountsRequired; /// How much of each token is required per amount fulfilled
        uint fee;
    }
    function fulfill(uint id, uint amount, bytes calldata data) external payable;

    function addBlueprint(uint id, string calldata uri, ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external;

    function collectFees() external;

    function getBlueprint(uint at) external view returns(Blueprint memory);
}
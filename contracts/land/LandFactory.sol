// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./LandToken.sol";

/**
 * @title LandTokenFactory
 * @notice A factory contract to deploy new instances of the ZDAO governance contract.
 * @dev Requires an existing TimelockController address.
 * See OpenZeppelin Governor documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance
 * @custom:security-contact admin@zer0.tech
 */
contract LandFactory {
    /// @notice Emitted when a new LandToken is created.
    /// @param landTokenAddress The address of the newly deployed Land Token contract.
    event LandTokenCreated(address indexed landTokenAddress);

    address[] public tokens;

    function createLandToken(
        address royaltyReceiver_,
        uint96 royaltyFeeNumerator_,
        string memory tokenName_,
        string memory tokenSymbol_,
        string memory contractURI_,
        string memory baseURI_,
        string memory version_,
        bytes32 root_
    ) external returns (address tokenAddress) {
        LandToken landToken = new LandToken(
            royaltyReceiver_,
            royaltyFeeNumerator_,
            tokenName_,
            tokenSymbol_,
            contractURI_,
            baseURI_,
            version_,
            root_
        );

        tokens.push(address(landToken));

        emit LandTokenCreated(address(landToken));

        return address(landToken);
    }
}

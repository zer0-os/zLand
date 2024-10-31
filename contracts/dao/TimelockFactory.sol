// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title TimelockFactory
 * @notice A factory contract to deploy new instances of the TimelockController.
 * @dev Facilitates the creation of TimelockController contracts.
 * See OpenZeppelin TimelockController documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController
 * @custom:security-contact admin@zer0.tech
 */
contract TimelockFactory {
    /// @notice Emitted when a new TimelockController is created.
    /// @param timelockAddress The address of the newly deployed TimelockController contract.
    event TimelockCreated(address indexed timelockAddress);

    address[] timelocks;

    /**
     * @notice Creates a new TimelockController instance.
     * @param minDelay The minimum delay before executing a proposal (in seconds).
     * @param proposers The list of addresses that can propose to the timelock.
     * @param executors The list of addresses that can execute timelocked proposals.
     * @return timelockAddress The address of the newly deployed TimelockController contract.
     * @dev See OpenZeppelin TimelockController documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController
     */
    function createTimelock(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) external returns (address timelockAddress) {
        TimelockController timelock = new TimelockController(
            minDelay,
            proposers,
            executors,
            admin
        );

        timelocks.push(address(timelock));

        emit TimelockCreated(address(timelock));

        return address(timelock);
    }
}

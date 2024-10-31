// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZDAO.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title ZDAOFactory
 * @notice A factory contract to deploy new instances of the ZDAO governance contract.
 * @dev Requires an existing TimelockController address.
 * See OpenZeppelin Governor documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance
 * @custom:security-contact admin@zer0.tech
 */
contract ZDAOFactory {
    /// @notice Emitted when a new ZDAO is created.
    /// @param zdaoAddress The address of the newly deployed ZDAO contract.
    event ZDAOCreated(address indexed zdaoAddress);

    address[] zDAOs;

    /**
     * @notice Creates a new ZDAO instance with an existing TimelockController.
     * @param governorName The name of the governor instance.
     * @param token The address of the governance token implementing IVotes.
     * @param timelock The address of the existing TimelockController.
     * @param votingDelay The delay before voting starts (in blocks).
     * @param votingPeriod The duration of the voting period (in blocks).
     * @param proposalThreshold The minimum number of votes required to create a proposal.
     * @param quorumPercentage The quorum fraction (percentage) required for a proposal to pass.
     * @return zdaoAddress The address of the newly deployed ZDAO contract.
     * @dev See OpenZeppelin Governor documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance
     */
    function createZDAO(
        string memory governorName,
        IVotes token,
        TimelockController timelock,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumPercentage,
        uint64 voteExtension
    ) external returns (address zdaoAddress) {
        ZDAO zdao = new ZDAO(
            governorName,
            token,
            timelock,
            votingDelay,
            votingPeriod,
            proposalThreshold,
            quorumPercentage,
            voteExtension
        );

        zDAOs.push(address(zdao));

        emit ZDAOCreated(address(zdao));

        return address(zdao);
    }
}

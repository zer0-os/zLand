// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Governor, IGovernor } from "@openzeppelin/contracts/governance/Governor.sol";
import { GovernorSettings } from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import { GovernorCountingSimple } from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import { GovernorVotes, IVotes } from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import { GovernorTimelockControl, TimelockController } from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import { GovernorVotesQuorumFraction } from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import { GovernorPreventLateQuorum } from "@openzeppelin/contracts/governance/extensions/GovernorPreventLateQuorum.sol";

/**
 * @title ZDAO
 * @notice A customizable governance contract based on OpenZeppelin's Governor contracts.
 * @dev Extends OpenZeppelin's Governor contracts with various extensions for governance settings, voting, timelock control, and quorum fraction.
 * See OpenZeppelin documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance
 * @custom:security-contact admin@zer0.tech
 */
contract ZDAO is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorTimelockControl,
    GovernorVotesQuorumFraction,
    GovernorPreventLateQuorum
{
    /**
     * @notice Creates a new ZDAO governance contract.
     * @param governorName The name of the governor instance.
     * @param token The governance token that allows users to vote.
     * @param timelock The timelock controller that handles proposal execution delay.
     * @param delay_ The delay before voting starts (in blocks).
     * @param votingPeriod_ The duration of the voting period (in blocks).
     * @param proposalThreshold_ The minimum number of votes required to create a proposal.
     * @param quorumPercentage_ The quorum fraction required for a proposal to pass.
     * @dev Initializes the governor with settings and extensions.
     * See OpenZeppelin Governor documentation: https://docs.openzeppelin.com/contracts/4.x/api/governance
     */
    constructor(
        string memory governorName,
        IVotes token,
        TimelockController timelock,
        uint256 delay_,
        uint256 votingPeriod_,
        uint256 proposalThreshold_,
        uint256 quorumPercentage_,
        uint64 voteExtension_
    )
        Governor(governorName)
        GovernorVotes(token)
        GovernorTimelockControl(timelock)
        GovernorSettings(
            delay_,
            votingPeriod_,
            proposalThreshold_
        )
        GovernorVotesQuorumFraction(quorumPercentage_)
        GovernorPreventLateQuorum(voteExtension_)
    {}

    /**
     * @notice Returns the proposal threshold.
     * @return The number of votes required to create a proposal.
     * @dev Overrides the function from Governor and GovernorSettings.
     * See OpenZeppelin GovernorSettings: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorSettings
     */
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /**
     * @notice Returns the current state of a proposal.
     * @param proposalId The ID of the proposal.
     * @return The ProposalState enum value.
     * @dev Overrides the function from Governor and GovernorTimelockControl.
     * See OpenZeppelin GovernorTimelockControl: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorTimelockControl
     */
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /**
     * @dev Executes a successful proposal.
     * @param proposalId The ID of the proposal.
     * @param targets The list of target addresses for calls.
     * @param values The list of values (in wei) for calls.
     * @param calldatas The list of calldata for calls.
     * @param descriptionHash The hash of the proposal description.
     * @dev Overrides the function from Governor and GovernorTimelockControl.
     * See OpenZeppelin GovernorTimelockControl: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorTimelockControl
     */
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(
            proposalId,
            targets,
            values,
            calldatas,
            descriptionHash
        );
    }

    /**
     * @dev Cancels a proposal.
     * @param targets The list of target addresses for calls.
     * @param values The list of values (in wei) for calls.
     * @param calldatas The list of calldata for calls.
     * @param descriptionHash The hash of the proposal description.
     * @return The ID of the canceled proposal.
     * @dev Overrides the function from Governor and GovernorTimelockControl.
     * See OpenZeppelin GovernorTimelockControl: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorTimelockControl
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Returns the address of the executor.
     * @return The address of the executor.
     * @dev Overrides the function from Governor and GovernorTimelockControl.
     * See OpenZeppelin GovernorTimelockControl: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorTimelockControl
     */
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

     /**
     * @notice Returns the proposal deadline in blocks.
     * @param proposalId The ID of the proposal.
     * @return The block number when voting ends.
     * @dev Overrides the function from Governor and GovernorPreventLateQuorum.
     */
    function proposalDeadline(uint256 proposalId)
        public
        view
        override(Governor, IGovernor, GovernorPreventLateQuorum)
        returns (uint256)
    {
        return super.proposalDeadline(proposalId);
    }

    /**
     * @dev Casts a vote for a proposal.
     * @param proposalId The ID of the proposal.
     * @param account The address of the voter.
     * @param support The support value (0=against, 1=for, 2=abstain).
     * @param reason The reason for the vote.
     * @param params Additional parameters.
     * @return The number of votes cast.
     * @dev Overrides the function from Governor and GovernorPreventLateQuorum.
     */
    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason,
        bytes memory params
    )
        internal
        override(Governor, GovernorPreventLateQuorum)
        returns (uint256)
    {
        return super._castVote(proposalId, account, support, reason, params);
    }


    /**
     * @notice Checks if a given interface is supported.
     * @param interfaceId The interface identifier.
     * @return True if the interface is supported, false otherwise.
     * @dev Overrides the function from Governor and GovernorTimelockControl.
     * See OpenZeppelin GovernorTimelockControl: https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorTimelockControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

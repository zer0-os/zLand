// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

//import "../interfaces/IEOARegistry.sol";
//import "../interfaces/ITransferValidator.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
//import "@limitbreak/permit-c/IPermitC.sol";

/**
 * @title  ICreatorTokenTransferValidator
 * @notice Interface for the CreatorTokenTransferValidator contract.
 * @dev    This interface includes all the public and external functions, events, and necessary structs.
 */
interface ICTTV is IERC165 {
    /*************************************************************************/
    /*                                EVENTS                                 */
    /*************************************************************************/

    event CreatedList(uint256 indexed id, string name);
    event AppliedListToCollection(address indexed collection, uint120 indexed id);
    event ReassignedListOwnership(uint256 indexed id, address indexed newOwner);
    event AccountFrozenForCollection(address indexed collection, address indexed account);
    event AccountUnfrozenForCollection(address indexed collection, address indexed account);
    event AddedAccountToList(uint8 indexed kind, uint256 indexed id, address indexed account);
    event AddedCodeHashToList(uint8 indexed kind, uint256 indexed id, bytes32 indexed codehash);
    event RemovedAccountFromList(uint8 indexed kind, uint256 indexed id, address indexed account);
    event RemovedCodeHashFromList(uint8 indexed kind, uint256 indexed id, bytes32 indexed codehash);
    event SetTransferSecurityLevel(address indexed collection, uint8 level);
    event SetAuthorizationModeEnabled(address indexed collection, bool disabled, bool authorizersCannotSetWildcardOperators);
    event SetAccountFreezingModeEnabled(address indexed collection, bool enabled);
    event SetTokenType(address indexed collection, uint16 tokenType);

    /*************************************************************************/
    /*                                STRUCTS                                */
    /*************************************************************************/

    /**
     * @notice Structure representing the security policy of a collection.
     */
    struct CollectionSecurityPolicyV3 {
        uint8 transferSecurityLevel;
        bool disableAuthorizationMode;
        bool authorizersCannotSetWildcardOperators;
        bool enableAccountFreezingMode;
        uint120 listId;
        uint16 tokenType;
    }

    /*************************************************************************/
    /*                           PUBLIC VARIABLES                            */
    /*************************************************************************/

    function lastListId() external view returns (uint120);

    function listOwners(uint120 id) external view returns (address);

    /*************************************************************************/
    /*                               FUNCTIONS                               */
    /*************************************************************************/

    // Transfer Validation Functions
    function validateTransfer(address caller, address from, address to) external view;

    function validateTransfer(address caller, address from, address to, uint256 tokenId) external view;

    function validateTransfer(address caller, address from, address to, uint256 tokenId, uint256 amount) external view;

    function applyCollectionTransferPolicy(address caller, address from, address to) external view;

    function transferSecurityPolicies(uint256 level) external view returns (uint256 callerConstraints, uint256 receiverConstraints);

    // Authorized Transfer Functions
    function beforeAuthorizedTransfer(address operator, address token, uint256 tokenId) external;

    function afterAuthorizedTransfer(address token, uint256 tokenId) external;

    function beforeAuthorizedTransfer(address operator, address token) external;

    function afterAuthorizedTransfer(address token) external;

    function beforeAuthorizedTransfer(address token, uint256 tokenId) external;

    function beforeAuthorizedTransferWithAmount(address token, uint256 tokenId, uint256 amount) external;

    function afterAuthorizedTransferWithAmount(address token, uint256 tokenId) external;

    // List Management Functions
    function createList(string calldata name) external returns (uint120 id);

    function createListCopy(string calldata name, uint120 sourceListId) external returns (uint120 id);

    function reassignOwnershipOfList(uint120 id, address newOwner) external;

    function renounceOwnershipOfList(uint120 id) external;

    function setTransferSecurityLevelOfCollection(
        address collection,
        uint8 level,
        bool disableAuthorizationMode,
        bool disableWildcardOperators,
        bool enableAccountFreezingMode
    ) external;

    function setTokenTypeOfCollection(address collection, uint16 tokenType) external;

    function applyListToCollection(address collection, uint120 id) external;

    function freezeAccountsForCollection(address collection, address[] calldata accountsToFreeze) external;

    function unfreezeAccountsForCollection(address collection, address[] calldata accountsToUnfreeze) external;

    function addAccountsToBlacklist(uint120 id, address[] calldata accounts) external;

    function addAccountsToWhitelist(uint120 id, address[] calldata accounts) external;

    function addAccountsToAuthorizers(uint120 id, address[] calldata accounts) external;

    function addCodeHashesToBlacklist(uint120 id, bytes32[] calldata codehashes) external;

    function addCodeHashesToWhitelist(uint120 id, bytes32[] calldata codehashes) external;

    function removeAccountsFromBlacklist(uint120 id, address[] calldata accounts) external;

    function removeAccountsFromWhitelist(uint120 id, address[] calldata accounts) external;

    function removeAccountsFromAuthorizers(uint120 id, address[] calldata accounts) external;

    function removeCodeHashesFromBlacklist(uint120 id, bytes32[] calldata codehashes) external;

    function removeCodeHashesFromWhitelist(uint120 id, bytes32[] calldata codehashes) external;

    // View Functions
    function getCollectionSecurityPolicy(address collection) external view returns (CollectionSecurityPolicyV3 memory);

    function getBlacklistedAccounts(uint120 id) external view returns (address[] memory);

    function getWhitelistedAccounts(uint120 id) external view returns (address[] memory);

    function getAuthorizerAccounts(uint120 id) external view returns (address[] memory);

    function getBlacklistedCodeHashes(uint120 id) external view returns (bytes32[] memory);

    function getWhitelistedCodeHashes(uint120 id) external view returns (bytes32[] memory);

    function isAccountBlacklisted(uint120 id, address account) external view returns (bool);

    function isAccountWhitelisted(uint120 id, address account) external view returns (bool);

    function isAccountAuthorizer(uint120 id, address account) external view returns (bool);

    function isCodeHashBlacklisted(uint120 id, bytes32 codehash) external view returns (bool);

    function isCodeHashWhitelisted(uint120 id, bytes32 codehash) external view returns (bool);

    function getBlacklistedAccountsByCollection(address collection) external view returns (address[] memory);

    function getWhitelistedAccountsByCollection(address collection) external view returns (address[] memory);

    function getAuthorizerAccountsByCollection(address collection) external view returns (address[] memory);

    function getFrozenAccountsByCollection(address collection) external view returns (address[] memory);

    function getBlacklistedCodeHashesByCollection(address collection) external view returns (bytes32[] memory);

    function getWhitelistedCodeHashesByCollection(address collection) external view returns (bytes32[] memory);

    function isAccountBlacklistedByCollection(address collection, address account) external view returns (bool);

    function isAccountWhitelistedByCollection(address collection, address account) external view returns (bool);

    function isAccountAuthorizerOfCollection(address collection, address account) external view returns (bool);

    function isAccountFrozenForCollection(address collection, address account) external view returns (bool);

    function isCodeHashBlacklistedByCollection(address collection, bytes32 codehash) external view returns (bool);

    function isCodeHashWhitelistedByCollection(address collection, bytes32 codehash) external view returns (bool);

    // EOA Registry Function
    function isVerifiedEOA(address account) external view returns (bool);

    // ERC165 Support Interface
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IFabricator.sol";

contract Fabricator is Ownable, ERC721, IFabricator{
    mapping(uint => Build) private builds;

    constructor(string memory name, string memory symbol) Ownable(msg.sender) ERC721(name, symbol) {}

    function fabricate(uint id, uint amount) external override payable {
        require(builds[id].tokenIDs.length != 0, "ID doesnt exist");
        require(msg.value == builds[id].fee * amount, "Invalid fee paid");
        for (uint i = 0; i < builds[id].tokenIDs.length; i++) {
            builds[id].tokenContract.safeBatchTransferFrom(msg.sender, address(this), builds[id].tokenIDs, builds[id].amountsRequired, "");
        }
        _mint(msg.sender, id);
    }

    function addBuild(uint id, string calldata uri, ERC1155 tokenContract, uint[] calldata tokenIDs, uint[] calldata amountsRequired, uint fee) external override onlyOwner(){
        require(id != 0, "No ID");
        require(tokenIDs.length != 0, "No tokenIDs");
        require(tokenIDs.length == amountsRequired.length, "Materials length mismatch");
        require(builds[id].tokenIDs.length == 0, "ID taken");
        builds[id] = Build(uri, tokenContract, tokenIDs, amountsRequired, fee);
    }

    function collectFees() external override onlyOwner() {
        payable(owner()).transfer(address(this).balance);
    }

    function getBuild(uint id) public override view returns(Build memory){
        return builds[id];
    }
}

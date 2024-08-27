// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./IRefinery.sol";

contract Refinery is Ownable, ERC1155, IRefinery{
    mapping(uint => Blueprint) private blueprints;

    constructor(string memory baseURI) Ownable(msg.sender) ERC1155(baseURI) {}

    function fulfill(uint id, uint amount, bytes calldata data) external override payable {
        require(blueprints[id].tokens.length != 0, "ID doesnt exist");
        require(msg.value == blueprints[id].fee * amount, "Invalid fee paid");
        for (uint i = 0; i < blueprints[id].tokens.length; i++) {
            blueprints[id].tokens[i].transferFrom(msg.sender, address(this), blueprints[id].amountsRequired[i]*amount);
        }
        _mint(msg.sender, id, amount, data);
    }

    function addBlueprint(uint id, string calldata uri, ERC20[] calldata tokens, uint[] calldata amountsRequired, uint fee) external override onlyOwner(){
        require(id != 0, "No ID");
        require(tokens.length != 0, "No tokens");
        require(tokens.length == amountsRequired.length, "Tokens length mismatch");
        require(blueprints[id].tokens.length == 0, "ID taken");
        blueprints[id] = Blueprint(uri, tokens, amountsRequired, fee);
    }

    function collectFees() external override onlyOwner() {
        payable(owner()).transfer(address(this).balance);
    }

    function getBlueprint(uint id) public override view returns(Blueprint memory){
        return blueprints[id];
    }
}

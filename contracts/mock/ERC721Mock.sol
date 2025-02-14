// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
// console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Mock is Ownable, ERC721{
    ///Test token dont deploy
    constructor(address minter, string memory name, string memory symbol) ERC721(name,symbol){
        transferOwnership(minter);
    }
    function mint(address to, uint id) public onlyOwner(){
        _mint(to, id);
    } 
}

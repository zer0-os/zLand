// deploy.ts

import { ethers } from "hardhat";
import { ZDAOFactory } from "../typechain-types";

async function main() {
    // Get the ZDAOFactory contract factory
    const ZDAOFactory = await ethers.getContractFactory("ZDAOFactory");

    // Deploy the ZDAOFactory contract
    const zdaoFactory = await ZDAOFactory.deploy();

    console.log(`ZDAOFactory deployed to: ${await zdaoFactory.getAddress()}`);

    // Example parameters for creating a new ZDAO instance
    const governorName = "MyGovernor";
    const tokenAddress = "0xYourGovernanceTokenAddress"; // replace with actual token address
    const timelockAddress = "0x5A889A1337D7bEFC43A887fF896593Da78f372a6"; // replace with actual timelock address
    const votingDelay = 1; // in blocks
    const votingPeriod = 6570; // in blocks, example for ~1 day on Ethereum
    const proposalThreshold = ethers.parseEther("100"); // minimum tokens to propose
    const quorumPercentage = 5; // 5% quorum
    const voteExtension = 100; // example extension period

    // Call createZDAO to deploy a new ZDAO instance through the factory
    const tx = await zdaoFactory.createZDAO(
        governorName,
        tokenAddress,
        timelockAddress,
        votingDelay,
        votingPeriod,
        proposalThreshold,
        quorumPercentage,
        voteExtension
    );

    // Wait for transaction to complete
    const receipt = await tx.wait();
}

// Execute the script
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

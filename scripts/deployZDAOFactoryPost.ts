// deploy.ts

import { ethers } from "hardhat";
import { ZDAOFactory } from "../typechain-types";

async function main() {
    // Get the ZDAOFactory contract factory
    const ZDAOFactory = await ethers.getContractAt("ZDAOFactory", "0x2722769C201B669342d909F0E95E17441EdFDBF0");

    // Example parameters for creating a new ZDAO instance
    const governorName = "WIAMI DAO";
    const tokenAddress = "0x9534D5C9f0539933367419826b81C5Ee14AD16b6"; // replace with actual token address
    const timelockAddress = "0x2105694E890678D3eB9340CfFB5eD43b0fA6474b"; // replace with actual timelock address
    const votingDelay = 100; // in blocks
    const votingPeriod = 60000; // in blocks, example for ~1 day on Ethereum
    const proposalThreshold = 1; // minimum tokens to propose
    const quorumPercentage = 5; // 5% quorum
    const voteExtension = 6000; // example extension period

    // Call createZDAO to deploy a new ZDAO instance through the factory
    const tx = await ZDAOFactory.createZDAO(
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

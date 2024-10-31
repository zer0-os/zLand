// deploy.ts

import { ethers } from "hardhat";
import { ZDAOFactory } from "../typechain-types";

async function main() {
    //previously deployed to 0x2105694E890678D3eB9340CfFB5eD43b0fA6474b mainnet
    // Get the ZDAOFactory contract factory
    const TimelockFactory = await ethers.getContractFactory("TimelockController");

    const minDelay = 86400; // Min delay in seconds, 24 hours
    const proposers: string[] = [];
    const executors: string[] = [];
    //const admin = ownerAddr;
    // Deploy the TimelockController contract
    const timelockFactory = await TimelockFactory.deploy(
        minDelay,
        proposers,
        executors,
        "0x721600d52B82111A8F10F307192c78b675a3A356"
    );

    console.log(`Timelock deployed: ${await timelockFactory.getAddress()}`);
}

// Execute the script
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

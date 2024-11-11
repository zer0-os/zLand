// deploy.ts

import { ethers } from "hardhat";
import { ZDAOFactory } from "../typechain-types";

async function main() {
    //previously deployed to 0x2105694E890678D3eB9340CfFB5eD43b0fA6474b mainnet
    // Get the ZDAOFactory contract factory    
    const timelock = await ethers.getContractAt("TimelockController", "0x2105694E890678D3eB9340CfFB5eD43b0fA6474b");
    //const timelockFac = await ethers.getContractFactory("TimelockController");

    const minDelay = 86400; // Min delay in seconds, 24 hours
    const proposers: string[] = [];
    const executors: string[] = [];
    //const admin = ownerAddr;
    // Deploy the TimelockController contract
    //const timelock = await timelockFac.deploy(
    //    minDelay,
    //    proposers,
    //    executors,
    //    "0x721600d52B82111A8F10F307192c78b675a3A356"
    //);

    // Grant roles in the TimelockController
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    //const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();

    // Grant the proposer role to the Governor contract and the owner
    //await timelock.revokeRole(proposerRole, "0x289AABeAF429C918d4eEe42676F29D9aA467259B");
    //await timelock.revokeRole(proposerRole, "0x721600d52B82111A8F10F307192c78b675a3A356");
    const tx = await timelock.grantRole(proposerRole, "0x7B821BE72DE68A83BE280641620B8E9D36379C71");
    await tx.wait();
    // Grant the executor role to the zero address (open executor)
    //await timelock.grantRole(executorRole, ethers.ZeroAddress); // Adjusted syntax for ethers.js v6

    console.log(`Timelock deployed: ${await timelock.getAddress()}`);
}

// Execute the script
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

import { ethers, run } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    //const timelockAddr = "";
    const minDelay = 86400; // Min delay in seconds, 24 hours
    const proposers: string[] = [];
    const executors: string[] = [];
    const admin = "0x721600d52B82111A8F10F307192c78b675a3A356";
    //const admin = ownerAddr;
    // Deploy the TimelockController contract
  console.log("Verifying the contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: "0x1843A2c71Ee6bdd18f3F00e95e44A0c61d64A4A4",
      constructorArguments: [
        minDelay,
        proposers,
        executors,
        admin
      ],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

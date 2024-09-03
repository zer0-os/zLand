import { ethers } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("entries.json", "utf8"));

  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log(`Deploying LandToken with the account: ${wallet.address}`);

  // Deploy the contract

  const baseURI = "ar://0hMSgsrg-C4rD8iQOmApcxEpwN-ilDXWa8Lv6I2_TCM/";
  const LandToken = await ethers.getContractFactory("LandToken", wallet);
  const landToken = await LandToken.deploy("LandToken", "LND", baseURI, root);

  //await landToken.deployed();
  const landAddr = await landToken.getAddress();
  console.log(`LandToken deployed to: ${landAddr}`);

  // Issue a few tokens
  const numberOfTokensToIssue = 2; // Change this number to issue more or fewer tokens

  for (let i = 0; i < numberOfTokensToIssue; i++) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = parseInt(entry.id);

    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    await landToken.connect(wallet).issue(proof, entry.address, tokenId);
  }

  console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

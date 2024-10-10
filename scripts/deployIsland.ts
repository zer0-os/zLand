import { ethers } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("output.json", "utf8"));
  
  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const walletAddr = await wallet.getAddress();
  
  const testURI = "ar://cDQLqHx5Wta4YbJ7HgzeiZ3HJUrSxjFDofsCh12SGoE";

  console.log(`Deploying LandToken with the account: ${wallet.address}`);

  // Deploy the contract
  const contractURI = "";
  const baseURI = "ar://IQ1-6dzFwTQ6q-4cs4Q1HkZvh6BBmgiIQOg3kMcU8Mk/"
  //const baseURI = "ar://Uy0oRGIQ3RbmgDaOTLpnren3UQRCskuF6LB6bC2yaMs"
  const LandToken = await ethers.getContractFactory("LandToken", wallet);
  const landToken = await LandToken.deploy(walletAddr, 0, "Wiami: The Island", "ILND", contractURI, baseURI, "1", root);

  //await landToken.deployed();
  const landAddr = await landToken.getAddress();
  console.log(`LandToken deployed to: ${landAddr}`);

  // Issue a few tokens
  const numberOfTokensToIssue = 1; // Change this number to issue more or fewer tokens

  for (let i = 0; i < numberOfTokensToIssue; i+=1) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = BigInt(entry.id);

    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    await landToken.connect(wallet).claim(proof, entry.address, tokenId);
  }

  console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

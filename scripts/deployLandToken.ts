import { ethers } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("values.json", "utf8"));
  
  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const walletAddr = await wallet.getAddress();

  console.log(`Deploying LandToken with the account: ${wallet.address}`);

  // Deploy the contract
  const contractURI = "ar://M5cEqycG5rjjmmDbeL8zu9gRRn6U3-sPVnDevb49l3c";
  const baseURI = "ar://021r9_E0rh9dyNvj6WPkZMtqn346eC57mN1Q6HXK0Fs/";
  const LandToken = await ethers.getContractFactory("LandToken", wallet);
  const landToken = await LandToken.deploy(walletAddr, 0, "LandToken", "LND", contractURI, baseURI, "1", root);

  //await landToken.deployed();
  const landAddr = await landToken.getAddress();
  console.log(`LandToken deployed to: ${landAddr}`);

  // Issue a few tokens
  const numberOfTokensToIssue = 8; // Change this number to issue more or fewer tokens

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

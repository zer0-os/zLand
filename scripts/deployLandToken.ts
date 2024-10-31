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

  console.log(`Deploying LandFactory with the account: ${walletAddr}`);

  // Deploy the LandFactory contract
  const LandFactory = await ethers.getContractFactory("LandFactory", wallet);
  const landFactory = await LandFactory.deploy();
  const landFactoryAddress = await landFactory.getAddress();
  console.log(`LandFactory deployed to: ${landFactoryAddress}`);

  // Parameters for creating the LandToken
  const royaltyReceiver = walletAddr;
  const royaltyFeeNumerator = 0;
  const tokenName = "Wiami: The Island";
  const tokenSymbol = "ILND";
  const contractURI = "";
  const baseURI = "ar://IQ1-6dzFwTQ6q-4cs4Q1HkZvh6BBmgiIQOg3kMcU8Mk/";
  const version = "1";

  // Create a LandToken via the factory
  console.log(`Creating LandToken...`);
  const tx = await landFactory.createLandToken(
    royaltyReceiver,
    royaltyFeeNumerator,
    tokenName,
    tokenSymbol,
    contractURI,
    baseURI,
    version,
    root
  );
  await tx.wait();

  // Fetch the newly created LandToken address from the tokens array
  const landTokens = await landFactory.tokens(0);
  const landTokenAddress = landTokens[landTokens.length - 1]; // Get the last token in the list

  console.log(`LandToken created at address: ${landTokenAddress}`);

  // Interact with the deployed LandToken to issue tokens
  const LandToken = await ethers.getContractAt("LandToken", landTokenAddress, wallet);

  // Issue a few tokens
  const numberOfTokensToIssue = 1; // Change this number to issue more or fewer tokens

  for (let i = 0; i < numberOfTokensToIssue; i++) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = BigInt(entry.id);

    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    await LandToken.connect(wallet).claim(proof, entry.address, tokenId);
  }

  console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

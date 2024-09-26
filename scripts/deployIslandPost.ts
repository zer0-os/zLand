import { ethers } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Contract address where LandToken was deployed
  const contractAddress = "0x0c6Bd08308e2FB83CCF7FCC12B09f69107456B2c";

  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("output.json", "utf8"));
  
  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log(`Using the account: ${wallet.address}`);

  // Connect to the deployed LandToken contract
  const LandToken = await ethers.getContractAt("ILandToken", contractAddress, wallet);
  /*
  // Example: Set the contract URI
  const newContractURI = "https://new-contract-uri.example.com";
  await LandToken.setContractURI(newContractURI);
  console.log(`Contract URI updated to: ${newContractURI}`);

  // Example: Set the base URI
  const newBaseURI = "https://new-base-uri.example.com/";
  await LandToken.setBaseURI(newBaseURI);
  console.log(`Base URI updated to: ${newBaseURI}`);

  // Example: Set default royalty
  const royaltyReceiver = "0xYourRoyaltyReceiverAddress";
  const royaltyFeeNumerator = 500; // 5%
  await LandToken.setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
  console.log(`Default royalty set to ${royaltyFeeNumerator / 100}% for receiver: ${royaltyReceiver}`);

  // Example: Set token-specific royalty
  const tokenId = 1;
  const tokenRoyaltyReceiver = "0xAnotherRoyaltyReceiverAddress";
  const tokenRoyaltyFeeNumerator = 300; // 3%
  await LandToken.setTokenRoyalty(tokenId, tokenRoyaltyReceiver, tokenRoyaltyFeeNumerator);
  console.log(`Royalty for token ${tokenId} set to ${tokenRoyaltyFeeNumerator / 100}% for receiver: ${tokenRoyaltyReceiver}`);
  
  // Example: Set token URI
  const tokenURI = "https://new-token-uri.example.com/1.json";
  await LandToken._setTokenURI(tokenId, tokenURI);
  console.log(`Token URI for token ${tokenId} set to: ${tokenURI}`);
  */
  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  // Issue tokens in a loop
  const numberOfTokensToIssue = 4444; // Adjust this value as needed
  for (let i = 0; i < numberOfTokensToIssue; i += 4444) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = BigInt(entry.id);

    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    await LandToken.issue(proof, entry.address, tokenId, entry.uri);
  }

  console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers, run } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("dummyData.json", "utf8"));
  
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
  //const contractURI = "ar://33rFVRyBCrCRBfpRk3f-S-wSEZgHez8IfgTw4DPBzXw";
  //const baseURI = "ar://IQ1-6dzFwTQ6q-4cs4Q1HkZvh6BBmgiIQOg3kMcU8Mk/";
  const contractURI = "";
  const baseURI = "ar://IQ1-6dzFwTQ6q-4cs4Q1HkZvh6BBmgiIQOg3kMcU8Mk/";
  const daoAddress = "0x2105694E890678D3eB9340CfFB5eD43b0fA6474b";

  const LandToken = await ethers.getContractFactory("LandToken", wallet);
  const landToken = await LandToken.deploy(
    daoAddress,
    500,
    "Test",
    "TST",
    contractURI,
    baseURI,
    "1",
    root
  );
  await landToken.waitForDeployment();
  //await landToken.setToDefaultSecurityPolicy();

  const landAddr = await landToken.getAddress();
  console.log(`LandToken deployed to: ${landAddr}`);

  // Verify the contract on Etherscan
  //console.log("Waiting for Etherscan to index the contract...");
  //await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 60 seconds
    /*
  console.log("Verifying the contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: landAddr,
      constructorArguments: [
        daoAddress,
        500,
        "Wilder Land: The Island",
        "WIAMI",
        contractURI,
        baseURI,
        "1",
        root,
      ],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }*/

  // Issue a few tokens
  const numberOfTokensToIssue = 1; // Change this number to issue more or fewer tokens

  for (let i = 0; i < numberOfTokensToIssue; i += 1) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = BigInt(entry.id);

    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    const tx = await landToken.connect(wallet).claim(proof, entry.address, tokenId);
    await tx.wait();
  }

  console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

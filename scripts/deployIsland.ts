import { ethers, run } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  //zchain land 0x4e86f358d3Ab0AB5734D4f90Ae4c1fBa57d4E4b0
  
  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("dropData.json", "utf8"));
  
  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.Z_KEY!, provider);
  const walletAddr = await wallet.getAddress();
  
  console.log(`Deploying LandToken with the account: ${wallet.address}`);

  // Deploy the contract
  const contractURI = "ar://33rFVRyBCrCRBfpRk3f-S-wSEZgHez8IfgTw4DPBzXw";
  const baseURI = "ar://IQ1-6dzFwTQ6q-4cs4Q1HkZvh6BBmgiIQOg3kMcU8Mk/";
  
  const daoAddress = "0xc01D72ac53dC1d3CEE4A47a02dC99A5D65932B04"; //zchain dao address
  
  const LandToken = await ethers.getContractFactory("LandToken", wallet);
  const landToken = await LandToken.deploy(
    daoAddress,
    500,
    "Wilder Land: The Island",
    "WIAMI",
    contractURI,
    baseURI,
    "1",
    root
  );
  await landToken.waitForDeployment();

  const landAddr = await landToken.getAddress();
  console.log(`LandToken deployed to: ${landAddr}`);

  // Verify the contract on Etherscan
  //console.log("Waiting for Etherscan to index the contract...");
  //await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 60 seconds

  /*console.log("Verifying the contract on Etherscan...");
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

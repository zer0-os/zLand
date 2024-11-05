import { ethers } from "hardhat";
import * as fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Contract address where LandToken was deployed
  //const contractAddress = "0xAd5db740300fE67716b3e3db65752866E92C3a54";
  const contractAddress = "0x9534D5C9f0539933367419826b81C5Ee14AD16b6";
  
  const validator = "0x721c0078c2328597ca70f5451fff5a7b38d4e947";

  // Load values from the JSON file
  const values = JSON.parse(fs.readFileSync("output.json", "utf8"));
  
  // Transform values into the format required for the Merkle tree
  const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);

  // Get the deployer's wallet using the PRIVATE_KEY from the environment
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log(`Using the account: ${wallet.address}`);

  // Connect to the deployed LandToken contract
  const validatorContract = await ethers.getContractAt("ICTTV", contractAddress, wallet);
  
  // Example: Set the contract URI
  //const newContractURI = "ar://AbWG58cITnikvr1yJn1iWo5Um0QKPhNbjqrumHam7jQ";
  //await LandToken.setContractURI(newContractURI);
  //console.log(`Contract URI updated to: ${newContractURI}`);
  /*
  // Example: Set the base URI
  const newBaseURI = "https://new-base-uri.example.com/";
  await LandToken.setBaseURI(newBaseURI);
  console.log(`Base URI updated to: ${newBaseURI}`);
  */
  // Example: Set default royalty
  //const royaltyReceiver = wallet.address;
  //const royaltyFeeNumerator = 500; // 5%
  //await LandToken.setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
  //console.log(`Default royalty set to ${royaltyFeeNumerator / 100}% for receiver: ${royaltyReceiver}`);
  
  //Example: set custom security policy
  //await LandToken.setToCustomValidatorAndSecurityPolicy(
  //  "0x0000721C310194CcfC01E523fc93C9cCcFa2A0Ac",
  //  1,
  //  14,
  //  1
  //)
  //Magic Eden addresses to whitelist
  //[[0x009a1D8DE8D80Fcd9C6aaAFE97A237dC663f2978]
  //[0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834]
  //[0x9A1D001670C8b17F8B7900E8d7a41e785B3F0515]
  //[0x9A1D00828912F81f3fa34Ca47c0BdB9C016856BF]
  //[0xF882c6f07A0Cf48CFb181e23fD1780299d13b633]
  //[0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC]]
  //opensea whitelist - ["0x009a1D8DE8D80Fcd9C6aaAFE97A237dC663f2978],"0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834", "0x9A1D001670C8b17F8B7900E8d7a41e785B3F0515", "0x9A1D00828912F81f3fa34Ca47c0BdB9C016856BF"]
  //[
  //  "0x6c8bae40D6cCcca799E019f16c1ac594b5069930",
  //  "0xe625a23351446B76ff38a1D21e90c1E102d99d97",
  //  "0x887C85Bd105E83711Bf7636dF0e5d91d7Dc7b767"
  //]

  //["0x009a1dc9F1A6e2134aD4236Fcd75B1aE62858507","0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834","0x9A1D001670C8b17F8B7900E8d7a41e785B3F0515","0x6c8bae40D6cCcca799E019f16c1ac594b5069930","0xe625a23351446B76ff38a1D21e90c1E102d99d97","0x887C85Bd105E83711Bf7636dF0e5d91d7Dc7b767"]
    //["0x009a1dc9F1A6e2134aD4236Fcd75B1aE62858507","0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834","0x9A1D001670C8b17F8B7900E8d7a41e785B3F0515","0x6c8bae40D6cCcca799E019f16c1ac594b5069930","0xe625a23351446B76ff38a1D21e90c1E102d99d97","0x887C85Bd105E83711Bf7636dF0e5d91d7Dc7b767"]
    //[0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834]
    //[0x9A1D001670C8b17F8B7900E8d7a41e785B3F0515]
  //console.log(await validatorContract.getWhitelistedAccounts(0));

  // Example: Set token-specific royalty
  //const tokenId = 1;
  //const tokenRoyaltyReceiver = "0xAnotherRoyaltyReceiverAddress";
  //const tokenRoyaltyFeeNumerator = 300; // 3%
  //await LandToken.setTokenRoyalty(tokenId, tokenRoyaltyReceiver, tokenRoyaltyFeeNumerator);
  //console.log(`Royalty for token ${tokenId} set to ${tokenRoyaltyFeeNumerator / 100}% for receiver: ${tokenRoyaltyReceiver}`);
  
  // Example: Set token URI
  //const tokenURI = "https://new-token-uri.example.com/1.json";
  //await LandToken._setTokenURI(tokenId, tokenURI);
  //console.log(`Token URI for token ${tokenId} set to: ${tokenURI}`);
  
  const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
  const root = tree.root;

  //const testURI = "ar://LuCKuEYHW0rRu5etqAXbWsWAaXlQIiF_5QjZYBxOD0g";
  const testURI = "ar://cDQLqHx5Wta4YbJ7HgzeiZ3HJUrSxjFDofsCh12SGoE";
  
  /* Issue tokens in a loop
  const numberOfTokensToIssue = 4444; // Adjust this value as needed
  for (let i = 2207; i < numberOfTokensToIssue; i += 1) {
    const entry = values[i];
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = BigInt(entry.id);

    console.log(`entry ${i}`);
    console.log(`Issuing token ${tokenId} to ${entry.address}`);
    const tx = await LandToken.claim(proof, entry.address, tokenId);
    //await tx.wait();
    console.log("claimed ", i);
  }*/
  
  //console.log(`Issued ${numberOfTokensToIssue} tokens successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

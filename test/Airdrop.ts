import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
  import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
  import * as fs from "fs";
  import { ethers } from "hardhat";
  
  interface Entry {
    address: string;
    id: string;
  }
  
  describe("LandToken", function () {
    async function deployLandTokenFixture() {
      const [owner, addr1, addr2] = await hre.ethers.getSigners();
  
      // Load values from the JSON file
      const values: Entry[] = JSON.parse(fs.readFileSync("entries.json", "utf8"));
  
      // Transform values into the format required for the Merkle tree
      const treeValues = values.map(value => [value.address, value.id]);
  
      const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
      const root = tree.root;
  
      const LandToken = await hre.ethers.getContractFactory("LandToken");
      const landToken = await LandToken.deploy("LandToken", "LND", root);
  
      return { landToken, owner, addr1, addr2, tree, values };
    }
  
    describe("Deployment", function () {
      it("Should deploy with the correct root", async function () {
        const { landToken, tree } = await loadFixture(deployLandTokenFixture);
        expect(await landToken.root()).to.equal(tree.root);
      });
    });
  
    describe("Issue Tokens", function () {
      const testURI = "ar://0hMSgsrg-C4rD8iQOmApcxEpwN-ilDXWa8Lv6I2_TCM";
      let totalGasUsed: bigint = 0n; // Initialize total gas used to zero as bigint
  
      for (let i = 0; i < 4444; i++) {
        it(`Should allow issuing token ${i} and check the owner`, async function () {
          const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);
  
          const entry = values[i];
          const proof = tree.getProof([entry.address, entry.id]);
          const tokenId = parseInt(entry.id);
  
          // Issue the token and capture the transaction
          const tx = await landToken.issue(proof, entry.address, tokenId, testURI);
  
          // Wait for the transaction to be mined and get the receipt
          const receipt = await tx.wait();
  
          if (receipt) {
            // Accumulate gas used
            totalGasUsed += BigInt(receipt.gasUsed.toString());
          } else {
            console.warn(`Transaction for token ${tokenId} did not return a receipt.`);
          }
  
          // Normalize both addresses using ethers.utils.getAddress
          const actualOwner = ethers.getAddress(await landToken.ownerOf(tokenId));
          const expectedOwner = ethers.getAddress(entry.address);
  
          // Check that the owner of the token is the intended address
          expect(actualOwner).to.equal(expectedOwner);
        });
  
        it(`Should revert when trying to issue token ${i} with an invalid proof`, async function () {
          const { landToken, addr2, values } = await loadFixture(deployLandTokenFixture);
          const invalidProof: string[] = []; // Empty array as an invalid proof
          
          const entry = values[i];
          const tokenId = parseInt(entry.id);
  
          await expect(
            landToken.issue(invalidProof, entry.address, tokenId, testURI)
          ).to.be.revertedWithCustomError(landToken, "INVALID_PROOF");
        });
  
        it(`Should revert when trying to issue token ${i} again`, async function () {
          const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);
  
          const entry = values[i];
          const proof = tree.getProof([entry.address, entry.id]);
          const tokenId = parseInt(entry.id);
  
          // Issue the token
          await landToken.issue(proof, entry.address, tokenId, testURI);
  
          // Try to issue it again and expect a revert
          await expect(
            landToken.issue(proof, entry.address, tokenId, testURI)
          ).to.be.revertedWithCustomError(landToken, "ID_CLAIMED");
        });
      }
  
      // After all tests, log the total gas used
      after(async function () {
        console.log(`Total gas used for issuing tokens: ${totalGasUsed}`);
      });
    });
  });
  
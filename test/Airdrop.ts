import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
  import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
  import * as fs from "fs";
  
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
      const landToken = await LandToken.deploy(root, "LandToken", "LND");
  
      return { landToken, owner, addr1, addr2, tree, values };
    }
  
    describe("Deployment", function () {
      it("Should deploy with the correct root", async function () {
        const { landToken, tree } = await loadFixture(deployLandTokenFixture);
        expect(await landToken.root()).to.equal(tree.root);
      });
    });
  
    describe("Claims", function () {
      for (let i = 0; i < 4444; i++) {
        it(`Should allow claiming token ${i} and check the owner`, async function () {
          const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);
  
          const entry = values[i];
          const proof = tree.getProof([entry.address, entry.id]);
          const tokenId = parseInt(entry.id);
  
          // Claim the token
          await landToken.connect(addr1).claim(proof, entry.address, tokenId);
  
          // Normalize both addresses to lowercase for comparison
          const actualOwner = (await landToken.ownerOf(tokenId)).toLowerCase();
          const expectedOwner = entry.address.toLowerCase();
  
          // Check that the owner of the token is the intended address
          expect(actualOwner).to.equal(expectedOwner);
        });
  
        it(`Should revert when trying to claim token ${i} with an invalid proof`, async function () {
          const { landToken, addr2, values } = await loadFixture(deployLandTokenFixture);
          const invalidProof: string[] = []; // Empty array as an invalid proof
          
          const entry = values[i];
          const tokenId = parseInt(entry.id);
  
          await expect(
            landToken.connect(addr2).claim(invalidProof, entry.address, tokenId)
          ).to.be.revertedWithCustomError(landToken, "INVALID_PROOF");
        });
  
        it(`Should revert when trying to claim token ${i} again`, async function () {
          const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);
  
          const entry = values[i];
          const proof = tree.getProof([entry.address, entry.id]);
          const tokenId = parseInt(entry.id);
  
          // Claim the token
          await landToken.connect(addr1).claim(proof, entry.address, tokenId);
  
          // Try to claim it again and expect a revert
          await expect(
            landToken.connect(addr1).claim(proof, entry.address, tokenId)
          ).to.be.revertedWithCustomError(landToken, "ID_CLAIMED");
        });
      }
    });
  });
  
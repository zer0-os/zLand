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
    const ownerAddr = await owner.getAddress();

    // Load values from the JSON file
    const values: Entry[] = JSON.parse(fs.readFileSync("values.json", "utf8"));

    // Transform values into the format required for the Merkle tree
    const treeValues = values.map((value) => [value.address, value.id]);

    const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
    const root = tree.root;

    const contractURI = "ar://zApSefQk3L8xFO1_WVVuFsgAMKbYfjv_YZD87q9EcO0/landData/contract";
    const baseURI = "ar://3lALF2kZjTA2IEgItM2wwhln0_UBr3n-uUMQU89ZzO8/";

    const LandToken = await hre.ethers.getContractFactory("LandToken");
    const landToken = await LandToken.deploy(
      ownerAddr,
      100, // 100 basis points for royalties
      "LandToken",
      "LND",
      contractURI,
      baseURI,
      root
    );

    return { landToken, owner, addr1, addr2, tree, values };
  }

  describe("Deployment", function () {
    it("Should deploy with the correct root", async function () {
      const { landToken, tree } = await loadFixture(deployLandTokenFixture);
      expect(await landToken.root()).to.equal(tree.root);
    });
  });

  describe("Issue Tokens", function () {
    let totalGasUsed: bigint = 0n; // Initialize total gas used to zero as bigint

    for (let i = 0; i < 4; i++) {
      it(`Should allow issuing token ${i} and check the owner`, async function () {
        const { landToken, addr1, tree, values } = await loadFixture(
          deployLandTokenFixture
        );

        const entry = values[i];
        const proof = tree.getProof([entry.address, entry.id]);
        const tokenId = parseInt(entry.id);

        // Issue the token and capture the transaction
        const tx = await landToken.issue(proof, entry.address, tokenId);

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

        console.log(await landToken.tokenURI(entry.id));
      });

      it(`Should revert when trying to issue token ${i} with an invalid proof`, async function () {
        const { landToken, addr2, values } = await loadFixture(
          deployLandTokenFixture
        );
        const invalidProof: string[] = []; // Empty array as an invalid proof

        const entry = values[i];
        const tokenId = parseInt(entry.id);

        await expect(
          landToken.issue(invalidProof, entry.address, tokenId)
        ).to.be.revertedWithCustomError(landToken, "INVALID_PROOF");
      });

      it(`Should revert when trying to issue token ${i} again`, async function () {
        const { landToken, addr1, tree, values } = await loadFixture(
          deployLandTokenFixture
        );

        const entry = values[i];
        const proof = tree.getProof([entry.address, entry.id]);
        const tokenId = parseInt(entry.id);

        // Issue the token
        await landToken.issue(proof, entry.address, tokenId);

        // Try to issue it again and expect a revert
        await expect(
          landToken.issue(proof, entry.address, tokenId)
        ).to.be.revertedWithCustomError(landToken, "ID_CLAIMED");
      });
    }

    // After all tests, log the total gas used
    after(async function () {
      console.log(`Total gas used for issuing tokens: ${totalGasUsed}`);
    });
  });

  describe("Token URI and Contract URI", function () {
    it("Should return the correct base URI", async function () {
      const { landToken } = await loadFixture(deployLandTokenFixture);
      const baseURI = await landToken.baseURI();
      expect(baseURI).to.equal("ar://3lALF2kZjTA2IEgItM2wwhln0_UBr3n-uUMQU89ZzO8/");
    });

    it("Should return the correct contract-level metadata URI", async function () {
      const { landToken } = await loadFixture(deployLandTokenFixture);
      const contractURI = await landToken.contractURI();
      expect(contractURI).to.equal("ar://zApSefQk3L8xFO1_WVVuFsgAMKbYfjv_YZD87q9EcO0/landData/contract");
    });

    it("Should revert when querying token URI for a non-existent token", async function () {
      const { landToken } = await loadFixture(deployLandTokenFixture);
      await expect(landToken.tokenURI(9999)).to.be.revertedWithCustomError(
        landToken,
        "NONEXISTENT_ID"
      );
    });
  });

  describe("Royalties", function () {
    it("Should update and return default royalties", async function () {
      const { landToken, owner, addr1 } = await loadFixture(deployLandTokenFixture);
      await landToken.setDefaultRoyalty(addr1.getAddress(), 200); // Set 200 basis points (2%)

      const [receiver, royaltyAmount] = await landToken.royaltyInfo(1, 10000); // Query royalty for 10,000 units
      expect(receiver).to.equal(await addr1.getAddress());
      expect(royaltyAmount).to.equal(200); // Expect 200 units as 2% of 10,000
    });

    it("Should set and return token-specific royalty", async function () {
      const { landToken, addr2 } = await loadFixture(deployLandTokenFixture);
      await landToken.setTokenRoyalty(1, await addr2.getAddress(), 500); // Set 500 basis points (5%) for tokenId 1

      const [receiver, royaltyAmount] = await landToken.royaltyInfo(1, 10000); // Query royalty for 10,000 units
      expect(receiver).to.equal(await addr2.getAddress());
      expect(royaltyAmount).to.equal(500); // Expect 500 units as 5% of 10,000
    });
  });

  // NEW TESTS FOR `tokenURI` LOGIC
  describe("Custom Token URI Logic", function () {
    it("Should return baseURI + tokenId when no custom URI is set", async function () {
      const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);

      const entry = values[0];
      const proof = tree.getProof([entry.address, entry.id]);
      const tokenId = parseInt(entry.id);

      // Issue token
      await landToken.issue(proof, entry.address, tokenId);

      const expectedURI = `ar://3lALF2kZjTA2IEgItM2wwhln0_UBr3n-uUMQU89ZzO8/${tokenId}`;
      const actualURI = await landToken.tokenURI(tokenId);

      expect(actualURI).to.equal(expectedURI);
    });

    it("Should return custom URI if set", async function () {
      const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);

      const entry = values[0];
      const proof = tree.getProof([entry.address, entry.id]);
      const tokenId = parseInt(entry.id);

      // Issue token
      await landToken.issue(proof, entry.address, tokenId);

      const customURI = "ar://custom-uri-for-token-1";
      await landToken._setTokenURI(tokenId, customURI); // Set a custom URI for the token

      const actualURI = await landToken.tokenURI(tokenId);
      expect(actualURI).to.equal(customURI);
    });

    it("Should revert when setting URI for a non-existent token", async function () {
      const { landToken } = await loadFixture(deployLandTokenFixture);
      const nonExistentTokenId = 9999;
      const customURI = "ar://custom-uri-non-existent";

      await expect(
        landToken._setTokenURI(nonExistentTokenId, customURI)
      ).to.be.revertedWithCustomError(landToken, "NONEXISTENT_ID");
    });
  });
});

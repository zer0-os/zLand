import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import * as fs from "fs";

// Helper function to mine a specific number of blocks
async function mineBlocks(numberOfBlocks: number) {
  for (let i = 0; i < numberOfBlocks; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}

interface Entry {
  address: string;
  id: string;
}

describe("LandToken and ZDAO Integration", function () {
  async function deployLandTokenFixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    const ownerAddr = await owner.getAddress();

    // Load values from the JSON file
    const values: Entry[] = JSON.parse(fs.readFileSync("values.json", "utf8"));

    // Transform values into the format required for the Merkle tree
    const treeValues = values.map((value) => [value.address, value.id]);
    const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
    const root = tree.root;

    // Deploy the LandFactory contract
    const LandFactory = await hre.ethers.getContractFactory("LandFactory");
    const landFactory = await LandFactory.deploy();
    //await landFactory.deployed();

    // Create LandToken via the factory
    const contractURI = "ar://zApSefQk3L8xFO1_WVVuFsgAMKbYfjv_YZD87q9EcO0/landData/contract";
    const baseURI = "ar://3lALF2kZjTA2IEgItM2wwhln0_UBr3n-uUMQU89ZzO8/";

    const tx = await landFactory.createLandToken(
      ownerAddr,
      100, // 100 basis points for royalties
      "LandToken",
      "LAND",
      contractURI,
      baseURI,
      "1",
      root
    );
    await tx.wait();

    // Fetch the deployed LandToken address from the factory's tokens array
    const landTokenAddress = await landFactory.tokens(0);
    console.log("lta ", landTokenAddress);
    const landToken = await ethers.getContractAt("LandToken", landTokenAddress);
    
    return { landToken, owner, addr1, addr2, tree, values, landFactory };
  }

  async function deployZDAOFixture() {
    const { landToken, owner, addr1, addr2, tree, values } = await loadFixture(deployLandTokenFixture);

    const ownerAddr = await owner.getAddress();
    const nftAddr = await landToken.getAddress(); // Use the deployed LandToken as the NFT for governance

    // Deploy the TimelockController contract
    const TimelockController = await ethers.getContractFactory("TimelockController");
    const minDelay = 1; // Min delay in seconds
    const proposers: string[] = [];
    const executors: string[] = [];
    const admin = ownerAddr;

    const timelock = await TimelockController.deploy(
      minDelay,
      proposers,
      executors,
      admin
    );
    //await timelock.deployed();

    const timelockAddr = await timelock.getAddress();

    // Deploy the ZDAO contract
    const zDAOFactory = await ethers.getContractFactory("ZDAO");
    const delay = 1;
    const votingPeriod = 5;
    const proposalThreshold = 0;
    const quorum = 0;
    const voteExtension = 2;

    const zDAO = await zDAOFactory.deploy(
      "ZDAO",
      nftAddr, // Using LandToken (which is an ERC721) as the IVotes token
      timelockAddr,
      delay,
      votingPeriod,
      proposalThreshold,
      quorum,
      voteExtension
    );
    //await zDAO.deployed();

    return { zDAO, landToken, timelock, owner, addr1, addr2, nftAddr, timelockAddr, tree, values };
  }
 
  describe("LandToken Factory and DAO Integration", function () {
    it("Should deploy the LandToken via the factory and allow token minting", async function () {
      const { landToken, addr1, tree, values } = await loadFixture(deployLandTokenFixture);

      const entry = values[0];
      const proof = tree.getProof([entry.address, entry.id]);
      const tokenId = parseInt(entry.id);

      // Issue the token and verify the owner
      await landToken.claim(proof, entry.address, tokenId);
      const actualOwner = await landToken.ownerOf(tokenId);
      expect(actualOwner.toLowerCase()).to.equal(entry.address.toLowerCase());
    });

    it("Should deploy the DAO and allow proposal submission using LandToken", async function () {
      const { zDAO, landToken, owner, addr1, tree, values } = await loadFixture(deployZDAOFixture);

      // Mint an additional LandToken to addr1 (for governance purposes)
      const entry = values[0];
      const proof = tree.getProof([entry.address, entry.id]);
      const tokenId = parseInt(entry.id);

      await landToken.claim(proof, entry.address, tokenId);
      // await landToken.connect(addr1).delegate(addr1);
      // Propose an ownership transfer
      const landTokenAddress = await landToken.getAddress()
      const targets = [landTokenAddress];
      const calldatas = [
        landToken.interface.encodeFunctionData("transferOwnership", [await addr1.getAddress()]),
      ];
      const description = "Transfer ownership";

      // Propose the transaction
      await zDAO.propose(targets, [0], calldatas, description);

      // Get proposal ID
      const proposalId = await zDAO.hashProposal(
        targets,
        [0],
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      // Mine blocks to move the proposal to Active
      await mineBlocks(2);

      // Vote on the proposal and execute it
      await zDAO.castVote(proposalId, 1); // Voting in favor
      await mineBlocks(10); // Move past the voting period

      const finalState = await zDAO.state(proposalId);
      expect(finalState).to.equal(3); // Proposal should be succeeded
    });
  });
});

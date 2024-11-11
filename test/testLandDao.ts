import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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

const provider = ethers.provider;
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
console.log(wallet);
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
    const contractURI = "";
    const baseURI = "";

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
    
    return { landToken, owner, ownerAddr, addr1, addr2, tree, values, landFactory };
  }

  async function deployZDAOFixture() {
    const { landToken, owner, ownerAddr, addr1, addr2, tree, values } = await loadFixture(deployLandTokenFixture);

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
    const proposalThreshold = 1;
    const quorum = 1;
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
    
    const zDAOaddr = await zDAO.getAddress();
    const prole = await timelock.PROPOSER_ROLE();
    const erole = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(prole, zDAOaddr)
    await timelock.grantRole(erole, ethers.ZeroAddress);
    return { zDAO, zDAOaddr, landToken, timelock, owner, addr1, addr2, nftAddr, timelockAddr, tree, values };
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

    it("Should deploy the DAO and allow proposal submission and execution using LandToken", async function () {
      const { zDAO, zDAOaddr, landToken, timelockAddr, owner, addr1, tree, values } = await loadFixture(deployZDAOFixture);
    
      // Mint an additional LandToken to addr1 (for governance purposes)
      const entry = values[0];
      const proof = tree.getProof([entry.address, entry.id]);
      const tokenId = parseInt(entry.id);
    
      const claimtx = await landToken.claim(proof, entry.address, tokenId);
      await claimtx.wait();
      console.log(await landToken.ownerOf(tokenId));

      console.log("land owner: ", await landToken.owner());
      console.log("owner: ", await owner.getAddress());
      console.log("addr1: ", await addr1.getAddress());

      await landToken.transferOwnership(timelockAddr);
      const walletAddr = await wallet.getAddress();

      const landTokenAddress = await landToken.getAddress();
      const targets = [landTokenAddress];
      const calldatas = [
        landToken.interface.encodeFunctionData("transferFrom", [timelockAddr, walletAddr, tokenId]),
      ];
      const description = "Transfer NFT";
    
      // Send some ETH to wallet for gas
      await addr1.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1.0"),
      });
    
      // Delegate votes
      const tx1 = await landToken.connect(wallet).delegate(await wallet.getAddress());
      await tx1.wait();
    
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log(`Latest block number: ${blockNumber}`);
    
      const votes = await landToken.connect(wallet).getVotes(wallet.address);
      console.log(`Voting power of ${wallet.address} at block ${blockNumber}: ${votes.toString()}`);
      
  
      // Propose the transaction
      await zDAO.connect(wallet).propose(targets, [0], calldatas, description);
    
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
      const vote = await zDAO.connect(wallet).castVote(proposalId, 1); // Voting in favor
      await vote.wait();
      await mineBlocks(5); // Move past the voting period
      
      const finalState = await zDAO.state(proposalId);
      expect(finalState).to.equal(4); // Proposal should be succeeded
      
      await landToken.connect(wallet).transferFrom(walletAddr, timelockAddr, tokenId);
      
      // Queue and execute the proposal
      const queueTx = await zDAO.connect(wallet).queue(targets, [0], calldatas, ethers.keccak256(new TextEncoder().encode(description)));
      await queueTx.wait();
    
      await mineBlocks(1); // Wait for the timelock delay if any
    
      const executeTx = await zDAO.connect(wallet).execute(targets, [0], calldatas, ethers.keccak256(new TextEncoder().encode(description)));
      await executeTx.wait();
    
      // Verify ownership transfer
      //const newOwner = await landToken.owner();
      //expect(newOwner).to.equal(await addr1.getAddress());
      const nftOwner = await landToken.ownerOf(tokenId);
      expect(nftOwner).to.equal(walletAddr);
    });
  });
});

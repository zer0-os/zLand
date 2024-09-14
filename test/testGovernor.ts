import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("LandGovernor", function () {
  async function deployLandGovernorFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const ownerAddr = await owner.getAddress();

    // Deploy the LandToken contract
    const LandToken = await ethers.getContractFactory("LandToken");
    const landToken = await LandToken.deploy(
      ownerAddr,
      100, // 100 basis points for royalties
      "LandToken",
      "LND",
      "ar://zApSefQk3L8xFO1_WVVuFsgAMKbYfjv_YZD87q9EcO0/landData/contract",
      "ar://3lALF2kZjTA2IEgItM2wwhln0_UBr3n-uUMQU89ZzO8/",
      ethers.ZeroHash // Placeholder root for now
    );

    // Deploy the TimelockController contract
    const TimelockController = await ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(
      1, // Min delay in seconds
      [ownerAddr], // Executors
      [ownerAddr]  // Proposers
    );

    // Deploy the LandGovernor contract
    const LandGovernor = await ethers.getContractFactory("LandGovernor");
    const landGovernor = await LandGovernor.deploy(landToken.target, timelock.target);

    return { landToken, landGovernor, timelock, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should deploy the governor with the correct settings", async function () {
      const { landGovernor, landToken } = await loadFixture(deployLandGovernorFixture);

      expect(await landGovernor.name()).to.equal("LandGovernor");
      expect(await landGovernor.votingDelay()).to.equal(1);
      expect(await landGovernor.votingPeriod()).to.equal(45818);
      const quorumAmount = (await landToken.getPastTotalSupply(0)) * 4 / 100;
      expect(await landGovernor.quorum(0)).to.equal(quorumAmount);
    });
  });

  describe("Proposals", function () {
    it("Should allow a token holder to propose and vote", async function () {
      const { landGovernor, landToken, addr1 } = await loadFixture(deployLandGovernorFixture);

      // Mint a token for addr1 so they can propose
      await landToken.issue([], addr1.target, 1);

      // Propose a simple transaction
      const targets = [landToken.target];
      const values = [0];
      const calldatas = [
        landToken.interface.encodeFunctionData("setBaseURI", ["ar://newBaseURI/"]),
      ];
      const description = "Change base URI";

      // Connect as addr1 to propose
      await landGovernor.connect(addr1).propose(targets, values, calldatas, description);

      // Get proposal ID
      const proposalId = await landGovernor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      const proposalState = await landGovernor.state(proposalId);
      expect(proposalState).to.equal(0); // Proposal state should be "Pending"

      // Cast a vote
      await landGovernor.connect(addr1).castVote(proposalId, 1); // 1 = for
      expect(await landGovernor.hasVoted(proposalId, addr1.target)).to.be.true;
    });

    it("Should execute a successful proposal", async function () {
      const { landGovernor, landToken, timelock, owner, addr1 } = await loadFixture(deployLandGovernorFixture);

      // Mint a token for addr1
      await landToken.issue([], addr1.target, 1);

      // Propose a change to the base URI
      const targets = [landToken.target];
      const values = [0];
      const calldatas = [
        landToken.interface.encodeFunctionData("setBaseURI", ["ar://newBaseURI/"]),
      ];
      const description = "Change base URI";

      await landGovernor.connect(addr1).propose(targets, values, calldatas, description);

      const proposalId = await landGovernor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      // Vote on the proposal
      await landGovernor.connect(addr1).castVote(proposalId, 1);

      // Fast forward past the voting period
      await ethers.provider.send("evm_increaseTime", [45818 * 13]); // assuming 13s per block
      await ethers.provider.send("evm_mine");

      // Queue the proposal in the timelock
      await landGovernor.connect(owner).queue(
        targets,
        values,
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      // Execute the proposal
      await landGovernor.connect(owner).execute(
        targets,
        values,
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      expect(await landToken.baseURI()).to.equal("ar://newBaseURI/");
    });

    it("Should revert when trying to execute a failed proposal", async function () {
      const { landGovernor, landToken, addr1, addr2 } = await loadFixture(deployLandGovernorFixture);

      // Mint a token for addr1 and addr2
      await landToken.issue([], addr1.target, 1);
      await landToken.issue([], addr2.target, 2);

      // Propose a change to the base URI
      const targets = [landToken.target];
      const values = [0];
      const calldatas = [
        landToken.interface.encodeFunctionData("setBaseURI", ["ar://newBaseURI/"]),
      ];
      const description = "Change base URI";

      await landGovernor.connect(addr1).propose(targets, values, calldatas, description);

      const proposalId = await landGovernor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.keccak256(new TextEncoder().encode(description))
      );

      // Vote against the proposal
      await landGovernor.connect(addr2).castVote(proposalId, 0);

      // Fast forward past the voting period
      await ethers.provider.send("evm_increaseTime", [45818 * 13]);
      await ethers.provider.send("evm_mine");

      // Attempt to queue the proposal
      await expect(
        landGovernor.connect(addr1).queue(
          targets,
          values,
          calldatas,
          ethers.keccak256(new TextEncoder().encode(description))
        )
      ).to.be.revertedWith("Governor: proposal not successful");
    });
  });
});

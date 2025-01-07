import { ethers } from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import * as fs from "fs";

describe('Resource Contract (Merkle-based)', function () {
  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();

    // -------------------------------------------------------
    // 1. Load values from JSON for LandToken minting
    // -------------------------------------------------------
    const values = JSON.parse(fs.readFileSync("values.json", "utf8"));
    const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);
    const factoryTree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
    const factoryRoot = factoryTree.root;

    // -------------------------------------------------------
    // 2. Deploy the LandFactory and create a LandToken
    // -------------------------------------------------------
    const LandFactory = await ethers.getContractFactory("LandFactory");
    const landFactory = await LandFactory.deploy();
    await landFactory.waitForDeployment();

    const contractURI = "";
    const baseURI = "";
    const createTx = await landFactory.createLandToken(
      ownerAddress,
      100, // 100 basis points for royalties
      "LandToken",
      "LAND",
      contractURI,
      baseURI,
      "1",
      factoryRoot
    );
    await createTx.wait();

    // The deployed LandToken
    const landTokenAddress = await landFactory.tokens(0);
    const landToken = await ethers.getContractAt("LandToken", landTokenAddress);

    // -------------------------------------------------------
    // 3. Deploy ResourceToken (an ERC20 mock for awarding)
    // -------------------------------------------------------
    const ResourceToken = await ethers.getContractFactory('ERC20Mock');
    const resourceToken = await ResourceToken.deploy('ResourceToken', 'RES');
    await resourceToken.waitForDeployment();
    const resourceTokenAddress = await resourceToken.getAddress();

    // -------------------------------------------------------
    // 4. Deploy MiningRig
    // -------------------------------------------------------
    const royaltyReceiver = ownerAddress;
    const royaltyFeeNumerator = "5";
    const tokenName = "Mining Rig";
    const tokenSymbol = "MINER";
    const minerContractURI = "";
    const minerBaseURI = "";
    const version = "1";
    const minerRoot = factoryRoot;

    const MiningRig = await ethers.getContractFactory('MiningRig');
    const miningRig = await MiningRig.deploy(
      royaltyReceiver,
      royaltyFeeNumerator,
      tokenName,
      tokenSymbol,
      minerContractURI,
      minerBaseURI,
      version,
      minerRoot
    );
    await miningRig.waitForDeployment();

    // -------------------------------------------------------
    // 5. Build a Merkle tree for (landTokenId, totalAmount) ONLY
    //    We'll assume landTokenId=1, totalAmount=999999
    // -------------------------------------------------------
    const landTokenId = 1;
    const totalAmount = 999999; // Max user can mine

    // Each leaf is now just [landTokenId, totalAmount]
    const singleEntryValues = [
      [landTokenId.toString(), totalAmount.toString()]
    ];

    // Create the Merkle tree with 2 fields: landTokenId, totalAmount
    const singleMerkleTree = StandardMerkleTree.of(
      singleEntryValues,
      ["uint256", "uint256"]
    );
    const merkleRoot = singleMerkleTree.root;
    const proof = singleMerkleTree.getProof(singleEntryValues[0]);

    // -------------------------------------------------------
    // 6. Deploy the Resource contract
    //    constructor(IERC721 landToken, MiningRig miningRig, bytes32 merkleRoot)
    // -------------------------------------------------------
    const Resource = await ethers.getContractFactory('Resource');
    const resource = await Resource.deploy(
      landTokenAddress,
      await miningRig.getAddress(),
      merkleRoot
    );
    await resource.waitForDeployment();

    // -------------------------------------------------------
    // 7. Claim a LandToken for user1 so they can mine landTokenId=1
    // -------------------------------------------------------
    const entry = values[1]; // The second entry from values.json
    const proofForLand = factoryTree.getProof([entry.address, entry.id]);
    const mintedTokenId = parseInt(entry.id);

    // user1 claims mintedTokenId from LandToken
    await landToken.claim(proofForLand, await user1.getAddress(), mintedTokenId);

    // user1 also claims rig with the same mintedTokenId from MiningRig
    await miningRig.claim(proofForLand, await user1.getAddress(), mintedTokenId);

    // -------------------------------------------------------
    // 8. Fund the Resource contract with a large amount of resource tokens
    // -------------------------------------------------------
    await resourceToken.transfer(await resource.getAddress(), 123456780);

    return {
      owner,
      user1,
      user2,
      landToken,
      resourceToken,
      miningRig,
      resource,
      // new merkle data
      landTokenId,
      resourceTokenAddress,
      totalAmount,
      proof
    };
  }

  // ---------------------------------------------------------------------------
  // TESTS
  // ---------------------------------------------------------------------------

  describe('startMining', function () {
    it('Should allow the owner of the rig to start mining', async function () {
      const {
        user1, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // rigTokenId=1, landTokenId=1, resourceToken=?, totalAmount=?, proof=...
      // NOTE: Even though we pass resourceTokenAddress here, the on-chain Merkle check 
      // will only be verifying (landTokenId, totalAmount).
      await resourceUser1.startMining(
        1,
        landTokenId,
        resourceTokenAddress,
        totalAmount,
        proof
      );

      const rpb = await resource.resources_per_block(1);
      expect(rpb).to.be.gt(0);
    });

    it('Should not allow non-owners to start mining', async function () {
      const {
        user1, user2, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser2 = resource.connect(user2);

      // user2 tries on rigTokenId=1, which user1 owns
      await expect(
        resourceUser2.startMining(
          1,
          landTokenId,
          resourceTokenAddress,
          totalAmount,
          proof
        )
      ).to.be.revertedWith('Not rig owner');
    });

    it('Should not allow starting if rig is already mining', async function () {
      const {
        user1, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start once
      await resourceUser1.startMining(
        1,
        landTokenId,
        resourceTokenAddress,
        totalAmount,
        proof
      );
      // Try again
      await expect(
        resourceUser1.startMining(
          1,
          landTokenId,
          resourceTokenAddress,
          totalAmount,
          proof
        )
      ).to.be.revertedWith('Already mining');
    });
  });

  describe('stopMining', function () {
    it('Should allow the owner to stop mining', async function () {
      const {
        user1, resource, resourceToken,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const user1Address = await user1.getAddress();

      // Start
      await resourceUser1.startMining(1, landTokenId, resourceTokenAddress, totalAmount, proof);

      // Simulate mining by advancing blocks
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      const before = await resourceToken.balanceOf(user1Address);
      await resourceUser1.stopMining(1);
      const after = await resourceToken.balanceOf(user1Address);

      expect(after).to.be.gt(before);
    });

    it('Should not allow non-owners to stop mining', async function () {
      const {
        user1, user2, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const resourceUser2 = resource.connect(user2);

      // Start as user1
      await resourceUser1.startMining(1, landTokenId, resourceTokenAddress, totalAmount, proof);

      // user2 tries
      await expect(resourceUser2.stopMining(1))
        .to.be.revertedWith('Not rig owner');
    });

    it('Should not allow stopping if rig is not mining', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);
      const resourceUser1 = resource.connect(user1);

      await expect(resourceUser1.stopMining(1))
        .to.be.revertedWith('Not mining');
    });
  });

  describe('claimMinedResources', function () {
    it('Should allow the owner to claim mined resources', async function () {
      const {
        user1, resource, resourceToken,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const user1Address = await user1.getAddress();

      // Start
      await resourceUser1.startMining(1, landTokenId, resourceTokenAddress, totalAmount, proof);

      // Advance some blocks
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      const before = await resourceToken.balanceOf(user1Address);
      await resourceUser1.claimMinedResources(1);
      const after = await resourceToken.balanceOf(user1Address);

      expect(after).to.be.gt(before);
    });

    it('Should not allow non-owners to claim mined resources', async function () {
      const {
        user1, user2, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const resourceUser2 = resource.connect(user2);

      // Start as user1
      await resourceUser1.startMining(1, landTokenId, resourceTokenAddress, totalAmount, proof);

      // Mine some blocks
      for (let i = 0; i < 2; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      // user2 tries
      await expect(resourceUser2.claimMinedResources(1))
        .to.be.revertedWith('Not rig owner');
    });
  });

  describe('resources_mined', function () {
    it('Should correctly calculate mined resources', async function () {
      const {
        user1, resource,
        landTokenId, resourceTokenAddress, totalAmount, proof
      } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start
      await resourceUser1.startMining(1, landTokenId, resourceTokenAddress, totalAmount, proof);

      // Immediately
      let mined = await resourceUser1.resources_mined(1);
      expect(mined).to.equal(0);

      // Advance blocks
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      mined = await resourceUser1.resources_mined(1);
      expect(mined).to.be.gt(0);

      const rpb = await resource.resources_per_block(1);
      const lastClaim = await resource.last_claim(1);
      const currentBlock = BigInt(await ethers.provider.getBlockNumber());
      const expected = rpb * (currentBlock - lastClaim);

      expect(BigInt(mined)).to.equal(expected);
    });
  });
});

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import * as fs from "fs";

describe('Resource Contract', function () {
  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();

    // Load values from the JSON file for LandToken minting
    const values = JSON.parse(fs.readFileSync("values.json", "utf8"));
    const treeValues = values.map((value: { address: string; id: string }) => [value.address, value.id]);
    const tree = StandardMerkleTree.of(treeValues, ["address", "uint256"]);
    const root = tree.root;

    // Deploy the LandFactory contract
    const LandFactory = await ethers.getContractFactory("LandFactory");
    const landFactory = await LandFactory.deploy();
    await landFactory.waitForDeployment();

    // Create LandToken via the factory
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
      root
    );
    await createTx.wait();

    // Fetch the deployed LandToken address from the factory's tokens array
    const landTokenAddress = await landFactory.tokens(0);
    const landToken = await ethers.getContractAt("LandToken", landTokenAddress);

    // Deploy ResourceToken (ERC20Mock)
    const ResourceToken = await ethers.getContractFactory('ERC20Mock');
    const resourceToken = await ResourceToken.deploy(
      'ResourceToken',
      'RES'
    );
    await resourceToken.waitForDeployment();
    const resourceTokenAddress = await resourceToken.getAddress();

    // Deploy MiningRigMock
    const royaltyReceiver = ownerAddress;
    const royaltyFeeNumerator = "5";
    const tokenName = "Mining Rig";
    const tokenSymbol = "MINR";
    const minerContractURI = "";
    const minerBaseURI = "";
    const version = "1";
    const minerRoot = root;

    const MiningRig = await ethers.getContractFactory('MiningRig');
    const miningRig = await MiningRig.deploy(royaltyReceiver, royaltyFeeNumerator, tokenName, tokenSymbol, minerContractURI, minerBaseURI, version, minerRoot);
    await miningRig.waitForDeployment();
    const miningRigAddress = await miningRig.getAddress();

    // Deploy the Resource contract (no longer needs resourceToken in the constructor)
    const Resource = await ethers.getContractFactory('Resource');
    const resource = await Resource.deploy(
      landTokenAddress,
      miningRigAddress
    );
    await resource.waitForDeployment();

    // Add a resource range that covers all possible depths (adjust if needed)
    await resource.addResource(resourceTokenAddress, 0, 999999);

    // Claim a LandToken for user1 to have something to mine on
    const entry = values[1]; // Take the first entry from values.json
    const proof = tree.getProof([entry.address, entry.id]);
    const tokenId = parseInt(entry.id);

    await landToken.claim(proof, await user1.getAddress(), tokenId);
    await miningRig.claim(proof, await user1.getAddress(), tokenId);

    // Fund the Resource contract with a large amount of resource tokens
    await resourceToken.transfer(await resource.getAddress(), 123456780);

    return { owner, user1, user2, landToken, resourceToken, miningRig, resource };
  }

  describe('startMining', function () {
    it('Should allow the owner of the rig to start mining', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start mining with rigTokenId 1 on the user's owned LandToken ID (from values.json)
      await resourceUser1.startMining(1, 1);

      // Verify that resources_per_block is set
      const resourcesPerBlock = await resource.resources_per_block(1);
      expect(resourcesPerBlock).to.be.gt(0);
    });

    it('Should not allow non-owners to start mining', async function () {
      const { user1, user2, resource } = await loadFixture(deployContractsFixture);

      const resourceUser2 = resource.connect(user2);

      // Attempt to start mining with rigTokenId 1 (owned by user1) as user2
      await expect(resourceUser2.startMining(1, 1))
        .to.be.revertedWith('Not owner of the mining rig');
    });

    it('Should not allow starting mining if rig is already mining', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start mining with rigTokenId 1 on landTokenId 1
      await resourceUser1.startMining(1, 1);

      // Attempt to start mining again with the same rig
      await expect(resourceUser1.startMining(1, 1))
        .to.be.revertedWith('Rig is already mining');
    });
  });

  describe('stopMining', function () {
    it('Should allow the owner to stop mining', async function () {
      const { user1, resource, resourceToken } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const user1Address = await user1.getAddress();

      // Start mining
      await resourceUser1.startMining(1, 1);

      // Advance blocks to simulate mining
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      // Get initial balance
      const initialBalance = await resourceToken.balanceOf(user1Address);

      // Stop mining
      await resourceUser1.stopMining(1);

      // Check that resources have been transferred to user1
      const finalBalance = await resourceToken.balanceOf(user1Address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it('Should not allow non-owners to stop mining', async function () {
      const { user1, user2, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const resourceUser2 = resource.connect(user2);

      // Start mining as user1
      await resourceUser1.startMining(1, 1);

      // Attempt to stop mining as user2
      await expect(resourceUser2.stopMining(1))
        .to.be.revertedWith('Not owner of the mining rig');
    });

    it('Should not allow stopping if rig is not mining', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Attempt to stop mining without starting
      await expect(resourceUser1.stopMining(1))
        .to.be.revertedWith('Rig is not mining');
    });
  });

  describe('claimMinedResources', function () {
    it('Should allow the owner to claim mined resources', async function () {
      const { user1, resource, resourceToken } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const user1Address = await user1.getAddress();

      // Start mining
      await resourceUser1.startMining(1, 1);

      // Advance blocks to simulate mining
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      // Get initial balance
      const initialBalance = await resourceToken.balanceOf(user1Address);

      // Claim mined resources
      await resourceUser1.claimMinedResources(1);

      // Check that resources have been transferred to user1
      const finalBalance = await resourceToken.balanceOf(user1Address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it('Should not allow non-owners to claim mined resources', async function () {
      const { user1, user2, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);
      const resourceUser2 = resource.connect(user2);

      // Start mining as user1
      await resourceUser1.startMining(1, 1);

      // Advance blocks
      for (let i = 0; i < 2; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      // Attempt to claim mined resources as user2
      await expect(resourceUser2.claimMinedResources(1))
        .to.be.revertedWith('Not owner of the mining rig');
    });
  });

  describe('resources_mined', function () {
    it('Should correctly calculate mined resources', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start mining
      await resourceUser1.startMining(1, 1);

      // Get resources mined immediately
      let minedResources = await resourceUser1.resources_mined(1);
      expect(minedResources).to.equal(0);

      // Advance blocks
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send('evm_mine', []);
      }

      // Get resources mined after 3 blocks
      minedResources = await resourceUser1.resources_mined(1);
      expect(minedResources).to.be.gt(0);

      // Get resources per block
      const resourcesPerBlock = await resource.resources_per_block(1);

      // Get last claim block
      const lastClaim = await resource.last_claim(1);

      const currentBlock = BigInt(await ethers.provider.getBlockNumber());

      // Calculate expected mined resources
      const expectedMinedResources = resourcesPerBlock * (currentBlock - lastClaim);

      expect(minedResources).to.equal(expectedMinedResources);
    });
  });
});

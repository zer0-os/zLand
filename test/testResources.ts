import { ethers } from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Resource Contract', function () {
  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Get addresses using the new syntax
    const ownerAddress = await owner.getAddress();
    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();

    // Deploy mock LandToken contract
    const LandToken = await ethers.getContractFactory('ERC721Mock');
    const landToken = await LandToken.deploy('LandToken', 'LAND');
 

    // Deploy mock ResourceToken contract
    const ResourceToken = await ethers.getContractFactory('ERC20Mock');
    const resourceToken = await ResourceToken.deploy(
      'ResourceToken',
      'RES',
      ownerAddress,
      ethers.parseEther('1000000')
    );

    // Deploy mock MiningRig contract
    const MiningRig = await ethers.getContractFactory('MiningRigMock');
    const miningRig = await MiningRig.deploy();

    // Deploy the Resource contract
    const Resource = await ethers.getContractFactory('Resource');
    const resource = await Resource.deploy(
      landToken.address,
      resourceToken.address,
      miningRig.address
    );

    // Mint LandTokens to user1
    //await landToken.mint(user1Address, 1);
    //await landToken.mint(user1Address, 2);

    // Mint MiningRig tokens to user1
    //await miningRig.mint(user1Address, 1);
    //await miningRig.mint(user1Address, 2);

    // Set attributes for the mining rigs
    //await miningRig.setRigAttributes(1, 100, 100, 100, 100); // speed, efficiency, depth, health
    //await miningRig.setRigAttributes(2, 200, 200, 200, 200);

    return { owner, user1, user2, landToken, resourceToken, miningRig, resource };
  }

  describe('startMining', function () {
    it('Should allow the owner to start mining', async function () {
      const { user1, resource } = await loadFixture(deployContractsFixture);

      const resourceUser1 = resource.connect(user1);

      // Start mining with rigTokenId 1 on landTokenId 1
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
      await expect(resourceUser1.startMining(1, 2))
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
      const expectedMinedResources = resourcesPerBlock*(currentBlock - lastClaim);

      expect(minedResources).to.equal(expectedMinedResources);
    });
  });
});

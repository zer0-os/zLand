import { ethers } from "hardhat";
import { expect } from "chai";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe.only("WilderPacks Weekly Sale", function () {
  let trinityTree: StandardMerkleTree<any>;
  let idToSaleTree: StandardMerkleTree<any>;

  let trinityRoot: string;
  let idToSaleRoot: string;

  let deployer: any;
  let user1: any;
  let user2: any;

  let reward1: any;
  let reward2: any;
  let reward3: any;
  let wilderPacks: any;

  let startTime: number;

  before(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    // ----------------------------------------------------------------
    // 1. Build sample Merkle trees
    // ----------------------------------------------------------------

    // Trinity holder addresses
    const trinityData = [
      [await user1.getAddress()], // user1 is a Trinity holder
    ];
    trinityTree = StandardMerkleTree.of(trinityData, ["address"]);
    trinityRoot = trinityTree.root;

    // ID->saleNumber pairs
    const idToSaleData = [
      [1, 1],
      [2, 1],
      [3, 1],
      [301, 2],
      [302, 2],
      [303, 2],
    ];
    idToSaleTree = StandardMerkleTree.of(idToSaleData, ["uint256", "uint256"]);
    idToSaleRoot = idToSaleTree.root;
  });

  beforeEach(async () => {
    // ----------------------------------------------------------------
    // 2. Deploy Reward NFTs (using your ERC721Mock)
    // ----------------------------------------------------------------
    const deployerAddress = await deployer.getAddress();
    const Reward = await ethers.getContractFactory("ERC721Mock");
    reward1 = await Reward.connect(deployer).deploy(deployerAddress, "NFT 1", "NFT1");
    reward2 = await Reward.connect(deployer).deploy(deployerAddress, "NFT 2", "NFT2");
    reward3 = await Reward.connect(deployer).deploy(deployerAddress, "NFT 3", "NFT3");

    // ----------------------------------------------------------------
    // 3. Deploy WilderPacks
    // ----------------------------------------------------------------
    // IMPORTANT: Make sure inside your WilderPacks.sol you do single-hash leaves
    // and you can disable randomness by returning ID=1 in _getRandomPackId().
    startTime = (await time.latest()) + 10; // start in 10s

    const WilderPacks = await ethers.getContractFactory("WilderPacks");
    wilderPacks = await WilderPacks.connect(deployer).deploy(
      deployer.address,  // contract owner
      trinityRoot,
      idToSaleRoot,
      deployer.address,  // royalty receiver
      1000,              // royaltyFeeNumerator (10%)
      await reward1.getAddress(),
      await reward2.getAddress(),
      await reward3.getAddress(),
      startTime
    );

    // ----------------------------------------------------------------
    // 4. Transfer ownership of reward NFTs => wilderPacks
    // ----------------------------------------------------------------
    const wpAddress = await wilderPacks.getAddress();
    await reward1.connect(deployer).transferOwnership(wpAddress);
    await reward2.connect(deployer).transferOwnership(wpAddress);
    await reward3.connect(deployer).transferOwnership(wpAddress);
  });

  it("should not allow buying before startTime", async () => {
    await expect(
      wilderPacks.connect(user1).buyPack([], 1, [], 1)
    ).to.be.revertedWith("Sale number mismatch");
  });

  it("allows Trinity holder to buy in presale window", async () => {
    // move time to just after startTime
    await time.increaseTo(startTime + 1);

    // Prepare Trinity proof for user1
    let proof: string[] = [];
    for (const [i, leaf] of trinityTree.entries()) {
      if (leaf[0] === (await user1.getAddress())) {
        proof = trinityTree.getProof(i);
        break;
      }
    }

    // We also need an ID->saleNumber proof for (1 => sale=1).
    let idProof: string[] = [];
    for (const [i, leaf] of idToSaleTree.entries()) {
      if (leaf[0] === 1 && leaf[1] === 1) {
        idProof = idToSaleTree.getProof(i);
        break;
      }
    }

    // user1 buys 2 reward items
    await expect(
      wilderPacks.connect(user1).buyPack(proof, 2, idProof, 1)
    ).to.emit(wilderPacks, "PackPurchased");

    // Check user1 got a Pack NFT
    expect(await wilderPacks.balanceOf(await user1.getAddress())).to.eq(1);
  });

  it("reverts if non-trinity tries to buy in presale window", async () => {
    await time.increaseTo(startTime + 2);

    // user2 is not in the Trinity root => proof is empty
    let emptyProof: string[] = [];

    // ID->saleNumber proof for (2 => 1) just to test
    let idProof: string[] = [];
    for (const [i, leaf] of idToSaleTree.entries()) {
      if (leaf[0] === 2 && leaf[1] === 1) {
        idProof = idToSaleTree.getProof(i);
        break;
      }
    }

    await expect(
      wilderPacks.connect(user2).buyPack(emptyProof, 1, idProof, 1)
    ).to.be.revertedWith("Not in Trinity set");
  });

  it("allows non-trinity after presale window (day 1 passed)", async () => {
    // Move time to startTime + 1 day + 1 second
    await time.increaseTo(startTime + 86401);

    // sale #1 is still active but presale ended
    let emptyProof: string[] = [];

    // ID->saleNumber proof for (3 => sale=1)
    let idProof: string[] = [];
    for (const [i, leaf] of idToSaleTree.entries()) {
      if (leaf[0] === 3 && leaf[1] === 1) {
        idProof = idToSaleTree.getProof(i);
        break;
      }
    }

    await expect(
      wilderPacks.connect(user2).buyPack(emptyProof, 3, idProof, 1)
    ).to.emit(wilderPacks, "PackPurchased");

    expect(await wilderPacks.balanceOf(await user2.getAddress())).to.eq(1);
  });

  it("after 7 days from start, moves to sale #2", async () => {
    // Move time to startTime + 7 days => sale #2
    await time.increaseTo(startTime + 7 * 24 * 3600 + 10);

    const currentSale = await wilderPacks.getCurrentSaleNumber();
    expect(currentSale).to.eq(2);

    // We'll pick ID=301 => sale=2
    let sale2Proof: string[] = [];
    for (const [i, leaf] of idToSaleTree.entries()) {
      if (leaf[0] === 301 && leaf[1] === 2) {
        sale2Proof = idToSaleTree.getProof(i);
        break;
      }
    }

    // For the first day of sale #2, presale => only Trinity can buy => user2 is not Trinity => revert
    let emptyProof: string[] = [];
    await expect(
      wilderPacks.connect(user2).buyPack(emptyProof, 1, sale2Proof, 2)
    ).to.be.revertedWith("Not in Trinity set");

    // Move 1 more day => presale for sale#2 has ended
    await time.increase(86400 + 10);

    // Now user2 can buy
    await expect(
      wilderPacks.connect(user2).buyPack(emptyProof, 1, sale2Proof, 2)
    ).to.emit(wilderPacks, "PackPurchased");
  });

  it("owner can set new Trinity root", async () => {
    // Must use full 32-byte hex
    const thirtyTwoBytes = "0x0000000000000000000000000000000000000000000000000000000000001234";
    await expect(
      wilderPacks.connect(user1).setTrinityRoot(thirtyTwoBytes)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await wilderPacks.connect(deployer).setTrinityRoot(thirtyTwoBytes);
    expect(await wilderPacks.trinityRoot()).to.eq(thirtyTwoBytes);
  });

  it("owner can set new ID->sale root", async () => {
    const thirtyTwoBytes = "0x000000000000000000000000000000000000000000000000000000000000abcd";
    await wilderPacks.connect(deployer).setIDToSaleRoot(thirtyTwoBytes);
    expect(await wilderPacks.idToSaleRoot()).to.eq(thirtyTwoBytes);
  });

  it("owner can set default royalty", async () => {
    await wilderPacks.connect(deployer).setDefaultRoyalty(await user1.getAddress(), 500);
    // just confirm it doesn't revert
  });
});

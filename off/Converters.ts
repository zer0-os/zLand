import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Converters", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployRefinery() {
    const [owner, user] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();

    const Refinery = await hre.ethers.getContractFactory("Refinery");
    const refinery = await Refinery.deploy("baseuri.com");
    const refineryAddress = await refinery.getAddress();

    const Material = await hre.ethers.getContractFactory("ERC20Token");
    const material1 = await Material.deploy("Coal", "COAL");
    const material2 = await Material.deploy("Gold", "GOLD");
    const materials = [material1, material2];

    const mintAmt1 = hre.ethers.parseEther("1000");
    const mintAmt2 = hre.ethers.parseEther("200");

    await material1.mint(userAddress, mintAmt1);
    await material2.mint(userAddress, mintAmt2);
    
    await material1.connect(user).approve(refineryAddress, mintAmt1);
    await material2.connect(user).approve(refineryAddress, mintAmt2);

    return { refinery, materials, owner, user };
  }

  async function deployFabricator() {
    const [owner, user] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();

    const Fabricator = await hre.ethers.getContractFactory("Fabricator");
    const fabricator = await Fabricator.deploy("Build", "BLD");
    const fabricatorAddress = await fabricator.getAddress();

    const Material = await hre.ethers.getContractFactory("ERC20Token");
    const material1 = await Material.deploy("Coal", "COAL");
    const material2 = await Material.deploy("Gold", "GOLD");
    const materials = [material1, material2];

    const mintAmt1 = hre.ethers.parseEther("1000");
    const mintAmt2 = hre.ethers.parseEther("200");

    await material1.mint(userAddress, mintAmt1);
    await material2.mint(userAddress, mintAmt2);
    
    await material1.connect(user).approve(fabricatorAddress, mintAmt1);
    await material2.connect(user).approve(fabricatorAddress, mintAmt2);

    return { fabricator, materials, owner, user };
  }

  describe("Deploys", function () {
    it("Deploys refinery", async function () {
      const { refinery, owner } = await loadFixture(deployRefinery);

      expect(await refinery.owner()).to.equal(owner.address);
    });
    it("Deploys fabricator", async function () {
      const { fabricator, owner } = await loadFixture(deployFabricator);

      expect(await fabricator.owner()).to.equal(owner.address);
    });
  });

  describe("Blueprints", function () {

    const requiredAmounts = [60, 10]
    const fee = hre.ethers.parseEther("1");
    const blueprintID = "2424";

    it("Adds new blueprint", async function () {
      const { refinery, materials } = await loadFixture(deployRefinery);
  
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      const blueprint = await refinery.getBlueprint(blueprintID);
      expect(blueprint.uri).to.equal("uri.com");
      expect(blueprint.tokens.length).to.equal(materials.length);
      expect(blueprint.amountsRequired[0]).to.equal(requiredAmounts[0]);
      expect(blueprint.amountsRequired[1]).to.equal(requiredAmounts[1]);
      expect(blueprint.fee).to.equal(fee);
    });

    it("Gets blueprint", async function () {
      const { refinery, materials } = await loadFixture(deployRefinery);

      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      const blueprint = await refinery.getBlueprint(blueprintID);
      expect(blueprint.uri).to.equal("uri.com");
      expect(blueprint.tokens.length).to.equal(materials.length);
      expect(blueprint.amountsRequired[0]).to.equal(requiredAmounts[0]);
      expect(blueprint.amountsRequired[1]).to.equal(requiredAmounts[1]);
      expect(blueprint.fee).to.equal(fee);
    });

    it("Fulfills blueprint", async function () {
      const { refinery, materials , user} = await loadFixture(deployRefinery);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await expect(refinery.connect(user).fulfill(blueprintID, 1, "0x00", {value: fee}))
        .to.changeTokenBalances(materials[0], [user, refinery], [-requiredAmounts[0], requiredAmounts[0]]);
      expect(await refinery.balanceOf(user.address, blueprintID)).to.equal(1);
    });

    it("Collects fees", async function () {
      const { refinery, materials, owner, user } = await loadFixture(deployRefinery);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await refinery.connect(user).fulfill(blueprintID, 1, "0x00", {value: fee});
      const initialOwnerBalance = await hre.ethers.provider.getBalance(owner.address);
      await expect(refinery.connect(owner).collectFees())
        .to.changeEtherBalances([refinery, owner], [-fee, fee]);
      const finalOwnerBalance = await hre.ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.be.above(initialOwnerBalance);
    });
  });
  describe("Fail paths", function () {
    const requiredAmounts = [60, 10]
    const fee = hre.ethers.parseEther("1");
    const blueprintID = "1";

    it("Wont add blueprint with no ID", async function () {
      const { refinery, materials } = await loadFixture(deployRefinery);
      const badID = "0";
      await expect(refinery.addBlueprint(badID, "uri.com", materials, requiredAmounts, fee)).to.be.revertedWith("No ID");
    });
    it("Wont add blueprint with existing ID", async function () {
      const { refinery, materials } = await loadFixture(deployRefinery);

      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      await expect(refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee)).to.be.revertedWith("ID taken");
    });
    it("Wont add blueprint with no materials", async function () {
      const { refinery } = await loadFixture(deployRefinery);
      
      await expect(refinery.addBlueprint(blueprintID, "uri.com", [], requiredAmounts, fee)).to.be.revertedWith("No tokens");
    });
    it("Wont add blueprint with materials and required amount mismatch", async function () {
      const { refinery, materials } = await loadFixture(deployRefinery);
      
      await expect(refinery.addBlueprint(blueprintID, "uri.com", materials, [requiredAmounts[0]], fee)).to.be.revertedWith("Tokens length mismatch");
    });
    it("Wont fulfill blueprint with invalid fee paid", async function () {
      const { refinery, materials , user} = await loadFixture(deployRefinery);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await expect(refinery.connect(user).fulfill(blueprintID, 1, "0x00", {value: "99"}))
        .to.be.revertedWith("Invalid fee paid");
    });
    it("Wont fulfill nonexistent blueprint", async function () {
      const { refinery, materials , user} = await loadFixture(deployRefinery);
      
      await refinery.addBlueprint(blueprintID, "uri.com", materials, requiredAmounts, fee);
      
      await expect(refinery.connect(user).fulfill("9999999999", 1, "0x00", {value: "99"}))
        .to.be.revertedWith("ID doesnt exist");
    });
  });
});

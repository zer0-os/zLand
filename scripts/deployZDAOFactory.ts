// deploy.ts

import { ethers, run } from "hardhat";

async function main() {
  //Get the ZDAOFactory contract factory
  //const ZDAOFactory = await ethers.getContractFactory("ZDAOFactory");

  /* Deploy the ZDAOFactory contract
  const zdaoFactory = await ZDAOFactory.deploy();
  const zdaoFacAddr = await zdaoFactory.getAddress();
  console.log(`ZDAOFactory deployed to: ${zdaoFacAddr}`);

  // Wait for the deployment transaction to be mined and a few confirmations
  /*await zdaoFactory.deploymentTransaction()?.wait(5); // Wait for 5 confirmations

  // Verify the ZDAOFactory contract on Etherscan
  await run("verify:verify", {
    address: await zdaoFactory.getAddress(),
    constructorArguments: [],
  });
*/

  const ZDAOFactory = await ethers.getContractAt("ZDAOFactory","0xeA86bCf76A0Ca2038B552E1974716986fc7722c6");
  //const ZDAOFactory = await ethers.getContractAt("ZDAOFactory","0xe506661A0276606926D048ccF7c3844bAE9902a6"); //zchain

  //const zdaoFacAddress = await ZDAOFactory.zDAOs(0);
  //console.log(zdaoFacAddress);
  //0xcC0cbAc4828D0402d7fD6dEE953E055052755a3E
  // Example parameters for creating a new ZDAO instance
  const governorName = "Wiami DAO";
  const tokenAddress = "0xd396ca541F501f5D303166C509e2045848df356b"; // replace with actual token address
  const timelockAddress = "0x2105694E890678D3eB9340CfFB5eD43b0fA6474b"; // replace with actual timelock address
  //zchain values
  //const tokenAddress = "0x4e86f358d3Ab0AB5734D4f90Ae4c1fBa57d4E4b0"; //zchain
  //const timelockAddress = "0xc01D72ac53dC1d3CEE4A47a02dC99A5D65932B04"; //zchain
  const votingDelay = 50; // in blocks
  const votingPeriod = 60000; // in blocks, example for ~1 day on Ethereum
  const proposalThreshold = 1; // minimum tokens to propose
  const quorumPercentage = 5; // 5% quorum
  const voteExtension = 6000; // example extension period

  /* Call createZDAO to deploy a new ZDAO instance through the factory
  const tx = await ZDAOFactory.createZDAO(
    governorName,
    tokenAddress,
    timelockAddress,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercentage,
    voteExtension
  );*/

  // Wait for transaction to complete
  //const receipt = await tx.wait();
  //console.log(receipt);
  
  const zdaoAddress = "0x7B821BE72DE68A83BE280641620B8E9D36379C71";//await ZDAOFactory.zDAOs(1);
  //0x97d0dC52a8F30b39FBB2b3d3FD454164811ea293 zchain deploy
  const zdao = await ethers.getContractAt("ZDAO",zdaoAddress);

  console.log(zdaoAddress);

  // Wait for Etherscan to index the new ZDAO contract
  console.log("Waiting for Etherscan to index the ZDAO contract...");
  //await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 60 seconds

  // Verify the ZDAO contract on Etherscan
  await run("verify:verify", {
    address: zdaoAddress,
    constructorArguments: [
      governorName,
      tokenAddress,
      timelockAddress,
      votingDelay,
      votingPeriod,
      proposalThreshold,
      quorumPercentage,
      voteExtension,
    ],
    force: true,
    contract: "contracts/dao/ZDAO.sol:ZDAO", // Update the path and contract name as necessary
  });

  console.log("ZDAO verified on Etherscan.");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in deployment script:", error);
    process.exit(1);
  });

import { ethers } from "hardhat";

async function main() {
  const ZDAOFactory = await ethers.getContractAt(
    "ZDAOFactory",
    "0xeA86bCf76A0Ca2038B552E1974716986fc7722c6"
  );

  const zdaoAddress = "0x7B821BE72DE68A83BE280641620B8E9D36379C71"; // Replace with actual ZDAO address if known
  const zdao = await ethers.getContractAt("ZDAO", zdaoAddress);

  console.log(`ZDAO Address: ${zdaoAddress}`);

  const tokenAddress = "0xd396ca541F501f5D303166C509e2045848df356b"; // LandToken contract address
  const landToken = await ethers.getContractAt("LandToken", tokenAddress);

  const wallet = (await ethers.getSigners())[0]; // Assuming the first signer
  const walletAddr = await wallet.getAddress();
  console.log(`Using wallet address: ${walletAddr}`);

  const timelockAddr = "0x2105694E890678D3eB9340CfFB5eD43b0fA6474b"; // Replace with actual timelock address
  const tokenId = BigInt("27017037966087967700307459411663951630674540094698282482421008015024791769436"); // token ID to transfer

  // Delegate votes
  console.log("Delegating votes...");
  const delegateTx = await landToken.delegate(walletAddr);
  await delegateTx.wait();

  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`Current block number: ${blockNumber}`);

  const votes = await landToken.getVotes(walletAddr);
  console.log(`Voting power of ${walletAddr}: ${votes.toString()}`);

  // Propose the transaction
  const targets = [await landToken.getAddress()];
  const calldatas = [
    landToken.interface.encodeFunctionData("transferFrom", [
      timelockAddr,
      walletAddr,
      tokenId,
    ]),
  ];
  const description = "Transfer NFT";

  console.log("Creating proposal...");
  const proposeTx = await zdao.propose(targets, [0], calldatas, description);
  await proposeTx.wait();

  console.log("Proposal created successfully.");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in script:", error);
    process.exit(1);
  });

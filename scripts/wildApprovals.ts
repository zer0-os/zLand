import { ethers } from "hardhat";
import fs from "fs";

// CONFIGURABLE CONSTANTS
const CONTRACT_ADDRESS = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";  // The ERC-20 token contract
const START_BLOCK = 21_000_000;                              // Or the known deployment block
const CHUNK_SIZE = 100_000;                       // 1 million blocks per chunk
const CSV_FILE = "approvals2.csv";

async function main() {
  // 1. Use Hardhat’s provider (respects --network mainnet, etc.)
  const provider = ethers.provider;

  // 2. Get the latest block number (or set your own limit here).
  //    If you want to go up to block 21_000_000, you can do:
  //       const endBlock = 21_000_000;
  //    But let's demonstrate using the current chain head:
  const latestBlock = await provider.getBlockNumber();
  const endBlock = latestBlock;//Math.min(latestBlock, 21_000_000); // If you truly want to stop at block 21M

  console.log(`Latest block: ${latestBlock}`);
  console.log(`Will fetch from block ${START_BLOCK} to block ${endBlock} in chunks of ${CHUNK_SIZE}.\n`);

  // 3. Minimal ABI for the ERC-20 Approval event
  const erc20Abi = [
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ];

  // 4. Create a contract instance
  const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, erc20Abi, provider);

  // 5. Initialize CSV with headers. If you want to resume an existing file, handle that logic differently.
  fs.writeFileSync(CSV_FILE, "walletAddress,approvedAddress,approvalAmount\n", { encoding: "utf-8" });

  // 6. Loop through chunks
  let currentStart = START_BLOCK;
  while (currentStart <= endBlock) {
    const currentEnd = Math.min(currentStart + CHUNK_SIZE - 1, endBlock);
    console.log(`Querying blocks [${currentStart}, ${currentEnd}]...`);

    // Fetch raw logs for the "Approval" event in this chunk
    const rawLogs = await tokenContract.queryFilter("Approval", currentStart, currentEnd);

    console.log(`  Found ${rawLogs.length} Approval logs in this range.`);

    // Decode each log and append to CSV
    let csvChunk = "";
    for (const rawLog of rawLogs) {
      const parsedLog = tokenContract.interface.parseLog(rawLog);
      if (parsedLog && parsedLog.name === "Approval") {
        // For the Approval event, we expect (owner, spender, value)
        // The parsed args are type `Result`, so we do a manual cast:
        const { owner, spender, value } = parsedLog.args as unknown as {
          owner: string;
          spender: string;
          value: bigint;
        };
        csvChunk += `${owner},${spender},${value.toString()}\n`;
      }
    }
    if (csvChunk.length > 0) {
      fs.appendFileSync(CSV_FILE, csvChunk, { encoding: "utf-8" });
    }

    // Move to the next chunk
    currentStart = currentEnd + 1;

    // Optional: small delay to avoid rate limits
    // await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\nDone! All Approval logs up to block ${endBlock} have been written to ${CSV_FILE}.`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import fs from "fs-extra";
import path from "path";

// Mapping of neighborhood image names (without numbers) to Arweave IDs
const arweaveLinks: { [key: string]: string } = {
  "SM": "u__Sgpnj08H04BamtVwaUD6HJKjBT9u94wviRzOiD7M",
  "NS": "Uh5RzQmT1AMsLbxiQLchKfnkZ16_6jPQO9efEb9BiYI",
  "TG": "DrN_a6wsY_XjllX84HkNkS_JGTsHOI5tUOysHN5IuS8",
  "LM": "uOqNmJ0C5TwgrUZIO_m-PzYoz3asImnNJ4NpdVxzrXY",
  "FL": "GsZWSItOKoAhH7lFTkN8ukKBMEQf-8agWzun49T0zyA",
  "HH": "XAXViNZFrT8IWI7GqEGJCChslV-bQl3mCqfqQUALA4U",
  "DZ": "ZEUT87NIPjZZ7kdsI1duiA2knDIoi5eWj3mmtH9T_HQ",
  "NX": "ei2l3N4Ed2JgAzFOPZ8ovao4HYEYCHvpmosOsIdR9JA",
};

// Load the JSON data from a file
const inputFile = "data/metadata.json"; // Replace with your actual file name

async function main() {
  // Read the JSON file
  const data = JSON.parse(await fs.readFile(inputFile, "utf-8"));

  // Create an output directory
  const outputDir = path.join(__dirname, "output");
  await fs.ensureDir(outputDir);

  // Process each NFT entry
  for (const nft of data.nfts) {
    const tag = nft.tag;
    const metadata = nft.metadata;

    // Ensure metadata.name is valid
    if (metadata.name == null || metadata.name === "") {
      throw new Error(`Invalid or missing name value for tag: ${tag}`);
    }

    // Generate the token ID using keccak256 and convert to BigInt
    const tokenIdBytes = ethers.keccak256(ethers.toUtf8Bytes(metadata.name));
    const tokenId = BigInt(tokenIdBytes);

    // Convert the BigInt to string for JSON serialization
    nft.tokenID = tokenId.toString();

    // Extract the neighborhood prefix (first part before the number)
    const neighborhoodPrefix = metadata.name.split('-')[0];

    // Update the image URL based on the neighborhood prefix
    if (arweaveLinks[neighborhoodPrefix]) {
      metadata.image = `ar://${arweaveLinks[neighborhoodPrefix]}`;
    } else {
      console.warn(`No Arweave link found for neighborhood prefix: ${neighborhoodPrefix}`);
    }

    // Reorder the metadata fields so that 'name' and 'image' come before 'attributes'
    const reorderedMetadata = {
      name: metadata.name,
      image: metadata.image,
      animation_url: metadata.animation_url,
      description: metadata.description,
      attributes: metadata.attributes
    };

    // Define the file path using the token ID
    const filePath = path.join(outputDir, `${nft.tokenID}.json`);

    // Save the reordered metadata as a JSON file
    await fs.writeJson(filePath, reorderedMetadata, { spaces: 4 });

    console.log(`File created: ${filePath}`);
  }

  // Save the updated JSON back to the input file with new image URLs
  await fs.writeJson(inputFile, data, { spaces: 4 });

  console.log(`Updated input file with token IDs and new image URLs: ${inputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

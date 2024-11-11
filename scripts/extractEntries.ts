import * as fs from 'fs';
import * as path from 'path';

// Path to the metadata file
const metadataFilePath = path.join(__dirname, 'data', 'updated_metadata.json');

// Check if the file exists
if (!fs.existsSync(metadataFilePath)) {
  throw new Error(`Metadata file not found at: ${metadataFilePath}`);
}

// Load metadata from the file
const nftData = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));

// Ensure output directory exists
const outputDir = './nft_metadata';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to write each NFT metadata to a separate file using tokenID as the file name
nftData.nfts.forEach((nft: any) => {
  const fileName = path.join(outputDir, `${nft.tokenID}.json`);  // File name based on tokenID

  /* Filter attributes: remove display_type unless it's Max or Min # Of Floors
  const filteredAttributes = nft.metadata.attributes.filter((attribute: any) => {
    if (attribute.hasOwnProperty('display_type')) {
      return attribute.trait_type === 'Max # Of Floors' || attribute.trait_type === 'Min # Of Floors';
    }
    return true;
  });

  // Reorder metadata keys: name and image at the top
  const reorderedMetadata = {
    name: nft.metadata.name,
    image: nft.metadata.image,
    ...nft.metadata,
    attributes: filteredAttributes  // Replace attributes with filtered ones
  };
  */
  // Write the reordered metadata to a JSON file
  fs.writeFileSync(fileName, JSON.stringify(nft.metadata, null, 2), 'utf8');
  console.log(`Metadata for NFT with tokenID ${nft.tokenID} saved to ${fileName}`);
});

import * as fs from 'fs';
import * as path from 'path';

// Path to the original metadata file
const metadataFilePath = path.join(__dirname, 'data', 'metadata.json');

// Path to the new output file
const updatedMetadataPath = path.join(__dirname, 'data', 'updated_metadata.json');

// Check if the file exists
if (!fs.existsSync(metadataFilePath)) {
  throw new Error(`Metadata file not found at: ${metadataFilePath}`);
}

// Load metadata from the file
const nftData = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));

// Process each NFT entry
nftData.nfts = nftData.nfts.map((nft: any) => {
  // Filter attributes: remove display_type unless it's Max or Min # Of Floors
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

  // Reorder the entire NFT entry: move tokenID to the top
  const reorderedNft = {
    tokenID: nft.tokenID,
    tag: nft.tag,
    metadata: reorderedMetadata
  };

  return reorderedNft;
});

// Write the updated data to the new file without altering the original
fs.writeFileSync(updatedMetadataPath, JSON.stringify(nftData, null, 2), 'utf8');
console.log(`Updated metadata file saved to ${updatedMetadataPath}`);

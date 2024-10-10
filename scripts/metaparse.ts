import * as fs from 'fs';
import * as path from 'path';

// Paths to your JSON files
const manifestFilePath = path.join(__dirname, 'data', 'manifest.json');
const metadataFilePath = path.join(__dirname, 'data', 'metadata.json');
const outputFilePath = path.join(__dirname, 'data', 'updated_metadata.json');

// Read and parse the manifest file
const manifestContent = fs.readFileSync(manifestFilePath, 'utf-8');
const manifestData = JSON.parse(manifestContent);

// Build id mapping from numbers to ids
const idMapping: { [key: string]: string } = {};

for (const filePath in manifestData.paths) {
  const match = filePath.match(/downloads\/(\d+)\.mp4$/);
  if (match) {
    const numberStr = match[1];
    const number = parseInt(numberStr, 10); // Normalize the number
    const normalizedNumberStr = number.toString();
    const idValue = manifestData.paths[filePath].id;
    idMapping[normalizedNumberStr] = idValue;
  }
}

// For debugging: print sample entries from idMapping
console.log('Sample entries from idMapping:');
Object.keys(idMapping)
  .slice(0, 5)
  .forEach((key) => {
    console.log(`idMapping[${key}] = ${idMapping[key]}`);
  });

// Read and parse the metadata file
const metadataContent = fs.readFileSync(metadataFilePath, 'utf-8');
const metadata = JSON.parse(metadataContent);
const nfts = metadata.nfts;

// For debugging: print sample tags from nfts
console.log('Sample tags from nfts:');
nfts.slice(0, 5).forEach((nft: any) => {
  console.log(`NFT tag: ${nft.tag}`);
});

// Update the animation_url in metadata
nfts.forEach((nft: any) => {
  const tagStr = nft.tag.toString();
  const tagNumber = parseInt(tagStr, 10); // Normalize the tag
  const normalizedTagStr = tagNumber.toString();

  if (idMapping.hasOwnProperty(normalizedTagStr)) {
    nft.metadata.animation_url = `ar://${idMapping[normalizedTagStr]}`;
    console.log(`Updated NFT with tag ${normalizedTagStr}`);
  } else {
    console.warn(`No corresponding id found for tag: ${normalizedTagStr}`);
  }
});

// Write the updated metadata back to a file
fs.writeFileSync(outputFilePath, JSON.stringify(metadata, null, 4), 'utf-8');
console.log(`Updated metadata has been written to ${outputFilePath}`);

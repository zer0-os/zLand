import fs from 'fs';
import fetch from 'node-fetch';

// Load metadata from the local file
const metadataPath = 'scripts/data/updated_metadata.json';

async function loadMetadata(): Promise<any[]> {
  try {
    const rawData = fs.readFileSync(metadataPath, 'utf8');
    const parsedData = JSON.parse(rawData);
    return parsedData.nfts || [];
  } catch (error) {
    console.error(`Error reading metadata file: ${error}`);
    throw error;
  }
}

// Function to fetch metadata from Arweave URL
async function fetchMetadataFromArweave(tokenID: string): Promise<any> {
  const url = `https://arweave.net/C-ukHiVDE_twDYirdiEZOH-Bjd4JdzjYbPn0Q84_SOA/${tokenID}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata for tokenID ${tokenID}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching metadata from Arweave for tokenID ${tokenID}: ${error}`);
    throw error;
  }
}

// Compare metadata function
function compareMetadata(localMetadata: any, arweaveMetadata: any): boolean {
  return JSON.stringify(localMetadata) === JSON.stringify(arweaveMetadata);
}

// Main function
async function verifyMetadata() {
  try {
    const metadataList = await loadMetadata();

    for (const entry of metadataList) {
      const { tokenID, metadata } = entry;

      console.log(`Verifying metadata for tokenID: ${tokenID}...`);

      try {
        const arweaveMetadata = await fetchMetadataFromArweave(tokenID);

        if (compareMetadata(metadata, arweaveMetadata)) {
          console.log(`✔ Metadata verified for tokenID: ${tokenID}`);
        } else {
          console.error(`❌ Metadata mismatch for tokenID: ${tokenID}`);
        }
      } catch (error) {
        console.error(`Failed to verify metadata for tokenID: ${tokenID}`);
      }
    }
  } catch (error) {
    console.error(`Error in verifying metadata: ${error}`);
  }
}

// Run the verification
verifyMetadata();

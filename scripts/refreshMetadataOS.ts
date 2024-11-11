import axios from 'axios';
import * as fs from 'fs';

// Define the interface for the data in the JSON file
interface TokenData {
  address: string;
  id: string;
}

// Read and parse the JSON file
const filePath = './dropData.json';
const jsonData: TokenData[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const refreshMetadata = async (address: string, tokenId: string) => {

  const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${address}/nfts/${tokenId}/refresh`;

  try {
    const response = await axios.get(url);
    console.log(`Successfully refreshed metadata for Token ID: ${tokenId}`);
  } catch (error) {
    console.error(`Error refreshing metadata for Token ID: ${tokenId}`, error.message);
  }
};

const main = async () => {
  for (const token of jsonData) {
    await refreshMetadata(token.address, token.id);
  }
};

main().catch((err) => console.error('An error occurred:', err));

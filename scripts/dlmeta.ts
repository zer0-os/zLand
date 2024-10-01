import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Path to the NFT data JSON file
const nftDataFile = 'data/metadata.json';

// Directory to save the downloaded videos
const downloadDir = './downloads';

// Ensure the download directory exists
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

// Function to download a single file
const downloadFile = async (url: string, filename: string): Promise<void> => {
    const filePath = path.join(downloadDir, filename);
    const writer = fs.createWriteStream(filePath);

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        // Safely handle unknown error type by checking its instance
        if (error instanceof Error) {
            console.error(`Failed to download ${filename}: ${error.message}`);
        } else {
            console.error(`Failed to download ${filename}: Unknown error`);
        }
    }
};

// Main function to process all NFTs and download animations
const downloadAllNFTAnimations = async (): Promise<void> => {
    // Read the NFT data from the JSON file
    const rawData = fs.readFileSync(nftDataFile, 'utf8');
    const nftData = JSON.parse(rawData);

    const downloadPromises = nftData.nfts.map((nft: any) => {
        const url = nft.metadata.animation_url;
        const tag = nft.tag;
        const filename = `${tag}.mp4`; // Save with tag as filename

        console.log(`Downloading: ${url} -> ${filename}`);
        return downloadFile(url, filename);
    });

    try {
        await Promise.all(downloadPromises);
        console.log('All downloads completed successfully.');
    } catch (error) {
        // Safely handle unknown error type in Promise.all catch
        if (error instanceof Error) {
            console.error(`Error in downloading files: ${error.message}`);
        } else {
            console.error('Error in downloading files: Unknown error');
        }
    }
};

// Start the download process
downloadAllNFTAnimations();

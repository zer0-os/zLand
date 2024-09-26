import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for the data structures
interface ManifestData {
  manifest: string;
  version: string;
  index: { path: string };
  paths: {
    [key: string]: PathEntry;
  };
}

interface PathEntry {
  id: string;
}

interface OutputEntry {
  address: string;
  id: string;
  uri: string;
}

// Path to your input JSON file
const inputFilePath = 'data/manifest.json';

// Path to your output JSON file
const outputFilePath = 'output.json';

// Fixed address to be used in each entry
const address = '0xE69D793192B7459FF518E75BC52783BAEAEBCAF0';

// Read and parse the JSON data from the file
try {
  const rawData = fs.readFileSync(inputFilePath, 'utf8');
  const data: ManifestData = JSON.parse(rawData);

  // Initialize the array to hold the transformed data
  const outputData: OutputEntry[] = [];

  // Check if the 'paths' field exists
  if (data.paths && typeof data.paths === 'object') {
    // Iterate over each entry in 'paths'
    for (const [filePath, value] of Object.entries(data.paths)) {
      // Ensure 'value' has the correct type
      const pathEntry = value as PathEntry;

      // Extract the filename from the path
      const filename = path.basename(filePath);

      // Remove the '.json' extension to get the numerical ID
      const idStr = filename.replace('.json', '');

      // Get the 'id' value from the manifest (the hash)
      const uriHash = pathEntry.id;

      // Construct the new data entry
      const entry: OutputEntry = {
        address: address,
        id: idStr,
        uri: `ar://${uriHash}`,
      };

      // Add the entry to the output data array
      outputData.push(entry);
    }

    // Output the transformed data to the console
    console.log(JSON.stringify(outputData, null, 2));

    // Write the transformed data to the output file
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`Transformed data has been written to ${outputFilePath}`);
  } else {
    console.error("The 'paths' field is missing or invalid in the input data.");
  }
} catch (error) {
  console.error('An error occurred while processing the data:', error);
}

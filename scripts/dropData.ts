import * as fs from 'fs';
import * as readline from 'readline';

// File paths
const inputFile = 'dropInput.tsv';
const outputFile = 'dropOutput.json';

interface Entry {
  address: string;
  id: string;
}

async function processFile() {
  const fileStream = fs.createReadStream(inputFile);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const result: Entry[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const columns = line.split('\t');
    if (columns.length < 3) {
      console.error(`Invalid line: ${line}`);
      continue;
    }

    const id = columns[0].trim();
    const address = columns[2].trim();

    result.push({
      address: address,
      id: id,
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

  console.log(`JSON file has been saved to ${outputFile}`);
}

processFile().catch((error) => {
  console.error('An error occurred:', error);
});

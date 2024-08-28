import * as fs from 'fs';

interface Entry {
  address: string;
  id: string;
}

// Function to generate a random hexadecimal string
function generateRandomHex(length: number): string {
  const characters = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}

// Generate 4444 entries
const entries: Entry[] = [];
for (let i = 0; i < 4444; i++) {
  const address = '0x' + generateRandomHex(40); // Generate a 40-character hex string for the address
  const id = i.toString(); // Use the index as the ID
  entries.push({ address, id }); // Push an object with address and id properties
}

// Convert the entries to JSON format
const jsonContent = JSON.stringify(entries, null, 2);

// Write the JSON to a file
fs.writeFileSync('entries.json', jsonContent);

console.log('Generated 4444 entries and saved to entries.json');

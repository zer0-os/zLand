import * as fs from 'fs';
import { parse } from 'csv-parse';

interface Centroid {
  x: number;
  y: number;
}

// Path to your text file
const filePath = './Sheet09.txt';

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Parse the CSV data (Tab-separated values in this case)
  parse(data, { delimiter: '\t', columns: true }, (err, records) => {
    if (err) {
      console.error('Error parsing the data:', err);
      return;
    }

    // Extract centroid coordinates
    const centroids: Centroid[] = records.map((record: any) => ({
      x: parseFloat(record['Centroid X Coordinate (m)']),
      y: parseFloat(record['Centroid Y Coordinate (m)']),
    }));

    // Write the centroids to a JSON file
    fs.writeFile('centroids.json', JSON.stringify(centroids, null, 2), (err) => {
      if (err) {
        console.error('Error writing the JSON file:', err);
        return;
      }
      console.log('Centroid coordinates have been written to centroids.json');
    });
  });
});

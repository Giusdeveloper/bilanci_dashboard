import fs from 'fs';
import path from 'path';

// Read CSV file
const csvPath = path.join(process.cwd(), 'attached_assets/AWENTIA 31.08 PARTITARI - AWENTIA 31.08 PARTITARI_1760605038037.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

const data = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const values = lines[i].split(',');
  const row: any = {};
  
  headers.forEach((header, index) => {
    row[header.trim()] = values[index]?.trim() || '';
  });
  
  data.push(row);
}

// Write to JSON file
const outputPath = path.join(process.cwd(), 'client/src/data/partitariData.ts');
const output = `// Auto-generated from CSV
export const partitariData = ${JSON.stringify(data, null, 2)};

export const partitariHeaders = ${JSON.stringify(headers.map(h => h.trim()), null, 2)};
`;

fs.writeFileSync(outputPath, output);
console.log(`Processed ${data.length} rows`);
console.log(`Output written to: ${outputPath}`);

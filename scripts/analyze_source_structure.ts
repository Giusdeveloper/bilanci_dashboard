
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

// Find the latest file
const IMPORT_DIR = path.resolve(__dirname, '../import_data');
const files = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
// Pick the Awentia one preferably, or just the latest
const latestFile = files.find(f => f.includes('Awentia')) || files[files.length - 1];

const EXCEL_PATH = path.join(IMPORT_DIR, latestFile);
console.log(`Analyzing file: ${latestFile}`);

const buffer = fs.readFileSync(EXCEL_PATH);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames.find(s => s.trim().toLowerCase() === "source");

if (!sheetName) {
    console.error("Source sheet not found");
    process.exit(1);
}

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

console.log(`Parsed Source Sheet with ${data.length} rows.`);

// Search for Headers
let colCurrent = -1;
let colPrevious = -1;

for (let r = 0; r < Math.min(data.length, 20); r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
        const val = String(row[c]).toUpperCase().trim();
        if (val.includes("ANNO CORRENTE")) {
            console.log(`Found 'ANNO CORRENTE' at Row ${r}, Col ${c}`);
            colCurrent = c;
        }
        if (val.includes("ANNO PRECEDENTE")) {
            console.log(`Found 'ANNO PRECEDENTE' at Row ${r}, Col ${c}`);
            colPrevious = c;
        }
    }
}

// Check Metadata
console.log("\nRow 0:", JSON.stringify(data[0]));
if (data.length > 1) console.log("Row 1:", JSON.stringify(data[1]));
if (data.length > 2) console.log("Row 2:", JSON.stringify(data[2]));

console.log(`\nProposed Split:`);
console.log(`Current items start around Col ${colCurrent}`);
console.log(`Previous items start around Col ${colPrevious}`);

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetSheet = "CE dettaglio mensile";

async function debugSheet() {
    const importDir = path.join(__dirname, '../import_data');
    const files = fs.readdirSync(importDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

    if (files.length === 0) {
        console.log("No Excel file found.");
        return;
    }

    const filePath = path.join(importDir, files[0]);
    console.log(`Analyzing: ${filePath}`);

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });

    if (!workbook.SheetNames.includes(targetSheet)) {
        console.log(`Sheet '${targetSheet}' not found.`);
        return;
    }

    const sheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Scanning '${targetSheet}' for 'Gennaio'...`);

    const matches = [];

    data.forEach((row, rIdx) => {
        if (!row) return;
        row.forEach((cell, cIdx) => {
            if (String(cell).trim() === "Gennaio") {
                matches.push({ row: rIdx, col: cIdx });
            }
        });
    });

    console.log("Found 'Gennaio' at coordinates:", matches);

    // Print a snippet around each match to context
    matches.forEach((m, idx) => {
        console.log(`\n--- Match #${idx + 1} (Row ${m.row}, Col ${m.col}) ---`);
        // Print just the row and the one before it to identify the block
        console.log(`Row ${m.row - 1}:`, JSON.stringify(data[m.row - 1]));
        console.log(`Row ${m.row}:`, JSON.stringify(data[m.row]));
    });
}
debugSheet();

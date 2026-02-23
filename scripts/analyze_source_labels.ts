
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = 'c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\import_data\\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx';

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

console.log(`Reading file: ${filePath}`);
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames.find(s => s.trim().toLowerCase() === 'source');

if (!sheetName) {
    console.error("Sheet 'Source' not found");
    process.exit(1);
}

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`--- Source Row Labels (${data.length} rows) ---`);
const cat2 = new Set<string>(); // Column 2
const cat3 = new Set<string>(); // Column 3

data.forEach((row: any) => {
    if (!row || row.length === 0) return;

    // Column 2 (Category Level 1)
    if (row[2] && typeof row[2] === 'string') {
        const s = row[2].trim();
        if (s.length > 2) cat2.add(s);
    }

    // Column 3 (Category Level 2)
    if (row[3] && typeof row[3] === 'string') {
        const s = row[3].trim();
        if (s.length > 2) cat3.add(s);
    }
});

console.log(`\n--- CATEGORY LEVEL 1 (Col 2) ---`);
Array.from(cat2).sort().forEach(l => console.log(`- ${l}`));

console.log(`\n--- CATEGORY LEVEL 2 (Col 3) ---`);
Array.from(cat3).sort().forEach(l => console.log(`- ${l}`));

console.log("Only listing rows with text in the first few columns...");

const labels = new Set<string>();

data.forEach((row: any, index) => {
    if (!row || row.length === 0) return;

    // Check first 3 columns for text
    let label = "";
    if (typeof row[0] === 'string') label = row[0];
    else if (typeof row[1] === 'string') label = row[1];
    else if (typeof row[3] === 'string') label = row[3]; // Column D often has labels

    label = label.trim();
    if (label && label.length > 2 && !label.toLowerCase().includes("pagina")) {
        labels.add(label);
    }
});

Array.from(labels).sort().forEach(l => console.log(`- ${l}`));

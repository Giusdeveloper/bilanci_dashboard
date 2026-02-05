
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const importDir = path.join(process.cwd(), 'import_data');

function findExcelFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    return files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
}

const excelFiles = findExcelFiles(importDir);
const filename = excelFiles.find(f => f.includes("Analisi Bilanci Awentia"));

if (!filename) {
    console.log("File not found");
    process.exit(1);
}

const filepath = path.join(importDir, filename);
console.log(`Analyzing file: ${filename}`);

const targetSheets = [
    "1_CE dettaglio",
    "CE dettaglio mensile",
    "3_CE sintetico",
    "4_CE sintetico mensile"
];

try {
    const workbook = XLSX.readFile(filepath);

    targetSheets.forEach(sheetName => {
        if (!workbook.SheetNames.includes(sheetName)) {
            console.log(`\n❌ Sheet NOT FOUND: ${sheetName}`);
            return;
        }

        console.log(`\n✅ Analyzing Sheet: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Log column headers (usually row 0, 1 or 2)
        console.log("Flux headers check (first 5 rows):");
        jsonData.slice(0, 5).forEach((row, i) => {
            // Print only non-null values to keep it clean
            const cleanRow = (row || []).map(c => c === undefined ? null : c);
            console.log(`Row ${i}:`, JSON.stringify(cleanRow));
        });
    });

} catch (err) {
    console.error("Error reading excel:", err);
}

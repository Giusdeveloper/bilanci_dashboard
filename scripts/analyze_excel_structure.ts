
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const importDir = path.join(process.cwd(), 'import_data');

console.log("Checking directory:", importDir);

function findExcelFiles(dir: string): string[] {
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
console.log(`Reading file: ${filename}`);

try {
    const workbook = XLSX.readFile(filepath);
    console.log("Sheet Names:", workbook.SheetNames);

    // Read first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n--- Sheet: ${sheetName} (First 20 Rows) ---`);
    jsonData.slice(0, 20).forEach((row: any, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
    });

} catch (err) {
    console.error("Error reading excel:", err);
}

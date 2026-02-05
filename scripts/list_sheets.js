
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const importDir = path.join(process.cwd(), 'import_data');

console.log("XLSX type:", typeof XLSX);
console.log("XLSX keys:", Object.keys(XLSX || {}));

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
console.log(`Reading file: ${filename}`);

try {
    const workbook = XLSX.readFile(filepath);
    console.log("--- SHEET LIST ---");
    workbook.SheetNames.forEach((name, index) => {
        console.log(`${index + 1}: ${name}`);
    });
    console.log("------------------");

} catch (err) {
    console.error("Error reading excel:", err);
}

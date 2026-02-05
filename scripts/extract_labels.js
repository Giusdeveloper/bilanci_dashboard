
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
const filepath = path.join(importDir, filename);

const sheetName = "1_CE dettaglio";

try {
    const workbook = XLSX.readFile(filepath);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Extracting labels from ${sheetName}...`);

    const labels = [];
    jsonData.forEach((row, i) => {
        if (!row || row.length === 0) return;
        const label = row[0];
        if (label && typeof label === 'string') {
            labels.push(label.trim());
        }
    });

    console.log(JSON.stringify(labels, null, 2));

} catch (err) {
    console.error("Error:", err);
}

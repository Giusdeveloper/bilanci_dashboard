
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

const targetSheets = [
    "1_CE dettaglio",
    "CE dettaglio mensile",
    "3_CE sintetico",
    "4_CE sintetico mensile"
];

try {
    const workbook = XLSX.readFile(filepath);

    const allLabels = {};

    targetSheets.forEach(sheetName => {
        if (!workbook.SheetNames.includes(sheetName)) {
            console.log(`❌ Sheet NOT FOUND: ${sheetName}`);
            return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Extract labels (assumed to be in Column A, index 0)
        const labels = new Set();
        jsonData.forEach(row => {
            if (row && row.length > 0 && typeof row[0] === 'string') {
                const label = row[0].trim();
                // Skip headers/metadata
                if (label.includes("CONTO ECONOMICO") || label.includes("Ottobre") || label === "PROGRESSIVO") return;
                labels.add(label);
            }
        });

        allLabels[sheetName] = Array.from(labels);
    });

    console.log(JSON.stringify(allLabels, null, 2));

} catch (err) {
    console.error("Error:", err);
}

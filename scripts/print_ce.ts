
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx`;

const buffer = fs.readFileSync(EXCEL_PATH);
const workbook = XLSX.read(buffer, { type: 'buffer' });

// Find CE Dettaglio
const dettaglioSheet = "1_CE dettaglio";
const sheet = workbook.Sheets[dettaglioSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

console.log("=== CE DETTAGLIO - STRUTTURA CONTO ECONOMICO ===\n");

// Print key rows
for (let i = 0; i < 30; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const label = String(row[0]);
    const val2025 = typeof row[2] === 'number' ? row[2].toFixed(2) : row[2];
    const val2024 = typeof row[5] === 'number' ? row[5].toFixed(2) : row[5];
    console.log(`${i.toString().padStart(2)}: ${label.substring(0, 35).padEnd(35)} | ${String(val2025).padStart(12)} | ${String(val2024).padStart(12)}`);
}

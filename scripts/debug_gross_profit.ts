
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { EXCEL_ROW_MAP } from '../client/src/utils/excelMapper';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx`;

// Copy of getKey from excelParser.ts
const getKey = (label: any): string | null => {
    if (!label) return null;
    const strLabel = String(label).trim();

    // Direct match
    if (EXCEL_ROW_MAP[strLabel]) return EXCEL_ROW_MAP[strLabel];

    // Case insensitive match
    const lowerLabel = strLabel.toLowerCase();
    for (const [key, value] of Object.entries(EXCEL_ROW_MAP)) {
        if (key.toLowerCase() === lowerLabel) return value;
    }

    // Fuzzy / Partial matches
    if (lowerLabel.includes("totale ricavi") && !lowerLabel.includes("non tipici")) return "totaleRicavi";
    if (lowerLabel.includes("margine") && !lowerLabel.includes("operativo") && !lowerLabel.includes("lordo")) return "margine";
    // Check for GROSS PROFIT specifically
    if (lowerLabel.includes("gross profit")) return "grossProfit";

    return null;
};

// Copy of cleanNumber from excelParser.ts
const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

async function debugParser() {
    console.log("=== DEBUG GROSS PROFIT PARSING ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Simulate the fix: Find sheet with "sintentico" typo
    const sheetName = workbook.SheetNames.find(s => {
        const low = s.toLowerCase();
        return (low.includes("sintetico") || low.includes("sintentico")) && !low.includes("mensile");
    });

    console.log(`Target Sheet: "${sheetName}"`);

    if (!sheetName) {
        console.error("❌ Sheet not found with updated logic!");
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Columns detection logic
    let col2025 = 2;
    let col2024 = 5;

    // Check header rows for columns
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
        const row = jsonData[i];
        if (!row) continue;
        row.forEach((cell: any, idx: number) => {
            const s = String(cell);
            if (s.includes("2025")) col2025 = idx;
            if (s.includes("2024")) col2024 = idx;
        });
    }

    console.log(`Columns Detected -> 2025: ${col2025}, 2024: ${col2024}`);

    // Scan rows
    console.log("\nScanning Rows...");
    jsonData.forEach((row, idx) => {
        if (!row || row.length === 0) return;
        const label = row[0];
        const key = getKey(label);

        // Debug specific keys
        if (key === 'grossProfit' || key === 'margine' || String(label).toUpperCase().includes('GROSS')) {
            console.log(`Row ${idx}: "${label}"`);
            console.log(`   -> Key: ${key}`);
            console.log(`   -> Raw 2025: ${row[col2025]} | Cleaned: ${cleanNumber(row[col2025])}`);
            console.log(`   -> Raw 2024: ${row[col2024]} | Cleaned: ${cleanNumber(row[col2024])}`);
        }
    });
}

debugParser();

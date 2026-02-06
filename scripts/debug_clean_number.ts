
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

// Copy of cleanNumber from excelParser
const cleanNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const clean = val.replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

async function debugCleanNumber() {
    console.log("=== DEBUG cleanNumber FOR TOTALE RICAVI ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = "1_CE dettaglio";
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Simulated column detection (fallback values from excelParser)
    let col2025 = -1;
    let col2024 = -1;

    // Scan headers
    for (let i = 0; i < Math.min(data.length, 40); i++) {
        const row = data[i];
        if (!row) continue;

        row.forEach((cell: any, idx: number) => {
            const s = String(cell).toUpperCase();
            if (s.includes("2025") && col2025 === -1) col2025 = idx;
            if (s.includes("2024") && col2024 === -1) col2024 = idx;
        });
    }

    // Apply fallback if not found
    if (col2025 === -1) col2025 = 2;
    if (col2024 === -1) col2024 = 5;

    console.log(`Detected columns: col2025=${col2025}, col2024=${col2024}`);

    // Find TOTALE RICAVI row
    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[0]) continue;
        if (String(row[0]).toUpperCase().includes("TOTALE RICAVI")) {
            console.log(`\nRow ${r}: ${row[0]}`);

            const val2025 = row[col2025];
            const val2024 = row[col2024];

            console.log(`  raw row[${col2025}] = ${val2025} (type: ${typeof val2025})`);
            console.log(`  raw row[${col2024}] = ${val2024} (type: ${typeof val2024})`);

            console.log(`  cleanNumber(row[${col2025}]) = ${cleanNumber(val2025)}`);
            console.log(`  cleanNumber(row[${col2024}]) = ${cleanNumber(val2024)}`);
            break;
        }
    }
}

debugCleanNumber();

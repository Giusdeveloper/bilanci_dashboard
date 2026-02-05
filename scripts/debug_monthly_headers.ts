
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx`;

function debugMonthlyHeaders() {
    console.log("=== DEBUG MONTHLY HEADERS ===\n");
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ File not found: ${EXCEL_PATH}`);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = "CE sintetico mensile"; // Check alternate sheet
    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`❌ Sheet '${sheetName}' not found.`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Sheet: ${sheetName}, Rows: ${data.length}`);
    console.log("--- First 5 Rows (Headers Check) ---");
    for (let i = 0; i < 5; i++) {
        const row = data[i] as any[];
        const preview = row ? row.map(c => typeof c === 'string' ? `"${c}"` : c).join(' | ') : "EMPTY";
        console.log(`Row ${i}: ${preview}`);
    }
}

debugMonthlyHeaders();

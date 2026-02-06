
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx`;

async function debugHeaders() {
    console.log("=== DEBUG HEADERS ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet with "sintetico" typo
    const sheetName = workbook.SheetNames.find(s => {
        const low = s.toLowerCase();
        return (low.includes("sintetico") || low.includes("sintentico")) && !low.includes("mensile");
    });

    console.log(`Target Sheet: "${sheetName}"`);

    if (!sheetName) return;

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log("\nTop 5 rows:");
    for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
        const row = jsonData[i];
        if (!row) continue;
        console.log(`Row ${i}:`);
        row.forEach((cell: any, idx: number) => {
            const s = String(cell);
            if (s.includes("2025") || s.includes("2024")) {
                console.log(`   Col ${idx}: "${s}"`);
            }
        });
    }
}

debugHeaders();

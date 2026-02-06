
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Awentia.xlsx`;

async function analyzeSourceSheet() {
    console.log("=== ANALYZE SOURCE SHEET ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("File not found:", EXCEL_PATH);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === "source");
    if (!sheetName) {
        console.error("❌ 'Source' sheet not found!");
        console.log("Available sheets:", workbook.SheetNames.join(", "));
        return;
    }

    console.log(`Found sheet: "${sheetName}"`);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Total Rows: ${jsonData.length}`);

    // Print first 5 rows to see headers and data types
    console.log("\nTop 5 Rows:");
    jsonData.slice(0, 5).forEach((row: any, idx) => {
        console.log(`Row ${idx}: ${JSON.stringify(row)}`);
    });
}

analyzeSourceSheet();

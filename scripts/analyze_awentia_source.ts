
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function analyzeAwentiaSource() {
    console.log("=== ANALYZE AWENTIA SOURCE SHEET ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("File not found:", EXCEL_PATH);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === "source");
    if (!sheetName) {
        console.error("❌ 'Source' sheet not found!");
        return;
    }

    console.log(`Found sheet: "${sheetName}"`);
    const sheet = workbook.Sheets[sheetName];

    // Get dimensions
    const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:Z100");
    console.log(`Dimensions: Rows ${range.s.r}-${range.e.r}, Cols ${range.s.c}-${range.e.c}`);

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("\n--- Top 10 Rows ---");
    jsonData.slice(0, 10).forEach((row: any, idx) => {
        console.log(`Row ${idx}:`, JSON.stringify(row));
    });

    // Check for potential "side-by-side" tables
    // Look for repeated headers or distinct blocks
}

analyzeAwentiaSource();

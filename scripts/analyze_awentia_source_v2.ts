
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function analyzeAwentiaSourceV2() {
    console.log("=== ANALYZE AWENTIA SOURCE SHEET V2 ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("File not found:", EXCEL_PATH);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === "source");

    if (!sheetName) return;

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Check Headers (Rows 0-2)
    console.log("\n--- Headers ---");
    for (let i = 0; i < Math.min(jsonData.length, 3); i++) {
        console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
    }

    // Check for "Gross Profit"
    let foundGross = false;
    for (const row of jsonData) {
        const str = row.join(" | ").toUpperCase();
        if (str.includes("GROSS PROFIT") || str.includes("MARGINE LORDO")) {
            console.log("\nFound Margin Row:", str);
            foundGross = true;
        }
    }

    if (!foundGross) console.log("\n❌ 'GROSS PROFIT' or 'MARGINE LORDO' NOT FOUND in Source sheet rows!");
}

analyzeAwentiaSourceV2();

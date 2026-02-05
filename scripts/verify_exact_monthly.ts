
import { ExcelParser } from '../client/src/utils/excelParser';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Mock browser APIs
global.File = class MockFile { } as any;

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx`;

async function verifyExactMonthly() {
    console.log("=== MONTHLY VALUE VERIFICATION ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found");
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    // Bypass constructor read by passing empty string and overriding later
    // @ts-ignore
    const parser = new ExcelParser("");
    // @ts-ignore
    parser.workbook = XLSX.read(buffer, { type: 'buffer' });

    // 1. Run Parser
    console.log("Running ExcelParser...");
    const result = parser.parseCESinteticoMensile();

    if (!result || !result.puntuale2025) {
        console.error("❌ Parser failed to extract monthly data.");
        return;
    }

    const labels = result.puntuale2025.months || [];
    const ricavi = result.puntuale2025.totaleRicavi || [];
    const ebitda = result.puntuale2025.ebitda || [];

    console.log("\n--- EXTRATED VALUES (PARSER) ---");
    console.log("Months:", labels.join(", "));
    console.log("Ricavi:", ricavi.join(", "));
    console.log("EBITDA:", ebitda.join(", "));

    // 2. Compare with Specific Excel Cells (Manual check aid)
    // We know from debug that Row 2 (index 2? no row 3 1-based?) contained the data.
    // Debug output said:
    // Row 3: "Ricavi da attività di consulenza" | ... values ...
    // Row 15 (guess): EBITDA ...

    // Let's print the specific raw rows for visual confirmation
    const sheet = parser.workbook.Sheets["CE sintetico mensile"];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log("\n--- RAW EXCEL ROW SNAPSHOTS ---");

    // Find generic row indices
    let ricaviRowIndex = -1;
    let ebitdaRowIndex = -1;

    rawData.forEach((row, idx) => {
        const label = String(row[0]).toUpperCase();
        if (label.includes("RICAVI DA ATTIVITÀ DI CONSULENZA")) ricaviRowIndex = idx;
        if (label === "EBITDA") ebitdaRowIndex = idx; // Exact match usually
    });

    if (ricaviRowIndex !== -1) {
        // Col 17 is start of PUNTUALE 2025 based on previous debug
        const row = rawData[ricaviRowIndex];
        const rawVals = row.slice(17, 17 + 12); // Take 12 months
        console.log(`Row ${ricaviRowIndex} (Ricavi Consulenza) [Raw Cols 17-28]:`, rawVals.join(", "));
    } else {
        console.log("⚠️ Could not find 'Ricavi da attività di consulenza' row for check.");
    }

    if (ebitdaRowIndex !== -1) {
        const row = rawData[ebitdaRowIndex];
        const rawVals = row.slice(17, 17 + 12);
        console.log(`Row ${ebitdaRowIndex} (EBITDA) [Raw Cols 17-28]:`, rawVals.join(", "));
    } else {
        console.log("⚠️ Could not find 'EBITDA' row for check.");
    }

    console.log("\nVERDICT: Do the Parser values match the Raw values?");
}

verifyExactMonthly();

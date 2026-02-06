
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function traceParserLogic() {
    console.log("=== TRACE PARSER COLUMN DETECTION ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = "1_CE dettaglio";
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // EXACT COPY OF PARSER LOGIC
    let col2025 = -1;
    let col2024 = -1;

    console.log("Scanning headers (exact parser logic)...\n");

    for (let i = 0; i < Math.min(jsonData.length, 40); i++) {
        const row: any = jsonData[i];
        if (!row) continue;

        row.forEach((cell: any, idx: number) => {
            const s = String(cell).toUpperCase();

            // Cerca 2025
            if (s.includes("2025")) {
                if (col2025 === -1) {
                    col2025 = idx;
                    console.log(`  Found 2025 at row ${i}, col ${idx}: "${cell}" → col2025 = ${col2025}`);
                }

                if (s.includes("CONSUNTIVO") || s.includes("PROGRESSIVO") || s.includes("ACTUAL")) {
                    col2025 = idx;
                    console.log(`  Upgraded 2025 (keyword) at row ${i}, col ${idx}: "${cell}" → col2025 = ${col2025}`);
                }
                if (s.includes("BUDGET")) {
                    if (col2025 === idx) {
                        col2025 = -1;
                        console.log(`  Rejected 2025 (BUDGET) at row ${i}, col ${idx}`);
                    }
                }
            }

            // Cerca CONSUNTIVO/ACTUAL for 12
            if (s.includes("CONSUNTIVO") || s.includes("ACTUAL") || s.includes("12")) {
                if (col2025 === -1) {
                    col2025 = idx;
                    console.log(`  Fallback 2025 (12/Consuntivo) at row ${i}, col ${idx}: "${cell}" → col2025 = ${col2025}`);
                }
            }

            // Cerca 2024
            if (s.includes("2024")) {
                col2024 = idx;
                console.log(`  Found 2024 at row ${i}, col ${idx}: "${cell}" → col2024 = ${col2024}`);
            }
            if (s.includes("BUDGET") || s.includes("PRECEDENTE")) {
                if (col2024 === -1) {
                    col2024 = idx;
                    console.log(`  Fallback 2024 (BUDGET/PRECEDENTE) at row ${i}, col ${idx}: "${cell}" → col2024 = ${col2024}`);
                }
            }
        });
    }

    console.log("\n=== FINAL RESULT ===");
    console.log(`col2025 = ${col2025}`);
    console.log(`col2024 = ${col2024}`);

    // Apply fallback
    if (col2025 === -1) col2025 = 2;
    if (col2024 === -1) col2024 = 5;
    console.log(`After fallback: col2025 = ${col2025}, col2024 = ${col2024}`);
}

traceParserLogic();

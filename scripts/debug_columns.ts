
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function debugColumnDetection() {
    console.log("=== DEBUG COLUMN DETECTION ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = "1_CE dettaglio";
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Print rows 0-5 with column indices
    console.log("--- First 6 rows with column indices ---");
    for (let r = 0; r <= 5; r++) {
        const row = data[r] || [];
        console.log(`\nRow ${r}:`);
        row.forEach((cell, idx) => {
            if (cell !== undefined && cell !== null && cell !== "") {
                console.log(`  Col ${idx}: "${cell}"`);
            }
        });
    }

    // Specifically check row with TOTALE RICAVI
    console.log("\n\n--- TOTALE RICAVI Row Analysis ---");
    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[0]) continue;
        if (String(row[0]).toUpperCase().includes("TOTALE RICAVI")) {
            console.log(`Found at Row ${r}:`);
            row.forEach((cell, idx) => {
                if (cell !== undefined && cell !== null && cell !== "") {
                    console.log(`  Col ${idx}: ${cell}`);
                }
            });
            break;
        }
    }
}

debugColumnDetection();

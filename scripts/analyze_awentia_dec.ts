
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function analyzeAwentiaFile() {
    console.log("=== AWENTIA DECEMBER FILE ANALYSIS ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found:", EXCEL_PATH);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log("Sheets:", workbook.SheetNames);

    // Check "1_CE dettaglio" for 2024 column
    const detailSheet = workbook.SheetNames.find(s => s.includes("CE dettaglio") || s.includes("1_CE"));
    if (detailSheet) {
        console.log(`\n--- Analyzing: ${detailSheet} ---`);
        const sheet = workbook.Sheets[detailSheet];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Print first 10 rows to understand structure
        console.log("First 10 rows:");
        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row) continue;
            const preview = row.slice(0, 8).map(c => {
                if (c === undefined || c === null) return "";
                if (typeof c === 'number') return c.toFixed(0);
                return String(c).substring(0, 20);
            });
            console.log(`Row ${i}: ${preview.join(" | ")}`);
        }

        // Look for "2024" in headers
        console.log("\n🔍 Searching for '2024' in any cell:");
        let found2024 = false;
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i];
            if (!row) continue;
            row.forEach((cell, colIdx) => {
                if (String(cell).includes("2024")) {
                    console.log(`  Found '2024' at Row ${i}, Col ${colIdx}: "${cell}"`);
                    found2024 = true;
                }
            });
        }
        if (!found2024) {
            console.log("  ❌ No '2024' found in first 20 rows!");
        }

        // Specifically check for Ricavi row and its columns
        console.log("\n🔍 Looking for 'TOTALE RICAVI' row:");
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            if (String(row[0]).toUpperCase().includes("TOTALE RICAVI")) {
                console.log(`  Row ${i}:`, row.slice(0, 10).join(" | "));
                console.log(`  Full row length: ${row.length} columns`);
                break;
            }
        }
    }

    // Check monthly sheet
    const monthlySheet = workbook.SheetNames.find(s => s.toLowerCase().includes("mensile"));
    if (monthlySheet) {
        console.log(`\n--- Checking Monthly Sheet: ${monthlySheet} ---`);
        const sheet = workbook.Sheets[monthlySheet];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log(`Total rows: ${data.length}`);

        // Check if 2024 blocks exist
        let has2024Block = false;
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const rowText = (data[i] || []).join(" ");
            if (rowText.includes("2024")) {
                console.log(`  Found '2024' reference at row ${i}`);
                has2024Block = true;
            }
        }
        if (!has2024Block) {
            console.log("  ⚠️ No 2024 block found in monthly sheet header area");
        }
    }
}

analyzeAwentiaFile();

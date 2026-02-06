
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx`;

async function analyzeMargine() {
    console.log("=== ANALISI MARGINE/GROSS PROFIT ===\n");

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Check CE Sintetico sheet
    const sinteticoSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('sintetico') && !s.toLowerCase().includes('mensile'));
    if (!sinteticoSheet) {
        console.log("❌ CE Sintetico sheet not found");
        return;
    }

    console.log(`📊 Analyzing: ${sinteticoSheet}\n`);
    const sheet = workbook.Sheets[sinteticoSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Find relevant rows
    const keywords = ['RICAVI', 'COSTI', 'MARGINE', 'GROSS', 'PROFIT', 'EBITDA', 'LORDO'];

    console.log("Key Financial Rows Found:\n");
    for (let i = 0; i < Math.min(data.length, 50); i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const label = String(row[0]).toUpperCase();

        if (keywords.some(k => label.includes(k))) {
            const val2025 = row[2]; // Assuming col 2 is 2025
            const val2024 = row[5]; // Assuming col 5 is 2024
            console.log(`Row ${i}: "${row[0]}"`);
            console.log(`  2025: ${val2025}   |   2024: ${val2024}\n`);
        }
    }

    // Also check the 1_CE dettaglio for GROSS PROFIT row
    const dettaglioSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('dettaglio') && !s.toLowerCase().includes('mensile'));
    if (dettaglioSheet) {
        console.log(`\n📊 Also checking: ${dettaglioSheet}\n`);
        const dSheet = workbook.Sheets[dettaglioSheet];
        const dData = XLSX.utils.sheet_to_json(dSheet, { header: 1 }) as any[][];

        for (let i = 0; i < Math.min(dData.length, 100); i++) {
            const row = dData[i];
            if (!row || !row[0]) continue;
            const label = String(row[0]).toUpperCase();

            if (label.includes('GROSS') || label.includes('MARGINE')) {
                const val2025 = row[2];
                const val2024 = row[5];
                console.log(`Row ${i}: "${row[0]}"`);
                console.log(`  2025: ${val2025}   |   2024: ${val2024}`);
            }
        }
    }
}

analyzeMargine();

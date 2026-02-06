
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { ExcelParser } from '../client/src/utils/excelParser';

// Mock global File for Node
global.File = class MockFile { } as any;

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx`;

async function testParserOutput() {
    console.log("=== TESTING PARSER OUTPUT FOR AWENTIA DECEMBER ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found:", EXCEL_PATH);
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);

    // Create parser with buffer
    // @ts-ignore - bypass constructor
    const parser = new ExcelParser("");
    // @ts-ignore
    parser.workbook = XLSX.read(buffer, { type: 'buffer' });

    // 1. Test CE Dettaglio parsing
    console.log("--- Testing parseCEDettaglio ---");
    const ceDettaglio = parser.parseCEDettaglio();

    if (!ceDettaglio) {
        console.error("❌ parseCEDettaglio returned null!");
        return;
    }

    console.log("Keys in progressivo2025:", Object.keys(ceDettaglio.progressivo2025 || {}));
    console.log("Keys in progressivo2024:", Object.keys(ceDettaglio.progressivo2024 || {}));

    console.log("\n--- 2025 Values ---");
    console.log("  totaleRicavi:", ceDettaglio.progressivo2025?.totaleRicavi);
    console.log("  ebitda:", ceDettaglio.progressivo2025?.ebitda);
    console.log("  risultato:", ceDettaglio.progressivo2025?.risultatoEsercizio);

    console.log("\n--- 2024 Values ---");
    console.log("  totaleRicavi:", ceDettaglio.progressivo2024?.totaleRicavi);
    console.log("  ebitda:", ceDettaglio.progressivo2024?.ebitda);
    console.log("  risultato:", ceDettaglio.progressivo2024?.risultatoEsercizio);

    // Expected from analyze_awentia_dec.ts:
    // Row 5: TOTALE RICAVI | | 331842.08 | | 1 | 125032.34 | (col 2 = 2025, col 5 = 2024)
    console.log("\n--- Expected Values ---");
    console.log("  Expected 2025 totaleRicavi: ~331842");
    console.log("  Expected 2024 totaleRicavi: ~125032");

    if (ceDettaglio.progressivo2024?.totaleRicavi) {
        console.log("\n✅ 2024 data IS being extracted correctly!");
    } else {
        console.log("\n❌ 2024 data is NOT being extracted. Parser issue!");
    }
}

testParserOutput();


import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Exact filename with double space
const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx`;

async function analyzeMaiaFile() {
    console.log("=== MAIA FILE ANALYSIS ===\n");
    console.log("Path:", EXCEL_PATH);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found!");
        // Try to find the actual file
        const dir = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data`;
        const files = fs.readdirSync(dir);
        const maiaFile = files.find(f => f.toLowerCase().includes('maia') && f.includes('Analisi'));
        if (maiaFile) {
            console.log("Found Maia file:", maiaFile);
        }
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log("\n📋 Sheets found:", workbook.SheetNames.length);
    workbook.SheetNames.forEach((name, idx) => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log(`  ${idx + 1}. "${name}" (${data.length} rows)`);
    });

    // Check for expected parser sheet names
    console.log("\n🔍 Parser Sheet Detection:");
    const patterns = {
        "CE dettaglio": ["1_CE dettaglio", "CE dettaglio", "economico dettaglio"],
        "CE dettaglio mensile": ["CE dettaglio mensile", "dettaglio mensile"],
        "CE sintetico": ["3_CE sintetico", "CE sintetico"],
        "CE sintetico mensile": ["4_CE sintetico mensile", "sintetico mensile"]
    };

    for (const [key, searchPatterns] of Object.entries(patterns)) {
        const found = workbook.SheetNames.find(s =>
            searchPatterns.some(p => s.toLowerCase().includes(p.toLowerCase()))
        );
        console.log(`  ${key}: ${found ? `✅ "${found}"` : "❌ NOT FOUND"}`);
    }
}

analyzeMaiaFile();

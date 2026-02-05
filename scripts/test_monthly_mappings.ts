
import { ExcelParser } from '../client/src/utils/excelParser';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Mock browser APIs
global.File = class MockFile { } as any;

const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx`;

async function testMappings() {
    console.log("=== TESTING MONTHLY LABEL MAPPINGS ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found");
        return;
    }

    const buffer = fs.readFileSync(EXCEL_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = "CE sintetico mensile";
    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`❌ Sheet '${sheetName}' not found`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Scanning labels in '${sheetName}' (First column)...`);

    // Check key resolution for rows 2 to 50
    for (let i = 2; i < Math.min(data.length, 50); i++) {
        const row = data[i] as any[];
        if (!row || !row[0]) continue;

        const label = String(row[0]).trim();
        // Access private resolveKey if possible, or replicate logic
        // We'll effectively replicate getKey logic here for display since getKey is private/protected or inside methods
        // Actually, let's use the public helper if available or copy it briefly here to test exact logic.

        const key = getKey(label);

        console.log(`Row ${i} label: "${label.padEnd(40)}" -> Key: ${key ? key : "❌ NULL"}`);
    }
}

// Replicate logic from ExcelParser.ts for test
const EXCEL_ROW_MAP: Record<string, string> = {
    // Populate with critical ones if known
};

const getKey = (label: any): string | null => {
    if (!label) return null;
    const strLabel = String(label).trim();
    const cleanLabel = strLabel.toUpperCase().replace(/\s+/g, ' ');
    const labelLower = strLabel.toLowerCase().replace(/\s+/g, '');

    // CHECK EXCEL_PARSER.TS LOGIC HERE
    if (labelLower.includes('costiboard')) return "compensiAmministratore";
    if (labelLower.includes('costoit') || labelLower.includes('tool')) return "serviziInformatici";
    if (labelLower.includes('spesecommercialie') || labelLower.includes('spesecommerciali')) return "speseCommerciali";
    if (labelLower.includes('spesedistruttura')) return "speseStruttura";
    if (labelLower.includes('speseperbenefit')) return "personale";

    // NEW MAPPINGS SYNCED
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavicaratteristici') || labelLower.includes('1-totalericavi')) return "ricaviCaratteristici";
    if (labelLower.includes('ricavilegateadobiettivi') || labelLower.includes('obiettivivariabiali')) return "ricaviCaratteristici";

    if (labelLower.includes('ammortamentiimmateriali')) return "ammortamenti";
    if (labelLower.includes('ammortamentimateriali')) return "ammortamenti";
    if (labelLower.includes('svalutazionieaccantonamenti')) return "svalutazioni";

    if (cleanLabel.includes("GESTIONE FINANZIARIA")) return "gestioneFinanziaria";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";
    if (cleanLabel.includes("RISULTATO") || cleanLabel.includes("UTILE") || cleanLabel.includes("EBT")) return "risultatoEsercizio";

    // Generic
    if (cleanLabel.includes("TOTALE RICAVI")) return "totaleRicavi";
    if (cleanLabel.includes("RISULTATO") && cleanLabel.includes("ESERCIZIO")) return "risultatoEsercizio";
    if (cleanLabel.includes("UTILE") && cleanLabel.includes("PERDITA")) return "risultatoEsercizio";
    if (cleanLabel === "AMMORTAMENTI") return "ammortamenti";
    if (cleanLabel.includes("EBITDA") || cleanLabel.includes("MARGINEMOL")) return "ebitda";

    if (cleanLabel.includes("TOTALE COSTI FISSI")) return "totaleGestioneStruttura";
    if (cleanLabel.includes("TOTALECOSTIFISSI")) return "totaleGestioneStruttura";
    if (cleanLabel.includes("COSTI SERVIZI")) return "costiServizi";
    if (cleanLabel.includes("COSTI DEL PERSONALE")) return "personale";

    return null;
};

testMappings();

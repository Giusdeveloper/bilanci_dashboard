
import { ExcelParser } from '../client/src/utils/excelParser';
import * as fs from 'fs';
import * as path from 'path';

// MOCKING UI LOGIC FROM import-data.tsx
const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx`;

function simulateUIImport() {
    console.log("=== SIMULATING UI IMPORT LOGIC ===\n");
    const buffer = fs.readFileSync(EXCEL_PATH);
    const parser = new ExcelParser(buffer.toString('binary'));

    const ceDettaglio = parser.parseCEDettaglio();
    if (!ceDettaglio || !ceDettaglio.progressivo2025) {
        console.error("❌ Failed to parse CE Dettaglio");
        return;
    }

    const d = ceDettaglio.progressivo2025;
    console.log("Parsed Data Keys found:", Object.keys(d).length);

    const ricavi = d.totaleRicavi || d.ricaviCaratteristici || 0;
    const ebitda = d.ebitda || 0;

    // THE UPDATED SUMMATION LOGIC
    let costiCalc = (d.costiMateriePrime || 0) +
        (d.costiServizi || 0) +
        (d.serviziDiretti || 0) +
        (d.consulenzeDirette || 0) +
        (d.serviziInformatici || 0) +
        (d.serviziCloud || 0) +
        (d.altriServizi || 0) +
        (d.godimentoBeniTerzi || 0) +
        (d.personale || 0) +
        (d.compensiAmministratore || 0) +
        (d.speseCommerciali || 0) +
        (d.speseGenerali || 0) +
        (d.speseStruttura || 0) +
        (d.totaleGestioneStruttura || 0);

    const checkDiff = Math.abs(costiCalc - (ricavi - ebitda));
    let finalCosti = costiCalc;

    // Fallback logic from UI
    if (checkDiff > 100) {
        console.log(`⚠️ Mismatch detected (Calc: ${costiCalc}, Implied: ${ricavi - ebitda}). UI would fallback.`);
        // Note: In UI the fallback is: costi = ricavi - ebitda;
        // checking if our new sum is closer or if we should trust the fallback.
    }

    console.log("--- RESULTS ---");
    console.log(`Ricavi: ${ricavi}`);
    console.log(`EBITDA: ${ebitda}`);
    console.log(`Costi (Summation): ${costiCalc}`);
    console.log(`Costi (Implied): ${ricavi - ebitda}`);

    // Check specific keys
    console.log(`Servizi Informatici: ${d.serviziInformatici}`);
    console.log(`Compensi Amministratore: ${d.compensiAmministratore}`);
    console.log(`Spese Commerciali: ${d.speseCommerciali}`);
}

simulateUIImport();


import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SHERPA_SLUG = 'sherpa42';
const EXCEL_PATH = String.raw`c:\Users\b_epp\OneDrive\Desktop\Lavoro\Development\bilanci_dashboard\import_data\(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx`;

async function importSherpaDataV3() {
    console.log("=== SHERPA42 IMPORT V3 (MAPPING FIX) ===\n");

    const { data: company } = await supabase.from('companies').select('*').eq('slug', SHERPA_SLUG).single();
    if (!company) throw new Error("Company not found");

    // 1. DELETE EXISTING DATA
    console.log("🗑️ Deleting existing records for 2025/12...");
    await supabase.from('financial_data').delete().eq('company_id', company.id).eq('year', 2025).eq('month', 12);

    // 2. PARSE EXCEL
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('sintetico')) || workbook.SheetNames[0];
    const rawData: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const COL_VOICE = 0;
    const COL_2025 = 13;
    const COL_2024 = 29;

    let progressivo2025: any = {};
    let progressivo2024: any = {};

    // Helper to extract value
    const getVal = (row: any[], index: number) => (typeof row[index] === 'number' ? row[index] : 0);

    // MAPPING INITIALIZATION with defaults
    const keys = [
        "ricaviCaratteristici", "altriRicavi", "totaleRicavi", "serviziDiretti", "consulenzeDirette",
        "serviziInformatici", "serviziCloud", "costiDiretti", "altriServizi", "costiIndiretti",
        "totaleCostiDirettiIndiretti", "grossProfit", "autofatture", "rimborsiSpese", "altriProventi",
        "ricaviNonTipici", "speseViaggio", "pedaggi", "pubblicita", "materialePubblicitario", "omaggi",
        "speseRappresentanza", "mostreFiere", "serviziCommerciali", "carburante", "speseCommerciali",
        "beniIndeducibili", "speseGenerali", "materialeConsumo", "spesePulizia", "utenze", "assicurazioni",
        "rimanenze", "tasseValori", "sanzioniMulte", "compensiAmministratore", "rimborsiAmministratore",
        "personale", "serviziAmministrativi", "serviziAmministrativiPaghe", "consulenzeTecniche",
        "consulenzeLegali", "locazioniNoleggi", "serviziIndeducibili", "utiliPerditeCambi",
        "perditeSuCrediti", "licenzeUso", "utenzeTelefoniche", "altriOneri", "abbuoniArrotondamenti",
        "speseStruttura", "totaleGestioneStruttura", "ebitda", "ammortamentiImmateriali",
        "ammortamentiMateriali", "svalutazioni", "totaleAmmortamenti", "gestioneStraordinaria",
        "ebit", "speseCommissioniBancarie", "interessiPassiviMutui", "altriInteressi",
        "gestioneFinanziaria", "ebt", "imposteDirette", "risultatoEsercizio"
    ];
    keys.forEach(k => { progressivo2025[k] = 0; progressivo2024[k] = 0; });

    // DASHBOARD SUMMARY LIST
    const summary: any[] = [];

    // --- MANUAL ROW ITERATION & MAPPING ---
    for (const row of rawData) {
        if (!row || row.length === 0) continue;
        const voice = String(row[COL_VOICE]).trim();
        const v25 = getVal(row, COL_2025);
        const v24 = getVal(row, COL_2024);

        if (!voice || voice === 'Unknown') continue;

        // Build Dashboard Summary
        if ((v25 !== 0 || v24 !== 0) && !voice.toLowerCase().includes('costi fissi')) {
            summary.push({ voce: voice, value2025: v25, value2024: v24, percentage: 0 }); // percent fixed later
        }

        // --- MAP TO CE DETTAGLIO KEYS ---
        // Loose matching based on known Sherpa rows
        const lowerVoice = voice.toLowerCase().replace(/\s+/g, '');

        if (lowerVoice.includes('ricavidaconsulenza') || lowerVoice.includes('ricavicaratteristici') || lowerVoice.includes('1-totalericavi')) {
            progressivo2025.ricaviCaratteristici = v25; progressivo2024.ricaviCaratteristici = v24;
        }
        else if (lowerVoice.includes('totalericavi')) { // Catch-all total
            progressivo2025.totaleRicavi = v25; progressivo2024.totaleRicavi = v24;
        }
        else if (lowerVoice.includes('costiboard')) {
            progressivo2025.compensiAmministratore = v25; progressivo2024.compensiAmministratore = v24;
        }
        // Mapping "Costo IT/Tool" -> serviziInformatici
        else if (lowerVoice.includes('costoit') || lowerVoice.includes('tool')) {
            progressivo2025.serviziInformatici = v25; progressivo2024.serviziInformatici = v24;
        }
        else if (lowerVoice.includes('spesecommercialie')) {
            progressivo2025.speseCommerciali = v25; progressivo2024.speseCommerciali = v24;
        }
        else if (lowerVoice.includes('spesedistruttura')) {
            progressivo2025.speseStruttura = v25; progressivo2024.speseStruttura = v24;
        }
        else if (lowerVoice.includes('speseperbenefit')) {
            progressivo2025.personale += v25; progressivo2024.personale += v24;
        }
        else if (lowerVoice.includes('ebitda') || lowerVoice.includes('marginemol')) {
            progressivo2025.ebitda = v25; progressivo2024.ebitda = v24;
        }
        else if (lowerVoice.includes('ebit') && !lowerVoice.includes('ebitda')) {
            progressivo2025.ebit = v25; progressivo2024.ebit = v24;
        }
        else if (lowerVoice.includes('utile') || lowerVoice.includes('risultatodesercizio')) {
            progressivo2025.risultatoEsercizio = v25; progressivo2024.risultatoEsercizio = v24;
        }
        // Fill Totals to ensure structure validity
        else if (lowerVoice.includes('totalecostifissi')) {
            progressivo2025.totaleGestioneStruttura = v25; progressivo2024.totaleGestioneStruttura = v24;
        }
        else if (lowerVoice.includes('ammortamenti')) {
            progressivo2025.totaleAmmortamenti += v25; progressivo2024.totaleAmmortamenti += v24;
        }
    }

    // Post-Process Percentages for Summary
    const totalRev = progressivo2025.totaleRicavi || progressivo2025.ricaviCaratteristici || 1;
    summary.forEach(s => {
        s.percentage = totalRev ? (s.value2025 / totalRev) * 100 : 0;
    });

    // KPI Object
    const kpis = {
        ricavi2025: progressivo2025.totaleRicavi || progressivo2025.ricaviCaratteristici,
        ricavi2024: progressivo2024.totaleRicavi || progressivo2024.ricaviCaratteristici,
        costi2025: (progressivo2025.totaleRicavi || 0) - (progressivo2025.ebitda || 0),
        costi2024: (progressivo2024.totaleRicavi || 0) - (progressivo2024.ebitda || 0),
        ebitda2025: progressivo2025.ebitda,
        ebitda2024: progressivo2024.ebitda,
        risultato2025: progressivo2025.risultatoEsercizio,
        risultato2024: progressivo2024.risultatoEsercizio,
        margineEbitda2025: 0,
        margineEbitda2024: 0
    };
    if (kpis.ricavi2025) kpis.margineEbitda2025 = (kpis.ebitda2025 / kpis.ricavi2025) * 100;
    if (kpis.ricavi2024) kpis.margineEbitda2024 = (kpis.ebitda2024 / kpis.ricavi2024) * 100;

    // Monthly Trend (Same as V2)
    const monthlyTrend = { labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'], ricavi: [] as number[], ebitda: [] as number[] };
    // Reuse logic...
    const ricaviRow = rawData.find(r => String(r[COL_VOICE]).includes('Totale Ricavi') || String(r[COL_VOICE]).includes('RICAVI CARATTERISTICI'));
    const ebitdaRow = rawData.find(r => String(r[COL_VOICE]).toLowerCase().includes('ebitda'));
    if (ricaviRow) for (let i = 1; i <= 12; i++) monthlyTrend.ricavi.push(Number(ricaviRow[i]) || 0);
    if (ebitdaRow) for (let i = 1; i <= 12; i++) monthlyTrend.ebitda.push(Number(ebitdaRow[i]) || 0);


    // 3. INSERT DASHBOARD
    await supabase.from('financial_data').insert({
        company_id: company.id,
        data_type: 'dashboard',
        year: 2025,
        month: 12,
        data: { kpis, summary, monthlyTrend }
    });
    console.log("✅ Dashboard Inserted.");

    // 4. INSERT CE DETTAGLIO (Correct Structure)
    await supabase.from('financial_data').insert({
        company_id: company.id,
        data_type: 'ce-dettaglio',
        year: 2025,
        month: 12,
        data: {
            progressivo2025,
            progressivo2024
            // items: summary // REMOVED - incompatible with page
        }
    });
    console.log("✅ CE Dettaglio Inserted (Mapped Structure).");
}

importSherpaDataV3().catch(console.error);

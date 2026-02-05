
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

async function importSherpaData() {
    console.log("=== SHERPA42 FINAL RE-IMPORT (DEC 2025) ===\n");

    // 1. Get Company
    const { data: company } = await supabase.from('companies').select('*').eq('slug', SHERPA_SLUG).single();
    if (!company) { throw new Error("Sherpa42 company not found"); }
    console.log(`✅ Company: ${company.name}`);

    // 2. Read Excel
    if (!fs.existsSync(EXCEL_PATH)) { throw new Error("Excel file not found"); }
    const workbook = XLSX.readFile(EXCEL_PATH);

    // --- PART A: DASHBOARD (CE Sintetico) ---
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('sintetico')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n📊 Parsing Sheet for Dashboard: ${sheetName}`);

    const summary: any[] = [];
    let kpis: any = {};

    const COL_VOICE = 0;
    const COL_2025 = 13;
    const COL_2024_VAL = 29;

    let ricavi2025 = 0;
    let ricavi2024 = 0;
    let ebitda2025 = 0;
    let ebitda2024 = 0;
    let risultato2025 = 0;
    let risultato2024 = 0;
    let costs2025 = 0;
    let costs2024 = 0;

    for (const row of rawData) {
        if (!row || row.length === 0) continue;
        const voice = String(row[COL_VOICE]).trim();
        if (!voice || voice === 'Unknown' || voice.match(/^Changes/)) continue;

        // Extract values
        const val25 = typeof row[COL_2025] === 'number' ? row[COL_2025] : 0;
        const val24 = typeof row[COL_2024_VAL] === 'number' ? row[COL_2024_VAL] : 0;

        // Skip header-like rows
        if (voice.toLowerCase().includes('costi fissi') && val25 === 0) continue;

        if (voice === 'Totale Ricavi' || voice === 'Totale Valore della Produzione' || voice === 'RICAVI CARATTERISTICI') {
            ricavi2025 = val25;
            ricavi2024 = val24;
        }
        if (voice === 'EBITDA' || voice === 'Margine Operativo Lordo') {
            ebitda2025 = val25;
            ebitda2024 = val24;
        }
        if (voice === 'Risultato d\'esercizio' || voice === 'Utile/Perdita') {
            risultato2025 = val25;
            risultato2024 = val24;
        }

        if (val25 !== 0 || val24 !== 0) {
            summary.push({
                voce: voice,
                value2025: val25,
                value2024: val24,
                percentage: ricavi2025 ? (val25 / ricavi2025) * 100 : 0
            });
        }
    }

    costs2025 = ricavi2025 - ebitda2025;
    costs2024 = ricavi2024 - ebitda2024;

    kpis = {
        ricavi2025, ricavi2024,
        costi2025: costs2025, // Fixed mapping
        costi2024: costs2024, // Fixed mapping
        ebitda2025, ebitda2024,
        risultato2025, risultato2024,
        margineEbitda2025: ricavi2025 ? (ebitda2025 / ricavi2025) * 100 : 0,
        margineEbitda2024: ricavi2024 ? (ebitda2024 / ricavi2024) * 100 : 0,
    };

    // Calculate Monthly Trend
    const monthlyTrend = {
        labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
        ricavi: [] as number[],
        ebitda: [] as number[]
    };

    const ricaviRow = rawData.find(r => String(r[COL_VOICE]).trim() === 'Totale Ricavi' || String(r[COL_VOICE]).trim() === 'RICAVI CARATTERISTICI');
    const ebitdaRow = rawData.find(r => String(r[COL_VOICE]).trim() === 'EBITDA' || String(r[COL_VOICE]).trim() === 'Margine Operativo Lordo');

    if (ricaviRow) {
        for (let i = 1; i <= 12; i++) monthlyTrend.ricavi.push(Number(ricaviRow[i]) || 0);
    }
    if (ebitdaRow) {
        for (let i = 1; i <= 12; i++) monthlyTrend.ebitda.push(Number(ebitdaRow[i]) || 0);
    }


    // SAVE DASHBOARD DATA
    console.log(`\n💾 Upserting Dashboard Data (Summary Rows: ${summary.length})...`);
    console.log(`   KPIs Preview: Ricavi25=${kpis.ricavi2025}, EBITDA25=${kpis.ebitda2025}`);

    await supabase.from('financial_data').upsert({
        company_id: company.id,
        data_type: 'dashboard',
        year: 2025,
        month: 12,
        data: {
            kpis,
            summary,
            monthlyTrend
        }
    }, { onConflict: 'company_id, year, month, data_type' });


    // --- PART B: CE DETTAGLIO ---
    console.log(`\n💾 Upserting CE Dettaglio...`);
    await supabase.from('financial_data').upsert({
        company_id: company.id,
        data_type: 'ce-dettaglio',
        year: 2025,
        month: 12,
        data: {
            items: summary
        }
    }, { onConflict: 'company_id, year, month, data_type' });

    console.log("\n✅ IMPORT COMPLETE!");
}

importSherpaData().catch(e => console.error("FATAL:", e));

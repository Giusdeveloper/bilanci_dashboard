
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

async function importSherpaDataV2() {
    console.log("=== SHERPA42 IMPORT V2 (CLEAN INSERT) ===\n");

    const { data: company } = await supabase.from('companies').select('*').eq('slug', SHERPA_SLUG).single();
    if (!company) throw new Error("Company not found");

    // 1. DELETE EXISTING DATA for Dec 2025
    console.log("🗑️ Deleting existing records for 2025/12...");
    const { error: delError } = await supabase.from('financial_data')
        .delete()
        .eq('company_id', company.id)
        .eq('year', 2025)
        .eq('month', 12);

    if (delError) console.error("Error deleting:", delError);
    else console.log("✅ Records deleted.");

    // 2. PARSE EXCEL
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('sintetico')) || workbook.SheetNames[0];
    const rawData: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const summary: any[] = [];
    const COL_VOICE = 0;
    const COL_2025 = 13;
    const COL_2024_VAL = 29;

    let ricavi2025 = 0;
    let ricavi2024 = 0;
    // ... other KPI vars ...
    let ebitda2025 = 0, ebitda2024 = 0, risultato2025 = 0, risultato2024 = 0;

    for (const row of rawData) {
        if (!row || row.length === 0) continue;
        const voice = String(row[COL_VOICE]).trim();
        if (!voice || voice === 'Unknown' || voice.match(/^Changes/)) continue;

        const val25 = typeof row[COL_2025] === 'number' ? row[COL_2025] : 0;
        const val24 = typeof row[COL_2024_VAL] === 'number' ? row[COL_2024_VAL] : 0;

        if (voice.toLowerCase().includes('costi fissi') && val25 === 0) continue;

        if (voice === 'Totale Ricavi' || voice === 'Totale Valore della Produzione' || voice === 'RICAVI CARATTERISTICI') {
            ricavi2025 = val25; ricavi2024 = val24;
        }
        if (voice === 'EBITDA' || voice === 'Margine Operativo Lordo') {
            ebitda2025 = val25; ebitda2024 = val24;
        }
        if (voice === 'Risultato d\'esercizio' || voice === 'Utile/Perdita') {
            risultato2025 = val25; risultato2024 = val24;
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

    const kpis = {
        ricavi2025, ricavi2024,
        costi2025: ricavi2025 - ebitda2025,
        costi2024: ricavi2024 - ebitda2024,
        ebitda2025, ebitda2024,
        risultato2025, risultato2024,
        margineEbitda2025: ricavi2025 ? (ebitda2025 / ricavi2025) * 100 : 0,
        margineEbitda2024: ricavi2024 ? (ebitda2024 / ricavi2024) * 100 : 0,
    };

    const monthlyTrend = {
        labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
        ricavi: [] as number[],
        ebitda: [] as number[]
    };

    // Simplistic fill
    const ricaviRow = rawData.find(r => String(r[COL_VOICE]).trim() === 'Totale Ricavi' || String(r[COL_VOICE]).trim() === 'RICAVI CARATTERISTICI');
    const ebitdaRow = rawData.find(r => String(r[COL_VOICE]).trim() === 'EBITDA' || String(r[COL_VOICE]).trim() === 'Margine Operativo Lordo');
    if (ricaviRow) for (let i = 1; i <= 12; i++) monthlyTrend.ricavi.push(Number(ricaviRow[i]) || 0);
    if (ebitdaRow) for (let i = 1; i <= 12; i++) monthlyTrend.ebitda.push(Number(ebitdaRow[i]) || 0);

    console.log(`Prepared Data: Summary=${summary.length}, TrendRicavi=${monthlyTrend.ricavi.length}`);

    // 3. INSERT NEW DATA
    const { data: insData, error: insError } = await supabase.from('financial_data')
        .insert({
            company_id: company.id,
            data_type: 'dashboard',
            year: 2025,
            month: 12,
            data: { kpis, summary, monthlyTrend }
        })
        .select();

    if (insError) console.error("❌ Dashboard Insert Error:", insError);
    else console.log("✅ Dashboard Inserted. ID:", insData[0].id);

    await supabase.from('financial_data').insert({
        company_id: company.id,
        data_type: 'ce-dettaglio',
        year: 2025,
        month: 12,
        data: { items: summary }
    });
    console.log("✅ CE Dettaglio Inserted.");
}

importSherpaDataV2().catch(console.error);

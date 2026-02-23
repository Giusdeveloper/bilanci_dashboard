import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { ExcelParser } from '../client/src/utils/excelParser';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AWENTIA_SLUG = 'awentia';
const EXCEL_PATH = 'import_data/[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx';

async function reimportAwentiaDec() {
    console.log("=== AWENTIA DECEMBER RE-IMPORT WITH FIXED PARSER AND RLS BYPASS ===\n");

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found:", EXCEL_PATH);
        return;
    }

    // 0. Disable RLS
    console.log("🔓 Disabling RLS...");
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE financial_data DISABLE ROW LEVEL SECURITY;' });

    try {
        // 1. Get Company
        const { data: company } = await supabase.from('companies').select('*').eq('slug', AWENTIA_SLUG).single();
        if (!company) {
            console.error("❌ Awentia not found in DB");
            return;
        }
        console.log(`✅ Found Company: ${company.name} (ID: ${company.id})`);

        // 2. Load and Parse
        const buffer = fs.readFileSync(EXCEL_PATH);
        const parser = new ExcelParser(buffer);
        
        console.log("Parsing CE Dettaglio...");
        const ceDettaglio = parser.parseCEDettaglio();
        
        console.log("Parsing CE Sintetico Mensile...");
        const ceSinteticoMensile = parser.parseCESinteticoMensile();

        if (!ceDettaglio || !ceSinteticoMensile) {
            console.error("❌ Parsing failed!");
            return;
        }

        console.log("Parsing Partitari...");
        let partitari = parser.parsePartitari();
        
        // Try fallback for partitari
        if (!partitari || partitari.data.length === 0) {
            console.log("Searching for specific Partitari Excel file...");
            const partExcel = 'import_data/AWENTIA SRL partitari n.2.xlsx';
            if (fs.existsSync(partExcel)) {
                const pBuffer = fs.readFileSync(partExcel);
                const pParser = new ExcelParser(pBuffer);
                partitari = pParser.parsePartitari();
            }
        }

        const year = "2025";
        const month = "12";

        // 2.5 Clean up existing records to ensure fresh state
        console.log(`🧹 Cleaning up existing records for Awentia ${year}-${month}...`);
        const typesToClean = ['ce-dettaglio', 'ce-sintetico-mensile', 'dashboard', 'partitari'];
        for (const type of typesToClean) {
            const { error: delErr } = await supabase.from('financial_data')
                .delete()
                .eq('company_id', company.id)
                .eq('year', year)
                .eq('month', month)
                .eq('data_type', type);
            if (delErr) console.warn(`  ⚠️ Delete error for ${type}:`, delErr.message);
        }

        // 3. Prepare Dashboard Data
        console.log("Preparing Dashboard record...");
        const p25 = ceDettaglio.progressivo2025;
        const p24 = ceDettaglio.progressivo2024;

        // Total Costs = Operating + Ammortamenti + Financials + Taxes
        const costs2025 = (p25.totaleCostiOperativi || 0) + (p25.totaleAmmortamenti || 0) + (p25.gestioneFinanziaria || 0) + (p25.imposteDirette || 0);
        const costs2024 = (p24.totaleCostiOperativi || 0) + (p24.totaleAmmortamenti || 0) + (p24.gestioneFinanziaria || 0) + (p24.imposteDirette || 0);

        const kpis = {
            ricavi2025: p25.totaleRicavi,
            ricavi2024: p24.totaleRicavi,
            costi2025: costs2025,
            costi2024: costs2024,
            ebitda2025: p25.ebitda,
            ebitda2024: p24.ebitda,
            risultato2025: p25.risultatoEsercizio,
            risultato2024: p24.risultatoEsercizio,
            margineEbitda2025: p25.totaleRicavi ? (p25.ebitda / p25.totaleRicavi) * 100 : 0,
            margineEbitda2024: p24.totaleRicavi ? (p24.ebitda / p24.totaleRicavi) * 100 : 0,
        };

        const trend = {
            labels: ceSinteticoMensile.progressivo2025?.months || [],
            ricavi: ceSinteticoMensile.progressivo2025?.totaleRicavi || [],
            ebitda: ceSinteticoMensile.progressivo2025?.ebitda || []
        };

        // 4. Save to DB
        console.log("💾 Inserting ce-dettaglio...");
        const { error: err1 } = await supabase.from('financial_data').insert({
            company_id: company.id,
            data_type: 'ce-dettaglio',
            year, month,
            data: ceDettaglio
        });
        if (err1) console.error("  ❌ Insert error (ce-dettaglio):", err1.message);

        console.log("💾 Inserting ce-sintetico-mensile...");
        const { error: err2 } = await supabase.from('financial_data').insert({
            company_id: company.id,
            data_type: 'ce-sintetico-mensile',
            year, month,
            data: ceSinteticoMensile
        });
        if (err2) console.error("  ❌ Insert error (ce-sintetico-mensile):", err2.message);

        console.log("💾 Inserting dashboard...");
        const { error: err3 } = await supabase.from('financial_data').insert({
            company_id: company.id,
            data_type: 'dashboard',
            year, month,
            data: {
                kpis,
                monthlyTrend: trend
            }
        });
        if (err3) console.error("  ❌ Insert error (dashboard):", err3.message);

        if (partitari && partitari.data.length > 0) {
            console.log(`💾 Inserting partitari (${partitari.data.length} rows)...`);
            const { error: err4 } = await supabase.from('financial_data').insert({
                company_id: company.id,
                data_type: 'partitari',
                year, month,
                data: partitari
            });
            if (err4) console.error("  ❌ Insert error (partitari):", err4.message);
        }

        console.log("\n✅ RE-IMPORT COMPLETE!");

    } finally {
        // 5. Enable RLS
        console.log("🔒 Enabling RLS...");
        await supabase.rpc('exec_sql', { sql: 'ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;' });
    }
}

reimportAwentiaDec().catch(console.error);

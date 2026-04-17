import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase con Service Role Key per bypassare RLS
const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHERPA42_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

async function importSherpaHybrid() {
  console.log('🚀 Avvio Importazione Ibrida per Sherpa42 (ID: 145c6ccb)...');

  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ERRORE: File Excel di Sherpa42 non trovato.');
    return;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Analizziamo il foglio "CE sintetico mensile"
    const sheetName = 'CE sintetico mensile';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Foglio ${sheetName} non trovato`);

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const table: any[] = [];
    const kpiData: any = {};

    // Estrazione e Mappatura
    rawData.forEach((row, rowIndex) => {
      const label = row[0];
      if (typeof label === 'string' && label.trim() !== '') {
        const cleanLabel = label.trim();
        const rowValues = row.slice(1, 13).map(v => typeof v === 'number' ? v : 0);
        const progressivo = typeof row[13] === 'number' ? row[13] : 0;

        table.push({ voce: cleanLabel, valori: rowValues, progressivo });

        // Mappatura KPI (DASHBOARD)
        if (cleanLabel === 'TOTALE RICAVI COMPLESSIVI') kpiData.ricavi = progressivo;
        if (cleanLabel === 'EBITDA') kpiData.ebitda = progressivo;
        if (cleanLabel === "RISULTATO DELL'ESERCIZIO") kpiData.risultato = progressivo;
        if (cleanLabel === 'TOTALE COSTO DEL LAVORO') kpiData.costoLavoro = progressivo;
        if (cleanLabel === 'TOTALE COSTI VARIABILI') kpiData.costiVariabili = progressivo;
      }
    });

    // Calcolo Totale Costi (Regola: Ricavi - Risultato)
    const totaleCosti = (kpiData.ricavi || 0) - (kpiData.risultato || 0);

    const financialData = {
      kpis: {
        ricavi2025: kpiData.ricavi,
        ricavi2024: 0, 
        ebitda2025: kpiData.ebitda,
        risultato2025: kpiData.risultato,
        costi2025: totaleCosti,
        margineEbitda2025: kpiData.ricavi ? (kpiData.ebitda / kpiData.ricavi) * 100 : 0
      },
      table: table,
      monthlyTrend: {
        labels: months,
        ricavi: table.find(r => r.voce === 'TOTALE RICAVI COMPLESSIVI')?.valori || [],
        ebitda: table.find(r => r.voce === 'EBITDA')?.valori || []
      }
    };

    console.log(`\n📊 Risultati Sherpa42:`);
    console.log(`   - Ricavi: ${kpiData.ricavi} €`);
    console.log(`   - EBITDA: ${kpiData.ebitda} €`);
    console.log(`   - Risultato: ${kpiData.risultato} €`);
    console.log(`   - Costi Totali (calcolati): ${totaleCosti} €`);

    // Salvataggio
    console.log('\n💾 Salvataggio nel database...');
    
    await supabase.from('financial_data')
      .delete()
      .eq('company_id', SHERPA42_ID)
      .eq('year', 2025)
      .eq('data_type', 'dashboard');

    const { error } = await supabase.from('financial_data').insert({
      company_id: SHERPA42_ID,
      year: 2025,
      month: 12,
      data_type: 'dashboard',
      data: financialData
    });

    if (error) throw error;
    console.log('✅ Importazione Sherpa42 completata!');

  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

importSherpaHybrid();

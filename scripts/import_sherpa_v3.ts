import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHERPA42_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

async function importSherpaDynamic() {
  console.log('🚀 Avvio Importazione DINAMICA SINTETICA per Sherpa42...');

  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets['CE sintetico mensile'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    const summaryTable: any[] = [];
    let totaleRicavi = 0;
    const kpiData: any = {};

    // 1. Trova Totale Ricavi
    rawData.forEach(row => {
      if (row[0] === 'TOTALE RICAVI COMPLESSIVI') totaleRicavi = row[13];
    });

    // 2. Costruisci Tabella con Tag per Filtro
    rawData.forEach((row, index) => {
      const label = row[0];
      if (typeof label === 'string' && label.trim() !== '' && index > 2) {
        const cleanLabel = label.trim();
        const value2025 = typeof row[13] === 'number' ? row[13] : 0;
        
        // REGOLA DI CLASSIFICAZIONE (Per decidere cosa mostrare in Dashboard)
        let type = 'normal'; // Di default è una voce di dettaglio (da nascondere in dashboard)
        
        // Se è tutto maiuscolo (tipico di Sherpa per i subtotali) o contiene parole chiave
        const isUpperCase = cleanLabel === cleanLabel.toUpperCase() && cleanLabel.length > 3;
        const isTotalKeyword = cleanLabel.toLowerCase().includes('totale') || cleanLabel.toLowerCase().includes('margine');
        const isKeyMetric = ['EBITDA', 'EBIT', 'EBT', 'MOL'].some(k => cleanLabel.includes(k));
        const isResult = cleanLabel.toLowerCase().includes('risultato');

        if (isUpperCase || isTotalKeyword || isKeyMetric || isResult) {
          if (isResult) type = 'result';
          else if (isKeyMetric) type = 'key-metric';
          else type = 'total'; // Subtotale o Totale
        }

        summaryTable.push({
          voce: cleanLabel,
          value2025: value2025,
          percentage: totaleRicavi ? (value2025 / totaleRicavi) * 100 : 0,
          value2024: 0,
          type: type
        });

        if (cleanLabel === 'TOTALE RICAVI COMPLESSIVI') kpiData.ricavi = value2025;
        if (cleanLabel === 'EBITDA') kpiData.ebitda = value2025;
        if (cleanLabel === "RISULTATO DELL'ESERCIZIO") kpiData.risultato = value2025;
      }
    });

    const financialData = {
      kpis: {
        ricavi2025: kpiData.ricavi,
        ebitda2025: kpiData.ebitda,
        risultato2025: kpiData.risultato,
        costi2025: (kpiData.ricavi || 0) - (kpiData.risultato || 0),
        margineEbitda2025: kpiData.ricavi ? (kpiData.ebitda / kpiData.ricavi) * 100 : 0
      },
      summary: summaryTable,
      monthlyTrend: {
        labels: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
        ricavi: rawData.find(r => r[0] === 'TOTALE RICAVI COMPLESSIVI')?.slice(1, 13) || [],
        ebitda: rawData.find(r => r[0] === 'EBITDA')?.slice(1, 13) || []
      }
    };

    await supabase.from('financial_data').delete().eq('company_id', SHERPA42_ID).eq('data_type', 'dashboard');
    await supabase.from('financial_data').insert({
      company_id: SHERPA42_ID,
      year: 2025,
      month: 12,
      data_type: 'dashboard',
      data: financialData
    });

    console.log('✅ Importazione SINTETICA completata!');
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

importSherpaDynamic();

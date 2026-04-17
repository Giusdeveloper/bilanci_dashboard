import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHERPA42_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

async function importSherpaComplete() {
  console.log('🚀 Avvio Importazione COMPLETA Sherpa42 (Dashboard Fix)...');

  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const data = XLSX.utils.sheet_to_json(workbook.Sheets['CE sintetico mensile'], { header: 1, defval: null }) as any[][];

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const dynamicRows: any[] = [];
  
  const dashboardWhiteList = [
    'RICAVI CARATTERISTICI', 'RICAVI NON CARATTERISTICI', 'TOTALE RICAVI COMPLESSIVI',
    'TOTALE COSTI VARIABILI', 'PRIMO MARGINE', 'TOTALE COSTO DEL LAVORO',
    'TOTALE COSTI FISSI GESTIONE CARATTERISTICA', 'TOTALE COSTI FISSI', 'EBITDA',
    'AMMORTAMENTI,ACCANT.SVALUTAZIONI', 'GESTIONE STRAORDINARIA', 'EBIT',
    'GESTIONE FINANZIARIA', 'EBT', 'Imposte dirette', "RISULTATO DELL'ESERCIZIO"
  ];

  let ricavi25 = 0, ebitda25 = 0, risultato25 = 0;

  data.forEach((row, index) => {
    const label = row[0];
    if (typeof label === 'string' && label.trim() !== '' && index > 2) {
      const cleanLabel = label.trim();
      const v25 = typeof row[13] === 'number' ? row[13] : 0;
      
      let type = 'normal';
      if (dashboardWhiteList.includes(cleanLabel)) {
        if (cleanLabel.includes('RISULTATO')) type = 'result';
        else if (['EBITDA', 'EBIT', 'EBT'].includes(cleanLabel)) type = 'key-metric';
        else type = 'total';
      }

      dynamicRows.push({
        voce: cleanLabel,
        valori: row.slice(1, 13).map(v => typeof v === 'number' ? v : 0),
        value2025: v25,
        value2024: 0,
        type: type
      });

      if (cleanLabel === 'TOTALE RICAVI COMPLESSIVI') ricavi25 = v25;
      if (cleanLabel === 'EBITDA') ebitda25 = v25;
      if (cleanLabel === "RISULTATO DELL'ESERCIZIO") risultato25 = v25;
    }
  });

  const financialData = {
    kpis: {
      ricavi2025: ricavi25,
      ricavi2024: 0, 
      ebitda2025: ebitda25,
      ebitda2024: 0,
      risultato2025: risultato25,
      risultato2024: 0,
      costi2025: ricavi25 - risultato25,
      costi2024: 0,
      margineEbitda2025: ricavi25 ? (ebitda25 / ricavi25) * 100 : 0,
      margineEbitda2024: 0
    },
    summary: dynamicRows.filter(r => r.type !== 'normal').map(r => ({
      voce: r.voce, value2025: r.value2025, value2024: 0, type: r.type, percentage: ricavi25 ? (r.value2025 / ricavi25) * 100 : 0
    })),
    monthlyTrend: {
      labels: months,
      ricavi: dynamicRows.find(r => r.voce === 'TOTALE RICAVI COMPLESSIVI')?.valori || [],
      ebitda: dynamicRows.find(r => r.voce === 'EBITDA')?.valori || []
    }
  };

  const ceData = { 
    progressivo2025: { isDynamic: true, months, rows: dynamicRows, totaleRicaviDic: ricavi25 }, 
    puntuale2025: { isDynamic: true, months, rows: dynamicRows.map(r => ({ ...r, valori: r.valori })) }, // Inseriamo puntuale
    progressivo2024: { rows: [] } 
  };

  await supabase.from('financial_data').delete().eq('company_id', SHERPA42_ID).eq('year', 2025);
  await supabase.from('financial_data').insert([
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'dashboard', data: financialData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-dettaglio-mensile', data: ceData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-dettaglio', data: ceData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-sintetico-mensile', data: ceData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-sintetico', data: ceData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'source', data: XLSX.utils.sheet_to_json(workbook.Sheets['SOURCE'], { header: 1, defval: null }) }
  ]);

  console.log('✅ Sherpa42 Dashboard KPI Fix completato!');
}

importSherpaComplete();

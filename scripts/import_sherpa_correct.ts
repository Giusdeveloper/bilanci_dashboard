import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHERPA42_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

async function importSherpaCorrect() {
  console.log('🚀 Avvio Importazione Sherpa42 con struttura REALE...');

  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets['CE sintetico mensile'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 }) as any[][];

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const rows: any[] = [];
  
  // Identifichiamo le righe speciali per lo stile
  const totalKeywords = ['TOTALE', 'RICAVI CARATTERISTICI', 'PRIMO MARGINE'];
  const keyMetricKeywords = ['EBITDA', 'EBIT', 'EBT', 'RISULTATO'];

  let ricavi25 = 0, ebitda25 = 0, risultato25 = 0;

  // Analizziamo dalla riga 3 in poi (saltando header e date)
  for (let i = 3; i < rawData.length; i++) {
    const label = rawData[i][0];
    if (typeof label !== 'string' || label.trim() === '') continue;
    
    const cleanLabel = label.trim();
    const valoriMensili = rawData[i].slice(1, 13).map(v => typeof v === 'number' ? v : 0);
    const value2025 = typeof rawData[i][13] === 'number' ? rawData[i][13] : 0;

    let type = 'normal';
    const labelUpper = cleanLabel.toUpperCase();
    if (keyMetricKeywords.some(k => labelUpper.includes(k))) type = 'key-metric';
    else if (totalKeywords.some(k => labelUpper.includes(k))) type = 'total';

    rows.push({
      voce: cleanLabel,
      valori: valoriMensili,
      progressivo: value2025,
      type: type
    });

    if (cleanLabel === 'TOTALE RICAVI COMPLESSIVI') ricavi25 = value2025;
    if (cleanLabel === 'EBITDA') ebitda25 = value2025;
    if (cleanLabel === "RISULTATO DELL'ESERCIZIO") risultato25 = value2025;
  }

  const dashboardData = {
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
    summary: rows.filter(r => r.type !== 'normal').map(r => ({
      voce: r.voce, value2025: r.progressivo, value2024: 0, type: r.type, percentage: ricavi25 ? (r.progressivo / ricavi25) * 100 : 0
    })),
    monthlyTrend: {
      labels: months,
      ricavi: rows.find(r => r.voce === 'TOTALE RICAVI COMPLESSIVI')?.valori || [],
      ebitda: rows.find(r => r.voce === 'EBITDA')?.valori || []
    }
  };

  const ceSinteticoData = {
    progressivo2025: { isDynamic: true, months, rows: rows, totaleRicaviDic: ricavi25 },
    puntuale2025: { isDynamic: true, months, rows: rows },
    progressivo2024: { rows: [] }
  };

  // Puliamo i record sbagliati per Sherpa42
  console.log('🧹 Pulizia record errati per Sherpa42...');
  await supabase.from('financial_data').delete().eq('company_id', SHERPA42_ID).eq('year', 2025);

  // Inseriamo solo ciò che esiste: Dashboard e Sintetico
  await supabase.from('financial_data').insert([
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'dashboard', data: dashboardData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-sintetico-mensile', data: ceSinteticoData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'ce-sintetico', data: ceSinteticoData },
    { company_id: SHERPA42_ID, year: 2025, month: 12, data_type: 'source', data: XLSX.utils.sheet_to_json(sheet, { header: 1 }) }
  ]);

  console.log('✅ Sherpa42 importato correttamente con struttura REALE!');
}

importSherpaCorrect();

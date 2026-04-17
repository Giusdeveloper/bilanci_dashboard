import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient('https://caubhppwypkymsixsrco.supabase.co', serviceRoleKey);

async function crossCheck() {
  const SHERPA_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';
  console.log('🕵️ Inizio Controllo Incrociato SOURCE...');

  // 1. Leggi dal DB
  const { data: dbSource } = await supabase.from('financial_data')
    .select('data')
    .eq('company_id', SHERPA_ID)
    .eq('data_type', 'source')
    .limit(1);
  
  const dbRows = dbSource?.[0]?.data || [];
  console.log(`📊 Righe nel Database: ${dbRows.length}`);

  // 2. Leggi dall'Excel originale
  const fileBuffer = fs.readFileSync('import_data/(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets['SOURCE'], { header: 1, defval: null }) as any[][];
  console.log(`📊 Righe nell'Excel: ${excelRows.length}`);

  // 3. Campione di confronto
  console.log('\n--- CONFRONTO RIGA 10 ---');
  console.log('Excel:', JSON.stringify(excelRows[9]));
  console.log('DB   :', JSON.stringify(dbRows[9]));

  // 4. Cerca righe con dati che potrebbero mancare nel DB
  const rowsWithData = excelRows.filter(r => r.some(cell => typeof cell === 'number' && cell !== 0));
  console.log(`\n📈 Righe con dati numerici reali nell'Excel: ${rowsWithData.length}`);
  
  // Verifichiamo se il parser ha saltato qualcosa
  if (dbRows.length < excelRows.length) {
    console.warn('⚠️ ATTENZIONE: Il DB ha meno righe dell\'Excel. Possibile perdita dati nel JSONB?');
  }
}

crossCheck();

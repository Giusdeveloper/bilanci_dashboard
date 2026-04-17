import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHERPA42_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

async function importSherpaPartitari() {
  console.log('🚀 Avvio Importazione Partitari Sherpa42...');

  const filePath = path.join(process.cwd(), 'import_data', 'SHERPA SRL partitario 10 25.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = 'SHERPA SRL partitario';
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

  console.log(`📊 Totale righe trovate: ${data.length}`);

  // Filtro Conti Economici (58/ - 88/)
  const filteredData = data.filter(row => {
    const conto = row.CodiceConto?.toString() || '';
    // I codici conto economici di solito iniziano con 58, 60, 70, 80 ecc.
    // Filtriamo quelli che NON iniziano con 01/ 03/ 04/ (Immobilizzazioni) o 10/ (Crediti) o 20/ (Debiti)
    // O meglio, prendiamo esplicitamente l'intervallo economico
    const prefix = conto.substring(0, 2);
    const prefixNum = parseInt(prefix);
    return prefixNum >= 58 && prefixNum <= 88;
  });

  console.log(`✅ Righe dopo filtro conti economici (58/ - 88/): ${filteredData.length}`);

  if (filteredData.length === 0) {
    console.warn('⚠️ Nessuna riga trovata dopo il filtro economico!');
    return;
  }

  // Prepariamo l'header e i dati per il DB
  const headers = Object.keys(data[0]);
  const formattedData = {
    headers: headers,
    data: filteredData
  };

  // Eliminiamo vecchi partitari di Sherpa42 per il 2025
  await supabase.from('financial_data')
    .delete()
    .eq('company_id', SHERPA42_ID)
    .eq('data_type', 'partitari')
    .eq('year', 2025);

  // Inseriamo i nuovi dati (Mese 12 per coerenza con CE)
  const { error } = await supabase.from('financial_data').insert([
    {
      company_id: SHERPA42_ID,
      year: 2025,
      month: 12,
      data_type: 'partitari',
      data: formattedData
    }
  ]);

  if (error) {
    console.error('❌ Errore durante l\'inserimento in Supabase:', error);
  } else {
    console.log('✅ Partitari Sherpa42 caricati con successo!');
  }
}

importSherpaPartitari();

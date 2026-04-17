import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function debugSource() {
  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets['SOURCE'];
  
  if (!sheet) {
    console.error('❌ Foglio SOURCE non trovato');
    return;
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

  console.log('--- ESTRATTO FOGLIO SOURCE (Prime 10 righe) ---');
  data.slice(0, 10).forEach((row, i) => {
    console.log(`Riga ${i}:`, JSON.stringify(row));
  });
}

debugSource();

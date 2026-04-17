import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function list() {
  const fileBuffer = fs.readFileSync('import_data/(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  console.log('FOGLI:', workbook.SheetNames);
}
list();

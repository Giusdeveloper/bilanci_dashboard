import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function analyze() {
  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const data = XLSX.utils.sheet_to_json(workbook.Sheets['CE sintetico mensile'], { header: 1 }) as any[][];

  console.log('--- STRUTTURA SHERPA42 (CE SINTETICO) ---');
  data.forEach((row, i) => {
    if (row[0] && typeof row[0] === 'string') {
      console.log(`Riga ${i}: [${row[0]}]`);
    }
  });
}
analyze();

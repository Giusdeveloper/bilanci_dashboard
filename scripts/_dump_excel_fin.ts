import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const bytes = readFileSync('import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx');
const wb = XLSX.read(bytes, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets['1_CE dettaglio'], { header: 1, defval: null }) as unknown[][];

for (let i = 55; i < rows.length; i++) {
  const label = String(rows[i]?.[0] ?? '').trim();
  const val = rows[i]?.[2];
  if (label) console.log(`${i + 1}\t${label}\t${val}`);
}

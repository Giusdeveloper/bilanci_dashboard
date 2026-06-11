import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const bytes = readFileSync('import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx');
const wb = XLSX.read(bytes, { type: 'buffer' });
const sheet = wb.Sheets['1_CE dettaglio'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

let capture = false;
for (let i = 0; i < rows.length; i++) {
  const label = String(rows[i]?.[0] ?? '').trim();
  const val = rows[i]?.[2];
  if (/SPESE DI STRUTTURA|TOTALE GESTIONE|GROSS PROFIT|EBITDA|GESTIONE FINANZIARIA/i.test(label)) capture = true;
  if (/EBIT[^D]|AMMORTAMENTI/i.test(label) && !/EBITDA/i.test(label)) capture = false;
  if (capture && label) {
    console.log(`${i + 1}\t${label}\t${val}`);
  }
}

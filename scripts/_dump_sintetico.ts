import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

for (const f of [
  'import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx',
  'import_data/2026/[2026] Analisi Bilanci al 28 febbraio  Awentia.xlsx',
]) {
  const wb = XLSX.read(readFileSync(f), { type: 'buffer' });
  const sheet = wb.Sheets['3_CE sintetico'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  console.log('\n===', f.split('/').pop(), '===');
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const label = String(rows[i]?.[0] ?? '').trim();
    const val = rows[i]?.[2];
    if (label && (typeof val === 'number' || /RICAV|EBIT|RISULT|MARGINE/i.test(label))) {
      console.log(label, val);
    }
  }
}

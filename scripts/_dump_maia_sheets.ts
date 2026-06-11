import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const p = 'import_data/2026/[2026] Analisi Bilanci Maia  - aggiornato al 28 febbraio 2026 .xlsx';
const wb = XLSX.read(readFileSync(p), { type: 'buffer' });

for (const sheet of ['gen26', 'feb26', 'SOURCE', 'CE Dettaglio']) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: null }) as unknown[][];
  console.log(`\n=== ${sheet} (${rows.length} rows) ===`);
  for (let i = 0; i < Math.min(8, rows.length); i++) console.log(i, JSON.stringify((rows[i] as unknown[])?.slice(0, 6)));
  for (let i = Math.max(0, rows.length - 5); i < rows.length; i++) {
    const label = String((rows[i] as unknown[])?.[0] ?? (rows[i] as unknown[])?.[1] ?? '').trim();
    if (label) console.log('TAIL', i, label, (rows[i] as unknown[])?.[2]);
  }
}

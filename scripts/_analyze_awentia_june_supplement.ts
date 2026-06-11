/**
 * Supplement: compare June multi-table vs standard bilancino + full Table 2/3 tail
 */
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

type Cell = string | number | boolean | null;
type Row = Cell[];

function load(path: string) {
  const bytes = new Uint8Array(readFileSync(path));
  const wb = XLSX.read(bytes, { type: 'array' });
  const sheets: Record<string, Row[]> = {};
  for (const name of wb.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1, defval: null, raw: true, blankrows: true,
    }) as Row[];
  }
  return { path, sheetNames: wb.SheetNames, sheets };
}

function cellStr(v: Cell): string {
  if (v == null) return '';
  return String(v).trim();
}

function fmtRow(row: Row, maxCol = 10): string {
  return row.slice(0, maxCol).map((c) => {
    if (c == null) return '';
    if (typeof c === 'number') return c.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    return cellStr(c).slice(0, 35);
  }).join(' | ');
}

function nonEmptyRows(rows: Row[]): Row[] {
  return rows.filter((r) => r.some((c) => c != null && cellStr(c) !== ''));
}

function detectStandardLayout(rows: Row[]): string {
  const r0 = rows[0] ?? [];
  const h = r0.map(cellStr).join(' | ');
  if (/DataRif/i.test(h) && /Tipologia/i.test(h)) return 'bilancino_studio (DataRif+Tipologia)';
  if (/SITUAZIONE\s+PATRIMONIALE/i.test(rows.map((r) => cellStr(r[0])).join(' '))) return 'stampa_SP';
  if (/SITUAZIONE\s+ECONOMICA/i.test(rows.map((r) => cellStr(r[0])).join(' '))) return 'stampa_CE';
  if (/RIDETERMINAZIONE/i.test(rows.map((r) => cellStr(r[0])).join(' '))) return 'stampa_fiscale';
  return 'unknown';
}

function countLeafBySide(rows: Row[], startRow = 9): { costi: number; ricavi: number; both: number } {
  let costi = 0, ricavi = 0, both = 0;
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const left = /^\d{2}\/\d{2}\/\d{3}$/.test(cellStr(r[0]));
    const right = /^\d{2}\/\d{2}\/\d{3}$/.test(cellStr(r[5]));
    if (left && !right) costi++;
    else if (!left && right) ricavi++;
    else if (left && right) both++;
  }
  return { costi, ricavi, both };
}

function findDataRif(rows: Row[]): string | null {
  for (const row of rows) {
    for (const c of row) {
      const s = cellStr(c);
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
      if (typeof c === 'number' && c > 45000 && c < 47000) {
        const d = new Date(Date.UTC(1899, 11, 30) + c * 86400000);
        return `${d.getUTCDate()}/${d.getUTCMonth()+1}/${d.getUTCFullYear()}`;
      }
    }
  }
  return null;
}

const files = [
  'import_data/Bilancini/Bilancini 2025/awentia 01 25.xlsx',
  'import_data/Bilancini/Bilancini 2025/awentia 05 25.xlsx',
  'import_data/Bilancini/Bilancini 2025/AWENTIA 06 25.xlsx',
  'import_data/Bilancini/Bilancini 2025/AWENTIA 07 25.xlsx',
];

console.log('=== CONFRONTO FILE MENSILI ===\n');
for (const f of files) {
  const wb = load(f);
  console.log(`\n${f}`);
  console.log(`  Sheets: ${wb.sheetNames.join(', ')}`);
  for (const name of wb.sheetNames) {
    const rows = nonEmptyRows(wb.sheets[name] ?? []);
    const layout = detectStandardLayout(wb.sheets[name] ?? []);
    const dataRif = findDataRif(wb.sheets[name] ?? []);
    console.log(`  [${name}] layout=${layout}, righe=${rows.length}, DataRif=${dataRif ?? 'N/A'}`);
    if (layout === 'bilancino_studio (DataRif+Tipologia)') {
      const r1 = wb.sheets[name]?.[1];
      console.log(`    R2 sample: ${fmtRow(r1 ?? [])}`);
    }
  }
}

const june = load('import_data/Bilancini/Bilancini 2025/AWENTIA 06 25.xlsx');

for (const sheet of ['Table 2', 'Table 3']) {
  const rows = nonEmptyRows(june.sheets[sheet] ?? []);
  console.log(`\n\n=== ${sheet} — TUTTE LE ${rows.length} RIGHE NON VUOTE ===`);
  rows.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}: ${fmtRow(r)}`));
  const side = countLeafBySide(june.sheets[sheet] ?? []);
  console.log(`  Conti leaf: sinistra(costi)=${side.costi}, destra(ricavi)=${side.ricavi}, entrambi=${side.both}`);
}

console.log('\n\n=== Table 1 — righe finali (totali SP) ===');
const t1 = nonEmptyRows(june.sheets['Table 1'] ?? []);
t1.slice(-15).forEach((r, i) => console.log(`  ${fmtRow(r)}`));

console.log('\n\n=== Table 4 — righe finali ===');
const t4 = nonEmptyRows(june.sheets['Table 4'] ?? []);
t4.slice(-10).forEach((r) => console.log(`  ${fmtRow(r)}`));

// Try standard extract on Jan
console.log('\n\n=== ESTRATTORE STANDARD su Gen vs Table2+3 ===');
import { readWorkbookData, extractBilancino } from '../shared/etl/index.ts';
const janBytes = new Uint8Array(readFileSync('import_data/Bilancini/Bilancini 2025/awentia 01 25.xlsx'));
const janWb = readWorkbookData(XLSX as never, janBytes);
try {
  const jan = extractBilancino(janWb);
  console.log(`Gen: ${jan.accounts.length} conti CE, ricavi=${jan.totals.totaleRicavi}, costi=${jan.totals.totaleCosti}, risultato=${jan.totals.risultato}`);
  console.log(`  Sample ricavi: ${jan.accounts.filter(a=>a.side==='ricavi').slice(0,3).map(a=>`${a.accountCode}=${a.balanceNormalized}`).join('; ')}`);
  console.log(`  Sample costi: ${jan.accounts.filter(a=>a.side==='costi').slice(0,3).map(a=>`${a.accountCode}=${a.balanceNormalized}`).join('; ')}`);
} catch (e) {
  console.log('Gen extract error:', e);
}

// Manual sum from Table 2+3
function extractPrintCE(rows: Row[]): { code: string; desc: string; saldo: number; side: 'costi'|'ricavi' }[] {
  const out: { code: string; desc: string; saldo: number; side: 'costi'|'ricavi' }[] = [];
  for (let i = 9; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const codeL = cellStr(r[0]);
    const codeR = cellStr(r[5]);
    const saldoL = typeof r[3] === 'number' ? r[3] : null;
    const saldoR = typeof r[8] === 'number' ? r[8] : null;
    if (/^\d{2}\/\d{2}\/\d{3}$/.test(codeL) && saldoL != null) {
      out.push({ code: codeL, desc: cellStr(r[2]), saldo: saldoL, side: 'costi' });
    }
    if (/^\d{2}\/\d{2}\/\d{3}$/.test(codeR) && saldoR != null) {
      out.push({ code: codeR, desc: cellStr(r[7]), saldo: saldoR, side: 'ricavi' });
    }
  }
  return out;
}

const t2rows = june.sheets['Table 2'] ?? [];
const t3rows = june.sheets['Table 3'] ?? [];
const merged = [...extractPrintCE(t2rows), ...extractPrintCE(t3rows)];
const leafOnly = merged.filter((a) => !a.code.includes('***'));
console.log(`\nTable2+3 manual extract: ${merged.length} righe totali, ${leafOnly.length} leaf`);
console.log(`  Costi leaf: ${leafOnly.filter(a=>a.side==='costi').length}, Ricavi leaf: ${leafOnly.filter(a=>a.side==='ricavi').length}`);
const totCosti = leafOnly.filter(a=>a.side==='costi').reduce((s,a)=>s+a.saldo,0);
const totRicavi = leafOnly.filter(a=>a.side==='ricavi').reduce((s,a)=>s+a.saldo,0);
console.log(`  Somma leaf costi=${totCosti.toFixed(2)}, ricavi=${totRicavi.toFixed(2)}`);

// Find totals in Table 3
for (const r of nonEmptyRows(t3rows)) {
  const j = r.map(cellStr).join(' ');
  if (/TOTALE|UTILE|PERDITA|PAREGGIO/i.test(j)) console.log(`  Totali T3: ${fmtRow(r)}`);
}

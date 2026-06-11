/**
 * One-off: deep analysis of all sheets in AWENTIA 06 25.xlsx
 * vs standard bilancino (awentia 01 25.xlsx).
 */
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const JUNE_FILE = 'import_data/Bilancini/Bilancini 2025/AWENTIA 06 25.xlsx';
const REF_FILE = 'import_data/Bilancini/Bilancini 2025/awentia 01 25.xlsx';

type Cell = string | number | boolean | null;
type Row = Cell[];

function load(path: string) {
  const bytes = new Uint8Array(readFileSync(path));
  const wb = XLSX.read(bytes, { type: 'array' });
  const sheets: Record<string, Row[]> = {};
  for (const name of wb.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      defval: null,
      raw: true,
      blankrows: true,
    }) as Row[];
  }
  return { path, sheetNames: wb.SheetNames, sheets };
}

function cellStr(v: Cell): string {
  if (v == null) return '';
  return String(v).trim();
}

function isNumeric(v: Cell): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

function isAccountCode(v: Cell): boolean {
  const s = cellStr(v);
  return /^\d{2}\/\d{2}\/\d{3}$/.test(s) || /^\d{2}\/\d{2}\/\d{3}\/\d{3}$/.test(s);
}

function findHeaderRow(rows: Row[]): { rowIdx: number; headers: string[] } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] ?? [];
    const texts = row.map(cellStr).filter(Boolean);
    if (texts.length >= 3) {
      const joined = texts.join(' ').toLowerCase();
      if (
        joined.includes('conto') ||
        joined.includes('ditta') ||
        joined.includes('tipologia') ||
        joined.includes('saldo') ||
        joined.includes('descrizione') ||
        joined.includes('ricavi') ||
        joined.includes('costi')
      ) {
        return {
          rowIdx: i,
          headers: row.map((c, ci) => cellStr(c) || `[col${ci}]`),
        };
      }
    }
  }
  return null;
}

function numericColumnStats(rows: Row[], startRow: number): { col: number; count: number; sample: number[] }[] {
  const maxCol = Math.max(...rows.slice(startRow).map((r) => r.length), 0);
  const stats: { col: number; count: number; sample: number[] }[] = [];
  for (let c = 0; c < maxCol; c++) {
    const nums: number[] = [];
    for (let r = startRow; r < rows.length; r++) {
      const v = rows[r]?.[c];
      if (isNumeric(v)) nums.push(v as number);
    }
    if (nums.length >= 3) {
      stats.push({ col: c, count: nums.length, sample: nums.slice(0, 5) });
    }
  }
  return stats.sort((a, b) => b.count - a.count);
}

function countAccountPatterns(rows: Row[]): { leaf: number; aggregate: number; samples: string[] } {
  let leaf = 0;
  let aggregate = 0;
  const samples: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      const s = cellStr(cell);
      if (/^\d{2}\/\d{2}\/\d{3}$/.test(s)) {
        leaf++;
        if (samples.length < 8) samples.push(s);
      } else if (/^\d{2}\/\d{2}\/\d{3}\/\d{3}$/.test(s)) {
        aggregate++;
        if (samples.length < 8) samples.push(s);
      }
    }
  }
  return { leaf, aggregate, samples };
}

function findTipologiaValues(rows: Row[]): string[] {
  const vals = new Set<string>();
  for (const row of rows) {
    for (const cell of row) {
      const s = cellStr(cell);
      if (/COSTI|RICAVI|ATTIVIT|PASSIVIT|PERDITE|PROFITTI/i.test(s) && s.length > 10) {
        vals.add(s.slice(0, 80));
      }
    }
  }
  return [...vals];
}

function findRevenueCostExamples(rows: Row[]): { type: string; row: number; cells: string[] }[] {
  const examples: { type: string; row: number; cells: string[] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const joined = row.map(cellStr).join(' | ');
    const lower = joined.toLowerCase();
    const hasAccount = row.some(isAccountCode);
    const hasNum = row.some(isNumeric);
    if (!hasAccount && !hasNum) continue;

    if (
      (lower.includes('ricav') || lower.includes('vendit') || /^58\//.test(cellStr(row.find(isAccountCode)))) &&
      examples.filter((e) => e.type === 'ricavi').length < 3
    ) {
      examples.push({ type: 'ricavi', row: i + 1, cells: row.slice(0, 12).map((c) => (isNumeric(c) ? (c as number).toFixed(2) : cellStr(c))) });
    }
    if (
      (lower.includes('cost') || lower.includes('spes') || /^66\//.test(cellStr(row.find(isAccountCode)))) &&
      examples.filter((e) => e.type === 'costi').length < 3
    ) {
      examples.push({ type: 'costi', row: i + 1, cells: row.slice(0, 12).map((c) => (isNumeric(c) ? (c as number).toFixed(2) : cellStr(c))) });
    }
    if (
      (lower.includes('totale') || lower.includes('saldo prog') || lower.includes('progressiv')) &&
      examples.filter((e) => e.type === 'totali').length < 3
    ) {
      examples.push({ type: 'totali', row: i + 1, cells: row.slice(0, 12).map((c) => (isNumeric(c) ? (c as number).toFixed(2) : cellStr(c))) });
    }
  }
  return examples;
}

function printRowPreview(rows: Row[], start: number, count: number, maxCol = 12) {
  for (let i = start; i < Math.min(start + count, rows.length); i++) {
    const row = rows[i] ?? [];
    const parts = row.slice(0, maxCol).map((c) => {
      if (c == null) return '';
      if (isNumeric(c)) return (c as number).toLocaleString('it-IT', { maximumFractionDigits: 2 });
      return cellStr(c).slice(0, 40);
    });
    console.log(`  R${String(i + 1).padStart(3)}: ${parts.join(' | ')}`);
  }
}

function analyzeSheet(name: string, rows: Row[]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FOGLIO: "${name}" — ${rows.length} righe`);
  console.log('='.repeat(80));

  const nonEmpty = rows.filter((r) => r.some((c) => c != null && cellStr(c) !== '')).length;
  console.log(`Righe non vuote: ${nonEmpty}`);

  const header = findHeaderRow(rows);
  if (header) {
    console.log(`\nHeader rilevato a riga ${header.rowIdx + 1}:`);
    console.log(`  ${header.headers.filter((h) => h !== `[col${header.headers.indexOf(h)}]` || h.startsWith('[')).slice(0, 15).join(' | ')}`);
  } else {
    console.log('\nHeader esplicito non trovato nelle prime 30 righe');
  }

  const startPreview = header ? header.rowIdx : 0;
  console.log(`\nPrime ${Math.min(20, rows.length - startPreview)} righe (da riga ${startPreview + 1}):`);
  printRowPreview(rows, startPreview, 20, 14);

  const numStats = numericColumnStats(rows, header?.rowIdx ?? 0);
  console.log(`\nColonne numeriche (top 10 per densità):`);
  for (const s of numStats.slice(0, 10)) {
    console.log(`  col ${s.col}: ${s.count} valori — es. ${s.sample.map((n) => n.toFixed(2)).join(', ')}`);
  }

  const accounts = countAccountPatterns(rows);
  console.log(`\nPattern conti CE: leaf=${accounts.leaf}, aggregate=/000=${accounts.aggregate}`);
  if (accounts.samples.length) console.log(`  Esempi: ${accounts.samples.join(', ')}`);

  const tipologie = findTipologiaValues(rows);
  if (tipologie.length) {
    console.log(`\nTipologie rilevate:`);
    for (const t of tipologie.slice(0, 6)) console.log(`  - ${t}`);
  }

  const examples = findRevenueCostExamples(rows);
  if (examples.length) {
    console.log(`\nEsempi ricavi/costi/totali:`);
    for (const ex of examples) {
      console.log(`  [${ex.type}] riga ${ex.row}: ${ex.cells.filter(Boolean).join(' | ')}`);
    }
  }

  // Bilancino standard columns check
  const hasBilancinoLayout = rows.some((r) => {
    const t = cellStr(r[3]);
    return /COSTI.*RICAVI|ATTIVIT/i.test(t);
  });
  const hasDualColumn = rows.some((r) => isAccountCode(r[4]) && isAccountCode(r[7]));
  console.log(`\nLayout bilancino studio: tipologia col D=${hasBilancinoLayout}, doppia colonna conti=${hasDualColumn}`);

  return {
    name,
    rows: rows.length,
    nonEmpty,
    headerRow: header?.rowIdx ?? null,
    numericCols: numStats.slice(0, 5).map((s) => s.col),
    leafAccounts: accounts.leaf,
    aggregateAccounts: accounts.aggregate,
    hasBilancinoLayout,
    hasDualColumn,
    tipologie,
    examples,
  };
}

function compareLayouts(june: ReturnType<typeof load>, ref: ReturnType<typeof load>) {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('CONFRONTO LAYOUT: Giugno vs Gennaio (bilancino standard)');
  console.log('#'.repeat(80));

  for (const file of [ref, june]) {
    console.log(`\n--- ${file.path} ---`);
    console.log(`Sheets: ${file.sheetNames.join(', ')}`);
  }

  const refSheet = ref.sheets[ref.sheetNames[0]] ?? [];
  const juneSheets = ['Table 2', 'Table 3'].map((n) => ({ name: n, rows: june.sheets[n] ?? [] }));

  console.log('\nColonne header standard (Gen, foglio 1):');
  const refHeader = findHeaderRow(refSheet);
  if (refHeader) console.log(`  Riga ${refHeader.rowIdx + 1}: ${refHeader.headers.slice(0, 12).join(' | ')}`);

  for (const { name, rows } of juneSheets) {
    if (!rows.length) {
      console.log(`\n${name}: ASSENTE`);
      continue;
    }
    const h = findHeaderRow(rows);
    console.log(`\n${name} header:`);
    if (h) console.log(`  Riga ${h.rowIdx + 1}: ${h.headers.slice(0, 14).join(' | ')}`);
    else printRowPreview(rows, 0, 5, 14);
  }
}

function main() {
  const june = load(JUNE_FILE);
  const ref = load(REF_FILE);

  console.log('FILE GIUGNO:', june.path);
  console.log('SHEET NAMES:', june.sheetNames.join(' | '));
  console.log('');

  const summaries = june.sheetNames.map((name) => analyzeSheet(name, june.sheets[name] ?? []));

  compareLayouts(june, ref);

  console.log(`\n\n${'#'.repeat(80)}`);
  console.log('SINTESI ETL');
  console.log('#'.repeat(80));
  for (const s of summaries) {
    console.log(
      `  ${s.name.padEnd(12)} rows=${String(s.rows).padStart(4)} leaf=${String(s.leafAccounts).padStart(3)} agg=${String(s.aggregateAccounts).padStart(3)} bilancino=${s.hasBilancinoLayout ? 'Y' : 'N'} dual=${s.hasDualColumn ? 'Y' : 'N'}`,
    );
  }

  // Try extractBilancino on each sheet via standard profile
  console.log('\nTest extractBilancino profile su ogni foglio (solo conteggio righe CE-like):');
  for (const name of june.sheetNames) {
    const rows = june.sheets[name] ?? [];
    let ceRows = 0;
    let spRows = 0;
    for (const row of rows) {
      const tip = cellStr(row[3]);
      if (/COSTI.*RICAVI/i.test(tip)) ceRows++;
      if (/ATTIVIT/i.test(tip)) spRows++;
    }
    console.log(`  ${name}: righe con tipologia CE=${ceRows}, SP=${spRows}`);
  }
}

main();

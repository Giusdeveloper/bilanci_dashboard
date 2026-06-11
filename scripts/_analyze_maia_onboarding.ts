/**
 * One-off: confronto qualità import Maia — CSV vs XLS/XLSX.
 * Usage: npx tsx scripts/_analyze_maia_onboarding.ts
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  runBilancinoPipeline,
  runPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
} from '../shared/etl/index';
import { createPool, loadCompanies } from './lib/bilanciLoader';

const ROOT = path.join(process.cwd(), 'import_data');

const MAIA_FILES = [
  {
    path: path.join(ROOT, '2025', '[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx'),
    kind: 'xlsx_analisi',
  },
  {
    path: path.join(ROOT, '2026', '[2026] Analisi Bilanci Maia  - aggiornato al 28 febbraio 2026 .xlsx'),
    kind: 'xlsx_analisi',
  },
  {
    path: path.join(ROOT, 'MAIA_31_12_Partitario.csv'),
    kind: 'csv_partitario',
  },
];

// Reference Awentia bilancino formats for comparison
const REFERENCE_FILES = [
  {
    path: path.join(ROOT, 'Bilancini', 'Awentia', 'Bilancini 2024', 'awentia.csv'),
    kind: 'csv_bilancino',
    label: 'Awentia bilancino CSV (ref)',
  },
  {
    path: path.join(ROOT, 'Bilancini', 'Awentia', 'Bilancini 2025', 'awentia 01 25.xlsx'),
    kind: 'xlsx_bilancino',
    label: 'Awentia bilancino XLSX (ref)',
  },
];

function tryReadCsvAsWorkbook(filePath: string): {
  ok: boolean;
  wb?: ReturnType<typeof readWorkbookData>;
  error?: string;
  encoding?: string;
  delimiter?: string;
  headers?: string[];
  rowCount?: number;
} {
  try {
    const raw = readFileSync(filePath);
    // Try UTF-8 first
    let text = raw.toString('utf8');
    if (text.includes('\ufffd')) {
      text = raw.toString('latin1');
    }
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    const semicolonCount = (firstLine.match(/;/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const delimiter = semicolonCount >= commaCount ? ';' : ',';

    const wb = XLSX.read(text, { type: 'string', FS: delimiter });
    const data = readWorkbookData(XLSX as never, new Uint8Array(Buffer.from(text, 'utf8')));
    const sheet = data.sheets[data.sheetNames[0]] ?? [];
    const headers = (sheet[0] ?? []).map((c) => (c != null ? String(c).trim() : ''));
    return {
      ok: true,
      wb: data,
      encoding: text.includes('\ufffd') ? 'latin1' : 'utf8',
      delimiter,
      headers,
      rowCount: sheet.length - 1,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function analyzeWorkbook(filePath: string, wb: ReturnType<typeof readWorkbookData>) {
  const detection = detectProfile(wb);
  let bilancino: ReturnType<typeof extractBilancino> | null = null;
  let bilancinoError: string | null = null;
  try {
    bilancino = extractBilancino(wb, detection.profile);
  } catch (e) {
    bilancinoError = e instanceof Error ? e.message : String(e);
  }

  const sheetSummary = wb.sheetNames.map((name) => {
    const rows = wb.sheets[name] ?? [];
    const header = (rows[0] ?? []).slice(0, 12).map((c) => (c != null ? String(c).trim() : ''));
    return { name, rows: rows.length, headerPreview: header.filter(Boolean).slice(0, 8) };
  });

  // Collect bilancino-like labels
  const labels: string[] = [];
  for (const name of wb.sheetNames) {
    for (const row of wb.sheets[name] ?? []) {
      for (const cell of row ?? []) {
        if (cell != null) labels.push(String(cell).trim());
      }
    }
  }
  const hasDataRif = labels.some((l) => /^DataRif$/i.test(l));
  const hasConto1 = labels.some((l) => /^Conto1$/i.test(l));
  const hasTipologiaCE = /COSTI,\s*SPESE\s*E\s*PERDITE/i.test(labels.join('|'));
  const hasTableSheets = wb.sheetNames.some((s) => /^Table\s+[1-4]$/i.test(s));
  const hasCeDettaglio = wb.sheetNames.some((s) => /CE\s+dettaglio/i.test(s));
  const hasSource = wb.sheetNames.some((s) => /^source$/i.test(s));
  const hasGrossProfit = labels.some((l) => /GROSS\s*PROFIT/i.test(l));

  return {
    file: path.basename(filePath),
    sheets: sheetSummary,
    detection: {
      profileId: detection.profile.id,
      score: detection.score,
      usedFallback: detection.usedFallback,
      scores: detection.scores,
    },
    bilancinoMarkers: { hasDataRif, hasConto1, hasTipologiaCE, hasTableSheets, hasCeDettaglio, hasSource, hasGrossProfit },
    bilancino: bilancino
      ? {
          profileId: bilancino.profileId,
          companyName: bilancino.companyName,
          year: bilancino.year,
          month: bilancino.month,
          accountCount: bilancino.accounts.length,
          totals: bilancino.totals,
        }
      : null,
    bilancinoError,
  };
}

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    return { dbAvailable: false, reason: 'DATABASE_URL missing' };
  }
  const pool = createPool();
  try {
    const companies = await loadCompanies(pool);
    const maia = companies.find((c) => c.slug === 'maia-management');
    if (!maia) {
      return {
        dbAvailable: true,
        maiaFound: false,
        allSlugs: companies.map((c) => c.slug).sort(),
      };
    }

    const famRes = await pool.query(
      `select code, label, sort_order from company_famiglie where company_id = $1 order by sort_order`,
      [maia.id],
    );
    const ceRes = await pool.query(`select ce_profile from companies where id = $1`, [maia.id]);
    const importsRes = await pool.query(
      `select count(*)::int as n from imports where company_id = $1`,
      [maia.id],
    );
    const factsRes = await pool.query(
      `select count(*)::int as n from financial_facts where company_id = $1`,
      [maia.id],
    );
    return {
      dbAvailable: true,
      maiaFound: true,
      company: { id: maia.id, slug: maia.slug, name: maia.name },
      ceProfile: ceRes.rows[0]?.ce_profile ?? null,
      famiglie: famRes.rows,
      importCount: importsRes.rows[0]?.n ?? 0,
      factsCount: factsRes.rows[0]?.n ?? 0,
    };
  } finally {
    await pool.end();
  }
}

function runPipelineDry(wb: ReturnType<typeof readWorkbookData>, extracted: ReturnType<typeof extractBilancino>) {
  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const labelResolver = buildResolver(mappingsForCompany('maia-management'), validCodes);
  const result = runBilancinoPipeline({
    workbook: wb,
    ledgerMappings: [],
    labelResolver,
    extract: extracted,
  });
  return {
    factsCount: result.facts.length,
    warnings: result.warnings.slice(0, 5),
    warningCount: result.warnings.length,
    kpis: result.kpis,
  };
}

function runCePipelineDry(wb: ReturnType<typeof readWorkbookData>) {
  const det = detectProfile(wb);
  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const resolver = buildResolver(mappingsForCompany('maia-management'), validCodes);
  const result = runPipeline({
    workbook: wb,
    profile: det.profile,
    resolver,
    detectionFallback: det.usedFallback,
  });
  return {
    profileId: result.profileId,
    currentYear: result.currentYear,
    referenceMonth: result.referenceMonth,
    factsAnnual: result.facts.filter((f) => f.month == null).length,
    factsMonthly: result.facts.filter((f) => f.month != null).length,
    errors: result.warnings.filter((w) => w.severity === 'error').length,
    warnings: result.warnings.filter((w) => w.severity === 'warning').length,
    kpis: {
      totaleRicavi: result.kpis.totaleRicavi,
      totaleCosti: result.kpis.totaleCosti,
      ebitda: result.kpis.ebitda,
      risultatoEsercizio: result.kpis.risultatoEsercizio,
    },
    sampleWarnings: result.warnings.slice(0, 3),
  };
}

function analyzeMonthlyBilancinoSheets(wb: ReturnType<typeof readWorkbookData>) {
  const monthSheets = wb.sheetNames.filter((n) => /^(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)\d{2}$/i.test(n));
  return monthSheets.map((name) => {
    const rows = wb.sheets[name] ?? [];
    let accountCount = 0;
    let totaleRicavi: number | null = null;
    let totaleCosti: number | null = null;
    let risultato: number | null = null;
    for (const row of rows) {
      const conto = row?.[0];
      const label = String(row?.[0] ?? row?.[1] ?? '').trim().toUpperCase();
      if (typeof conto === 'string' && /^\d{2}\/\d{2}\/\d{3}/.test(conto)) accountCount++;
      if (label === 'TOTALE RICAVI') totaleRicavi = typeof row?.[2] === 'number' ? row[2] : null;
      if (label === 'TOTALE COSTI') totaleCosti = typeof row?.[2] === 'number' ? row[2] : null;
      if (/UTILE|PERDITA/.test(label) && label.includes('ESERCIZIO')) {
        risultato = typeof row?.[2] === 'number' ? row[2] : null;
      }
    }
    return { sheet: name, accountCount, totaleRicavi, totaleCosti, risultato, rows: rows.length };
  });
}

async function main() {
  console.log('=== MAIA ONBOARDING — CSV vs XLS/XLSX ===\n');

  const results: unknown[] = [];

  for (const f of MAIA_FILES) {
    if (!existsSync(f.path)) {
      results.push({ path: f.path, exists: false });
      continue;
    }
    const stat = { path: f.path, kind: f.kind, exists: true };

    if (f.path.endsWith('.csv')) {
      const csv = tryReadCsvAsWorkbook(f.path);
      Object.assign(stat, {
        csvMeta: {
          encoding: csv.encoding,
          delimiter: csv.delimiter,
          headers: csv.headers,
          rowCount: csv.rowCount,
          readError: csv.error,
        },
      });
      if (csv.ok && csv.wb) {
        Object.assign(stat, { analysis: analyzeWorkbook(f.path, csv.wb) });
      }
    } else {
      const bytes = readFileSync(f.path);
      const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
      Object.assign(stat, {
        analysis: analyzeWorkbook(f.path, wb),
        monthlyBilancinoSheets: analyzeMonthlyBilancinoSheets(wb),
        cePipeline: runCePipelineDry(wb),
      });
    }
    results.push(stat);
  }

  console.log('--- File Maia ---');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n--- Reference Awentia bilancino ---');
  for (const ref of REFERENCE_FILES) {
    if (!existsSync(ref.path)) {
      console.log(`${ref.label}: NOT FOUND`);
      continue;
    }
    if (ref.path.endsWith('.csv')) {
      const csv = tryReadCsvAsWorkbook(ref.path);
      if (csv.ok && csv.wb) {
        const a = analyzeWorkbook(ref.path, csv.wb);
        console.log(JSON.stringify({ label: ref.label, csvMeta: { encoding: csv.encoding, delimiter: csv.delimiter, headers: csv.headers?.slice(0, 10) }, analysis: a }, null, 2));
      }
    } else {
      const bytes = readFileSync(ref.path);
      const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
      const a = analyzeWorkbook(ref.path, wb);
      console.log(JSON.stringify({ label: ref.label, analysis: a }, null, 2));
    }
  }

  // Pipeline dry-run on best bilancino candidate
  for (const f of [...MAIA_FILES, ...REFERENCE_FILES]) {
    if (!existsSync(f.path)) continue;
    let wb: ReturnType<typeof readWorkbookData> | null = null;
    if (f.path.endsWith('.csv')) {
      const csv = tryReadCsvAsWorkbook(f.path);
      wb = csv.wb ?? null;
    } else {
      const bytes = readFileSync(f.path);
      wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
    }
    if (!wb) continue;
    const det = detectProfile(wb);
    try {
      const ext = extractBilancino(wb, det.profile);
      const pipe = runPipelineDry(wb, ext);
      console.log(`\n--- Pipeline dry-run: ${path.basename(f.path)} ---`);
      console.log(JSON.stringify({ extract: { accounts: ext.accounts.length, totals: ext.totals }, pipeline: pipe }, null, 2));
    } catch (e) {
      console.log(`\n--- Pipeline skip: ${path.basename(f.path)} — ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n--- DB check ---');
  console.log(JSON.stringify(await checkDb(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

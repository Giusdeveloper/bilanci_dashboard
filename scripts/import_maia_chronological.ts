/**
 * import_maia_chronological — import cronologico bilancini Maia Management.
 *
 * Profilo CE: awentia (template consulente). Supporta CSV e XLSX.
 *
 * Uso:
 *   npx tsx scripts/import_maia_chronological.ts --dry-run
 *   npx tsx scripts/import_maia_chronological.ts
 *   npx tsx scripts/import_maia_chronological.ts --year 2025
 *   npx tsx scripts/import_maia_chronological.ts --year 2024
 *   npx tsx scripts/import_maia_chronological.ts --year 2026
 *   npx tsx scripts/import_maia_chronological.ts --from 2025-02
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
  buildResolver,
  buildMasterChart,
  sha256Hex,
  mappingsForCompany,
  buildLedgerMappingStubs,
} from '../shared/etl/index';
import {
  createPool,
  loadCompanies,
  loadLedgerMappings,
  loadFinancialFacts,
  loadCodeMap,
  persistBilancinoPlan,
  persistBilancinoFacts,
  hasExistingFacts,
  ensureSeed,
  upsertLedgerMappingStubs,
  type AccountBalanceRow,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'maia-management';
const ROOT = process.cwd();
const BILANCINI_2024 = 'import_data/Bilancini/Maia/2024';
const BILANCINI_2025 = 'import_data/Bilancini/Maia/2025';
const BILANCINI_2026 = 'import_data/Bilancini/Maia/2026';

type ImportEntry = {
  year: number;
  month: number;
  file: string;
  skipIfExists?: boolean;
  forceReplace?: boolean;
};

/** Sequenza cronologica 2024 — XLSX, naming misto MAIA/maia. */
const IMPORT_SEQUENCE_2024: ImportEntry[] = [
  { year: 2024, month: 1, file: `${BILANCINI_2024}/MAIA 01 24.xlsx` },
  { year: 2024, month: 2, file: `${BILANCINI_2024}/MAIA 02 24.xlsx` },
  { year: 2024, month: 3, file: `${BILANCINI_2024}/MAIA 03 24.xlsx` },
  { year: 2024, month: 4, file: `${BILANCINI_2024}/MAIA 04 24.xlsx` },
  { year: 2024, month: 5, file: `${BILANCINI_2024}/MAIA 05 24.xlsx` },
  { year: 2024, month: 6, file: `${BILANCINI_2024}/MAIA 06 24.xlsx` },
  { year: 2024, month: 7, file: `${BILANCINI_2024}/maia 07 24.xlsx` },
  { year: 2024, month: 8, file: `${BILANCINI_2024}/maia 08 24.xlsx` },
  { year: 2024, month: 9, file: `${BILANCINI_2024}/maia 09 24.xlsx` },
  { year: 2024, month: 10, file: `${BILANCINI_2024}/MAIA 10 24.xlsx` },
  { year: 2024, month: 11, file: `${BILANCINI_2024}/MAIA 11 24.xlsx` },
  { year: 2024, month: 12, file: `${BILANCINI_2024}/MAIA 12 24.xlsx` },
];

/** Sequenza cronologica 2025 — CSV. */
const IMPORT_SEQUENCE_2025: ImportEntry[] = [
  { year: 2025, month: 1, file: `${BILANCINI_2025}/MAIA 01 25.csv` },
  { year: 2025, month: 2, file: `${BILANCINI_2025}/MAIA 02 25.csv` },
  { year: 2025, month: 3, file: `${BILANCINI_2025}/MAIA 03 25.csv` },
  { year: 2025, month: 4, file: `${BILANCINI_2025}/MAIA 04 25.csv` },
  { year: 2025, month: 5, file: `${BILANCINI_2025}/MAIA 05 25.csv` },
  { year: 2025, month: 6, file: `${BILANCINI_2025}/MAIA 06 25.csv` },
  { year: 2025, month: 7, file: `${BILANCINI_2025}/MAIA 07 25.csv` },
  { year: 2025, month: 8, file: `${BILANCINI_2025}/MAIA 08 25.csv` },
  { year: 2025, month: 9, file: `${BILANCINI_2025}/MAIA 09 25.csv` },
  { year: 2025, month: 10, file: `${BILANCINI_2025}/MAIA 10 25.csv` },
  { year: 2025, month: 11, file: `${BILANCINI_2025}/MAIA 11 25.csv` },
  { year: 2025, month: 12, file: `${BILANCINI_2025}/MAIA 12 25.csv` },
];

/** Sequenza cronologica 2026 — XLSX (mesi disponibili). */
const IMPORT_SEQUENCE_2026: ImportEntry[] = [
  { year: 2026, month: 1, file: `${BILANCINI_2026}/MAIA 01 26.xlsx` },
  { year: 2026, month: 2, file: `${BILANCINI_2026}/MAIA 02 26.xlsx` },
  { year: 2026, month: 3, file: `${BILANCINI_2026}/MAIA 03 26.xlsx` },
  { year: 2026, month: 4, file: `${BILANCINI_2026}/MAIA 04 26.xlsx` },
];

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

interface ImportResult {
  year: number;
  month: number;
  file: string;
  status: 'ok' | 'skip' | 'error';
  message?: string;
  profile?: string;
  facts?: number;
  kpis?: Record<string, number | undefined>;
  gateBlocked?: boolean;
}

function resolveSequence(year?: number): ImportEntry[] {
  if (year === 2024) return IMPORT_SEQUENCE_2024;
  if (year === 2025) return IMPORT_SEQUENCE_2025;
  if (year === 2026) return IMPORT_SEQUENCE_2026;
  return [...IMPORT_SEQUENCE_2024, ...IMPORT_SEQUENCE_2025, ...IMPORT_SEQUENCE_2026];
}

function parseArgs(): { dryRun: boolean; fromKey?: string; forceAll: boolean; year?: number } {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  const yearIdx = args.indexOf('--year');
  const yearRaw = yearIdx >= 0 ? args[yearIdx + 1] : undefined;
  const year = yearRaw != null ? Number(yearRaw) : undefined;
  return {
    dryRun: args.includes('--dry-run'),
    fromKey: fromIdx >= 0 ? args[fromIdx + 1] : undefined,
    forceAll: args.includes('--force-all'),
    year: Number.isFinite(year) ? year : undefined,
  };
}

/** Bilancini Maia non quotati: apostrofi nelle descrizioni (D'IMPIANTO) corrompono colonne SheetJS. */
function quoteUnquotedApostropheFields(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line || line.includes('"')) return line;
      return line
        .split(';')
        .map((field) => (field.includes("'") ? `"${field.replace(/"/g, '""')}"` : field))
        .join(';');
    })
    .join('\n');
}

function loadWorkbookFromFile(absPath: string): ReturnType<typeof readWorkbookData> {
  if (absPath.toLowerCase().endsWith('.csv')) {
    const raw = readFileSync(absPath);
    let text = raw.toString('utf8');
    if (text.includes('\ufffd')) text = raw.toString('latin1');
    text = quoteUnquotedApostropheFields(text);
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    const semicolonCount = (firstLine.match(/;/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const delimiter = semicolonCount >= commaCount ? ';' : ',';
    // raw: true evita conversione date su codici conto (74/05/005); saldi IT passano a cleanNumber
    const parsed = XLSX.read(text, { type: 'string', FS: delimiter, raw: true });
    const sheets: Record<string, ReturnType<typeof readWorkbookData>['sheets'][string]> = {};
    for (const name of parsed.SheetNames) {
      sheets[name] = XLSX.utils.sheet_to_json(parsed.Sheets[name], {
        header: 1,
        defval: null,
        raw: true,
        blankrows: true,
      }) as ReturnType<typeof readWorkbookData>['sheets'][string];
    }
    return { sheetNames: parsed.SheetNames, sheets };
  }
  return readWorkbookData(XLSX as never, new Uint8Array(readFileSync(absPath)));
}

function toBalanceRows(
  companyId: string,
  extracted: ReturnType<typeof extractBilancino>,
): AccountBalanceRow[] {
  return extracted.accounts.map((a) => ({
    companyId,
    accountCode: a.accountCode,
    accountDescription: a.description,
    section: a.section,
    accountSide: a.side,
    year: extracted.year,
    month: extracted.month,
    balanceRaw: a.balanceRaw,
    balanceNormalized: a.balanceNormalized,
  }));
}

async function importOne(
  pool: ReturnType<typeof createPool> | null,
  companyId: string,
  codeMap: Map<string, string>,
  ledgerMappings: Array<{
    accountCode: string;
    analiticaLabel: string;
    signMultiplier: number;
    famiglia?: string | null;
  }>,
  labelResolver: ReturnType<typeof buildResolver>,
  entry: ImportEntry,
  replaceExisting: boolean,
  dryRun: boolean,
): Promise<ImportResult> {
  const absPath = path.join(ROOT, entry.file);
  const base = { year: entry.year, month: entry.month, file: entry.file };

  if (!existsSync(absPath)) {
    return { ...base, status: 'error', message: `File non trovato: ${entry.file}` };
  }

  try {
    const bytes = readFileSync(absPath);
    const fileHash = await sha256Hex(new Uint8Array(bytes));
    const wb = loadWorkbookFromFile(absPath);
    const detection = detectProfile(wb);
    const extracted = extractBilancino(wb, detection.profile, path.basename(entry.file));

    let activeMappings = ledgerMappings;
    if (!dryRun && pool) {
      const existingCodes = new Set(activeMappings.map((m) => m.accountCode));
      const stubs = buildLedgerMappingStubs(extracted.accounts, existingCodes);
      if (stubs.length > 0) {
        await upsertLedgerMappingStubs(pool, companyId, stubs);
        const refreshed = await loadLedgerMappings(pool, companyId);
        activeMappings = refreshed.map((m) => ({
          accountCode: m.accountCode,
          analiticaLabel: m.analiticaLabel,
          signMultiplier: m.signMultiplier,
          famiglia: m.famiglia ?? null,
        }));
      }
    }

    if (extracted.year !== entry.year || extracted.month !== entry.month) {
      return {
        ...base,
        status: 'error',
        message: `Periodo file ${extracted.year}/${extracted.month} ≠ atteso ${entry.year}/${entry.month}`,
      };
    }

    let previousProgressive: Record<string, number> | undefined;
    if (!dryRun && pool && extracted.month > 1) {
      const prevFacts = await loadFinancialFacts(pool, companyId, extracted.year, extracted.month - 1);
      if (prevFacts.length > 0) {
        previousProgressive = Object.fromEntries(
          prevFacts.map((f) => [f.categoryCode, f.amountProgressive]),
        );
      }
    }

    const result = runBilancinoPipeline({
      workbook: wb,
      ledgerMappings: activeMappings,
      labelResolver,
      extract: extracted,
      sourceFilename: path.basename(entry.file),
      previousProgressive,
      companySlug: COMPANY_SLUG,
    });

    if (result.publishGate?.blocked) {
      const errMsgs = result.publishGate.errors.slice(0, 3);
      return {
        ...base,
        status: 'error',
        gateBlocked: true,
        message: `Gate publish: ${errMsgs.join('; ')}`,
        kpis: result.kpis,
        facts: result.facts.length,
      };
    }

    const errorCount = result.warnings.filter((w) => w.severity === 'error').length;
    if (errorCount > 0) {
      const errMsgs = result.warnings.filter((w) => w.severity === 'error').map((w) => w.message);
      return {
        ...base,
        status: 'error',
        message: `${errorCount} errori pipeline: ${errMsgs.slice(0, 3).join('; ')}`,
        kpis: result.kpis,
        facts: result.facts.length,
      };
    }

    if (dryRun) {
      return {
        ...base,
        status: 'ok',
        message: `[dry-run] facts=${result.facts.length}, accounts=${extracted.accounts.length}`,
        facts: result.facts.length,
        kpis: result.kpis,
        profile: result.profileId,
      };
    }

    if (!pool) throw new Error('Pool DB richiesto per import reale');

    const loaded = await persistBilancinoPlan(pool, {
      companyId,
      sourceFilename: path.basename(entry.file),
      fileHash,
      templateProfile: result.profileId,
      warnings: result.warnings,
      balances: toBalanceRows(companyId, extracted),
    });

    let publishedFacts = 0;
    if (result.facts.length > 0) {
      const published = await persistBilancinoFacts(pool, {
        companyId,
        importId: loaded.importId,
        year: extracted.year,
        facts: result.facts,
        layout: result.layout,
        referenceMonth: extracted.month,
        codeMap,
        replaceExisting,
      });
      publishedFacts = published.facts;
    }

    return {
      ...base,
      status: 'ok',
      message: `import=${loaded.importId.slice(0, 8)}, facts=${publishedFacts}`,
      facts: publishedFacts,
      kpis: result.kpis,
      profile: result.profileId,
    };
  } catch (err) {
    return { ...base, status: 'error', message: (err as Error).message };
  }
}

async function verifyDb(
  pool: ReturnType<typeof createPool>,
  companyId: string,
  years: number[],
): Promise<void> {
  const { rows: periods } = await pool.query(
    `select year, month, label from fiscal_periods
      where company_id = $1 and year = any($2::int[])
      order by year, month nulls last`,
    [companyId, years],
  );
  console.log(`\n===== fiscal_periods (${years.join(', ')}) =====`);
  console.table(periods);

  const { rows: factMonths } = await pool.query(
    `select ff.year, ff.month, count(*)::int as categories
       from financial_facts ff
      where ff.company_id = $1 and ff.year = any($2::int[]) and ff.month is not null
      group by ff.year, ff.month
      order by ff.year, ff.month`,
    [companyId, years],
  );
  console.log('\n===== financial_facts per mese =====');
  console.table(factMonths);

  for (const y of years) {
    const { rows: lastMonthRow } = await pool.query(
      `select max(month)::int as last_month
         from financial_facts
        where company_id = $1 and year = $2 and month is not null`,
      [companyId, y],
    );
    const lastMonth = (lastMonthRow[0] as { last_month: number | null })?.last_month;
    if (lastMonth == null) {
      console.log(`\n===== KPI ${y} — nessun mese in DB =====`);
      continue;
    }
    const kpiCodes = ['totaleRicavi', 'ebitda', 'risultatoEsercizio'];
    const { rows: kpis } = await pool.query(
      `select mc.code, ff.amount_progressive, ff.amount_period
         from financial_facts ff
         join master_chart_of_accounts mc on mc.id = ff.category_id
        where ff.company_id = $1 and ff.year = $2 and ff.month = $3
          and mc.code = any($4::text[])
        order by mc.code`,
      [companyId, y, lastMonth, kpiCodes],
    );
    console.log(`\n===== KPI ${y}-${String(lastMonth).padStart(2, '0')} (puntuale vs progressivo) =====`);
    console.table(kpis);
  }
}

async function main(): Promise<void> {
  const { dryRun, fromKey, forceAll, year } = parseArgs();
  const verifyYears = year != null ? [year] : [2024, 2025, 2026];
  const sequence = resolveSequence(year).filter((e) => existsSync(path.join(ROOT, e.file)) || !dryRun);

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  console.log(`Sequenza import Maia Management (${COMPANY_SLUG})${year != null ? ` — anno ${year}` : ''}\n`);
  console.table(
    sequence.map((e) => ({
      periodo: periodKey(e.year, e.month),
      file: e.file,
      exists: existsSync(path.join(ROOT, e.file)) ? 'yes' : 'no',
    })),
  );

  const pool = dryRun ? null : createPool();
  const results: ImportResult[] = [];

  try {
    let companyId = 'dry-run-company';
    let codeMap = new Map<string, string>();
    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);
    let ledgerMappings: Array<{
      accountCode: string;
      analiticaLabel: string;
      signMultiplier: number;
      famiglia?: string | null;
    }> = [];

    if (pool) {
      const companies = await loadCompanies(pool);
      const company = companies.find((c) => c.slug === COMPANY_SLUG);
      if (!company) throw new Error(`Company '${COMPANY_SLUG}' non trovata — eseguire migration bootstrap`);

      companyId = company.id;
      console.log('Seed account_mappings...');
      await ensureSeed(pool, companies);
      codeMap = await loadCodeMap(pool);
      ledgerMappings = (await loadLedgerMappings(pool, companyId)).map((m) => ({
        accountCode: m.accountCode,
        analiticaLabel: m.analiticaLabel,
        signMultiplier: m.signMultiplier,
        famiglia: m.famiglia ?? null,
      }));
      console.log(`Company: ${company.name} (${company.id})`);
      console.log(`Ledger mappings: ${ledgerMappings.length}\n`);
    } else {
      console.log('\n[dry-run] Pipeline con publish gate, nessuna scrittura DB\n');
    }

    let started = fromKey == null;
    for (const entry of sequence) {
      const key = periodKey(entry.year, entry.month);
      if (!started) {
        if (key === fromKey) started = true;
        else continue;
      }

      if (pool && !entry.forceReplace && !forceAll && entry.skipIfExists) {
        const exists = await hasExistingFacts(pool, companyId, entry.year, entry.month);
        if (exists) {
          results.push({ year: entry.year, month: entry.month, file: entry.file, status: 'skip', message: 'già presente' });
          console.log(`[SKIP] ${key} — già presente`);
          continue;
        }
      }

      console.log(`[IMPORT] ${key} — ${path.basename(entry.file)}`);
      const result = await importOne(
        pool,
        companyId,
        codeMap,
        ledgerMappings,
        labelResolver,
        entry,
        true,
        dryRun,
      );
      results.push(result);
      console.log(`  → ${result.status.toUpperCase()}${result.message ? `: ${result.message}` : ''}`);
      if (result.kpis?.totaleRicavi != null) {
        console.log(`     totaleRicavi=${result.kpis.totaleRicavi.toFixed(2)}, risultato=${result.kpis.risultatoEsercizio?.toFixed(2) ?? 'n/d'}`);
      }
    }

    console.log('\n===== ESITO IMPORT =====');
    console.table(
      results.map((r) => ({
        periodo: periodKey(r.year, r.month),
        status: r.status,
        facts: r.facts ?? '-',
        gate: r.gateBlocked ? 'BLOCKED' : '-',
        message: r.message ?? '',
      })),
    );

    if (pool && !dryRun && companyId !== 'dry-run-company') {
      await verifyDb(pool, companyId, verifyYears);
    }
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

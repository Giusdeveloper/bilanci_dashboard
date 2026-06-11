/**
 * import_awentia_chronological — import cronologico bilancini Awentia con publish_facts.
 *
 * Usa lo stesso core ETL della Edge Function (shared/etl + bilanciLoader pg).
 *
 * Uso:
 *   npx tsx scripts/import_awentia_chronological.ts
 *   npx tsx scripts/import_awentia_chronological.ts --dry-run
 *   npx tsx scripts/import_awentia_chronological.ts --from 2025-02
 *   npx tsx scripts/import_awentia_chronological.ts --year 2024
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
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
  type AccountBalanceRow,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'awentia';
const ROOT = process.cwd();
const BILANCINI_2024 = 'import_data/Bilancini/Awentia/Bilancini 2024';
const BILANCINI_AWENTIA_2026 = 'import_data/Bilancini/Awentia/Bilancini 2026';

type ImportEntry = {
  year: number;
  month: number;
  file: string;
  skipIfExists?: boolean;
  forceReplace?: boolean;
};

/** Sequenza cronologica: un file xlsx per mese (cartelle canonicali). */
const IMPORT_SEQUENCE_2024: ImportEntry[] = [
  { year: 2024, month: 1, file: `${BILANCINI_2024}/AWENTIA 01 24.xlsx`, skipIfExists: true },
  { year: 2024, month: 2, file: `${BILANCINI_2024}/AWENTIA 02 24.xlsx` },
  { year: 2024, month: 3, file: `${BILANCINI_2024}/awentia 03 2024.xlsx` },
  { year: 2024, month: 4, file: `${BILANCINI_2024}/AWENTIA 04 24 (1).xlsx` },
  { year: 2024, month: 5, file: `${BILANCINI_2024}/AWENTIA 05 24.xlsx` },
  { year: 2024, month: 6, file: `${BILANCINI_2024}/AWENTIA 06 24.xlsx` },
  { year: 2024, month: 7, file: `${BILANCINI_2024}/AWENTIA 07.xlsx` },
  { year: 2024, month: 8, file: `${BILANCINI_2024}/AWENTIA 08.xlsx` },
  { year: 2024, month: 9, file: `${BILANCINI_2024}/AWENTIA 30 09.xlsx` },
  { year: 2024, month: 10, file: `${BILANCINI_2024}/AWENTIA 10 24.xlsx` },
  { year: 2024, month: 11, file: `${BILANCINI_2024}/awentia 11 24.xlsx` },
  { year: 2024, month: 12, file: `${BILANCINI_2024}/AWENTIA 12 24.xlsx`, skipIfExists: true },
  { year: 2024, month: 12, file: `${BILANCINI_2024}/AWENTIA 12 24.xlsx`, forceReplace: true },
];

const IMPORT_SEQUENCE_2025_2026: ImportEntry[] = [
  { year: 2025, month: 1, file: 'import_data/Bilancini/Bilancini 2025/awentia 01 25.xlsx', skipIfExists: true },
  { year: 2025, month: 2, file: 'import_data/Bilancini/Bilancini 2025/awentia 02 25.xlsx' },
  { year: 2025, month: 3, file: 'import_data/Bilancini/Bilancini 2025/awentia 03 25.xlsx' },
  { year: 2025, month: 4, file: 'import_data/Bilancini/Bilancini 2025/awentia 04 25.xlsx' },
  { year: 2025, month: 5, file: 'import_data/Bilancini/Bilancini 2025/awentia 05 25.xlsx' },
  { year: 2025, month: 6, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA 06 25.xlsx' },
  { year: 2025, month: 7, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA 07 25.xlsx' },
  { year: 2025, month: 8, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA 08 25.xlsx' },
  { year: 2025, month: 9, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA 09 25.xlsx' },
  { year: 2025, month: 10, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA SRL 10 25.xlsx' },
  { year: 2025, month: 11, file: 'import_data/Bilancini/Bilancini 2025/AWENTIA SRL 30.11.25.xlsx' },
  {
    year: 2025,
    month: 12,
    file: 'import_data/Bilancini/Bilancini 2025/AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx',
    skipIfExists: true,
  },
  { year: 2026, month: 1, file: `${BILANCINI_AWENTIA_2026}/AWENTIA SRL 01 26.xlsx` },
  { year: 2026, month: 2, file: `${BILANCINI_AWENTIA_2026}/AWENTIA SRL 02 26 provvisorio.xlsx` },
  { year: 2026, month: 3, file: `${BILANCINI_AWENTIA_2026}/AWENTIA SRL 03 26.xlsx` },
  { year: 2026, month: 4, file: `${BILANCINI_AWENTIA_2026}/AWENTIA SRL 30 04 provvisorio.xlsx` },
  {
    year: 2025,
    month: 12,
    file: 'import_data/Bilancini/Bilancini 2025/AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx',
    forceReplace: true,
  },
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
  facts?: number;
  kpis?: Record<string, number | undefined>;
}

function resolveSequence(year?: number): ImportEntry[] {
  if (year === 2024) return IMPORT_SEQUENCE_2024;
  if (year === 2025) return IMPORT_SEQUENCE_2025_2026.filter((e) => e.year === 2025);
  if (year === 2026) return IMPORT_SEQUENCE_2025_2026.filter((e) => e.year === 2026);
  return [...IMPORT_SEQUENCE_2025_2026];
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
  pool: ReturnType<typeof createPool>,
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

  try {
    const bytes = readFileSync(absPath);
    const fileHash = await sha256Hex(new Uint8Array(bytes));
    const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
    const detection = detectProfile(wb);
    const extracted = extractBilancino(wb, detection.profile, path.basename(entry.file));

    if (extracted.year !== entry.year || extracted.month !== entry.month) {
      return {
        ...base,
        status: 'error',
        message: `Periodo file ${extracted.year}/${extracted.month} ≠ atteso ${entry.year}/${entry.month}`,
      };
    }

    let previousProgressive: Record<string, number> | undefined;
    if (extracted.month > 1) {
      const prevFacts = await loadFinancialFacts(pool, companyId, extracted.year, extracted.month - 1);
      if (prevFacts.length > 0) {
        previousProgressive = Object.fromEntries(
          prevFacts.map((f) => [f.categoryCode, f.amountProgressive]),
        );
      }
    }

    const result = runBilancinoPipeline({
      workbook: wb,
      ledgerMappings,
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
        message: `Gate publish: ${errMsgs.join('; ')}`,
        kpis: result.kpis,
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
      };
    }

    if (dryRun) {
      return {
        ...base,
        status: 'ok',
        message: `[dry-run] facts=${result.facts.length}, replace=${replaceExisting}`,
        facts: result.facts.length,
        kpis: result.kpis,
      };
    }

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

  const kpiCodes = ['totaleRicavi', 'ebitda', 'risultatoEsercizio'];
  const decYear = years.includes(2024) ? 2024 : years.includes(2025) ? 2025 : years[0];
  const { rows: decKpis } = await pool.query(
    `select mc.code, ff.amount_progressive, ff.amount_period
       from financial_facts ff
       join master_chart_of_accounts mc on mc.id = ff.category_id
      where ff.company_id = $1 and ff.year = $2 and ff.month = 12
        and mc.code = any($3::text[])
      order by mc.code`,
    [companyId, decYear, kpiCodes],
  );
  console.log(`\n===== KPI Dic ${decYear} (puntuale vs progressivo) =====`);
  console.table(decKpis);
}

async function main(): Promise<void> {
  const { dryRun, fromKey, forceAll, year } = parseArgs();
  const sequence = resolveSequence(year);
  const verifyYears = year != null ? [year] : [2025, 2026];

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  console.log(`Sequenza import Awentia (publish_facts=true)${year != null ? ` — anno ${year}` : ''}\n`);
  console.table(
    sequence.map((e) => ({
      periodo: periodKey(e.year, e.month) + (e.forceReplace ? ' (re-import)' : ''),
      file: e.file,
    })),
  );

  const pool = dryRun ? null : createPool();
  const results: ImportResult[] = [];

  try {
    if (!pool) {
      console.log('\n[dry-run] Verifica file e periodi estratti...\n');
      for (const entry of sequence) {
        const absPath = path.join(ROOT, entry.file);
        try {
          const bytes = readFileSync(absPath);
          const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
          const extracted = extractBilancino(wb, detectProfile(wb).profile, path.basename(entry.file));
          results.push({
            year: entry.year,
            month: entry.month,
            file: entry.file,
            status: extracted.year === entry.year && extracted.month === entry.month ? 'ok' : 'error',
            message: `estratto ${extracted.year}/${extracted.month}`,
          });
        } catch (err) {
          results.push({
            year: entry.year,
            month: entry.month,
            file: entry.file,
            status: 'error',
            message: (err as Error).message,
          });
        }
      }
      console.table(results);
      return;
    }

    const companies = await loadCompanies(pool);
    const company = companies.find((c) => c.slug === COMPANY_SLUG);
    if (!company) throw new Error(`Company '${COMPANY_SLUG}' non trovata`);

    const codeMap = await loadCodeMap(pool);
    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);
    const ledgerMappings = (await loadLedgerMappings(pool, company.id)).map((m) => ({
      accountCode: m.accountCode,
      analiticaLabel: m.analiticaLabel,
      signMultiplier: m.signMultiplier,
      famiglia: m.famiglia ?? null,
    }));

    console.log(`\nLedger mappings: ${ledgerMappings.length}`);
    console.log(`Company: ${company.name} (${company.id})\n`);

    let started = fromKey == null;
    for (const entry of sequence) {
      const key = periodKey(entry.year, entry.month);
      if (!started) {
        if (key === fromKey) started = true;
        else continue;
      }

      if (!entry.forceReplace && !forceAll && entry.skipIfExists) {
        const exists = await hasExistingFacts(pool, company.id, entry.year, entry.month);
        if (exists) {
          results.push({ year: entry.year, month: entry.month, file: entry.file, status: 'skip', message: 'già presente' });
          console.log(`[SKIP] ${key} — già presente`);
          continue;
        }
      }

      const replaceExisting = true;

      console.log(`[IMPORT] ${key} replace=${replaceExisting} — ${path.basename(entry.file)}`);
      const result = await importOne(
        pool,
        company.id,
        codeMap,
        ledgerMappings,
        labelResolver,
        entry,
        replaceExisting,
        false,
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
        message: r.message ?? '',
      })),
    );

    await verifyDb(pool, company.id, verifyYears);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

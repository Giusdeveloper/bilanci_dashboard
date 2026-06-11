/**
 * import_sherpa_chronological — import cronologico bilancini Sherpa42 con publish_facts.
 *
 * Uso:
 *   npx tsx scripts/import_sherpa_chronological.ts
 *   npx tsx scripts/import_sherpa_chronological.ts --dry-run
 *   npx tsx scripts/import_sherpa_chronological.ts --year 2025
 *   npx tsx scripts/import_sherpa_chronological.ts --from 2025-06
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
  buildLedgerMappingStubs,
} from '../shared/etl/index';
import { GOLDEN_CASES } from '../shared/etl/__fixtures__/goldenKpis.ts';
import {
  createPool,
  loadCompanies,
  loadLedgerMappings,
  loadFinancialFacts,
  loadCodeMap,
  persistBilancinoPlan,
  persistBilancinoFacts,
  hasExistingFacts,
  upsertLedgerMappingStubs,
  type AccountBalanceRow,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'sherpa42';
const ROOT = process.cwd();
const BILANCINI_2025 = 'import_data/Bilancini/Sherpa/Bilancini 2025';
const BILANCINI_2026 = 'import_data/Bilancini/Sherpa/Bilancini 2026';

type ImportEntry = {
  year: number;
  month: number;
  file: string;
  skipIfExists?: boolean;
};

/** Sequenza cronologica canonical (cartella Bilancini/Sherpa). Gen 2025 assente. */
const IMPORT_SEQUENCE_2025: ImportEntry[] = [
  { year: 2025, month: 2, file: `${BILANCINI_2025}/SHERPA 02.xlsx` },
  { year: 2025, month: 3, file: `${BILANCINI_2025}/SHERPA 03.xlsx` },
  { year: 2025, month: 4, file: `${BILANCINI_2025}/SHERPA 04.xlsx` },
  { year: 2025, month: 5, file: `${BILANCINI_2025}/SHERPA 05.xlsx` },
  { year: 2025, month: 6, file: `${BILANCINI_2025}/sherpa 06 25.xlsx` },
  { year: 2025, month: 7, file: `${BILANCINI_2025}/SHERPA 07 25.xlsx` },
  { year: 2025, month: 8, file: `${BILANCINI_2025}/SHERPA 08 25.xlsx` },
  { year: 2025, month: 9, file: `${BILANCINI_2025}/SHERPA 09 25.xlsx` },
  { year: 2025, month: 10, file: `${BILANCINI_2025}/SHERPA 10 25_.xlsx` },
  { year: 2025, month: 11, file: `${BILANCINI_2025}/SHERPA 11 25.xlsx` },
  { year: 2025, month: 12, file: `${BILANCINI_2025}/SHERPA 12 25.xlsx`, skipIfExists: true },
];

const IMPORT_SEQUENCE_2026: ImportEntry[] = [
  { year: 2026, month: 1, file: `${BILANCINI_2026}/SHERPA42 SRL 01 26.xlsx` },
  { year: 2026, month: 2, file: `${BILANCINI_2026}/SHERPA42 SRL 02 26 provvisorio.xlsx` },
  { year: 2026, month: 3, file: `${BILANCINI_2026}/SHERPA42 SRL 03 26.xlsx` },
  { year: 2026, month: 4, file: `${BILANCINI_2026}/SHERPA42 SRL 30 04 provvisorio.xlsx` },
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
  stubs?: number;
  kpis?: Record<string, number | undefined>;
}

function resolveSequence(year?: number): ImportEntry[] {
  if (year === 2025) return IMPORT_SEQUENCE_2025;
  if (year === 2026) return IMPORT_SEQUENCE_2026;
  return [...IMPORT_SEQUENCE_2025, ...IMPORT_SEQUENCE_2026];
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
  createStubs: boolean,
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
        profile: detection.profile.id,
        message: `Periodo file ${extracted.year}/${extracted.month} ≠ atteso ${entry.year}/${entry.month}`,
      };
    }

    let stubsCreated = 0;
    let activeMappings = ledgerMappings;
    if (createStubs && !dryRun) {
      const existingCodes = new Set(activeMappings.map((m) => m.accountCode));
      const stubs = buildLedgerMappingStubs(extracted.accounts, existingCodes);
      if (stubs.length > 0) {
        stubsCreated = await upsertLedgerMappingStubs(pool, companyId, stubs);
        const refreshed = await loadLedgerMappings(pool, companyId);
        activeMappings = refreshed.map((m) => ({
          accountCode: m.accountCode,
          analiticaLabel: m.analiticaLabel,
          signMultiplier: m.signMultiplier,
          famiglia: m.famiglia ?? null,
        }));
      }
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
      ledgerMappings: activeMappings,
      labelResolver,
      extract: extracted,
      sourceFilename: path.basename(entry.file),
      previousProgressive,
      companySlug: COMPANY_SLUG,
    });

    const errorCount = result.warnings.filter((w) => w.severity === 'error').length;
    if (errorCount > 0) {
      const errMsgs = result.warnings.filter((w) => w.severity === 'error').map((w) => w.message);
      return {
        ...base,
        status: 'error',
        profile: detection.profile.id,
        stubs: stubsCreated,
        message: `${errorCount} errori pipeline: ${errMsgs.slice(0, 3).join('; ')}`,
        kpis: result.kpis,
      };
    }

    if (dryRun) {
      return {
        ...base,
        status: 'ok',
        profile: detection.profile.id,
        message: `[dry-run] facts=${result.facts.length}, profile=${detection.profile.id}`,
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
      profile: detection.profile.id,
      stubs: stubsCreated,
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

  const { rows: balances } = await pool.query(
    `select year, month, count(*)::int as accounts
       from account_balances
      where company_id = $1 and year = any($2::int[])
      group by year, month
      order by year, month`,
    [companyId, years],
  );
  console.log('\n===== account_balances per mese =====');
  console.table(balances);

  const decYear = years.includes(2025) ? 2025 : years[years.length - 1];
  const kpiCodes = ['totaleRicavi', 'ebitda', 'risultatoEsercizio'];
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

function verifyGoldenKpis(kpis: Record<string, number | undefined>, year: number): void {
  const golden = GOLDEN_CASES.find((g) => g.companySlug === COMPANY_SLUG && g.year === year);
  if (!golden) {
    console.log(`\n[golden] Nessun oracolo per ${COMPANY_SLUG} ${year}`);
    return;
  }
  console.log(`\n===== Verifica golden KPI ${year} (vs ${path.basename(golden.file)}) =====`);
  const tolerance = 0.02;
  for (const [code, expected] of Object.entries(golden.kpis)) {
    const actual = kpis[code];
    const delta = actual != null ? Math.abs(actual - expected) : null;
    const ok = delta != null && delta <= tolerance;
    console.log(
      `  ${code}: atteso=${expected.toFixed(2)}, db=${actual?.toFixed(2) ?? 'n/d'}, delta=${delta?.toFixed(2) ?? 'n/d'} ${ok ? 'OK' : 'DIFF'}`,
    );
  }
}

async function main(): Promise<void> {
  const { dryRun, fromKey, forceAll, year } = parseArgs();
  const sequence = resolveSequence(year);
  const verifyYears = year != null ? [year] : [2025, 2026];

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  console.log(`Sequenza import Sherpa42 (publish_facts=true)${year != null ? ` — anno ${year}` : ''}\n`);
  console.table(
    sequence.map((e) => ({
      periodo: periodKey(e.year, e.month),
      file: e.file,
    })),
  );

  const pool = dryRun ? null : createPool();
  const results: ImportResult[] = [];

  try {
    if (!pool) {
      console.log('\n[dry-run] Verifica file, profilo e periodi estratti...\n');
      for (const entry of sequence) {
        const absPath = path.join(ROOT, entry.file);
        try {
          const bytes = readFileSync(absPath);
          const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
          const detection = detectProfile(wb);
          const extracted = extractBilancino(wb, detection.profile, path.basename(entry.file));
          results.push({
            year: entry.year,
            month: entry.month,
            file: entry.file,
            status: extracted.year === entry.year && extracted.month === entry.month ? 'ok' : 'error',
            profile: detection.profile.id,
            message: `estratto ${extracted.year}/${extracted.month}, accounts=${extracted.accounts.length}`,
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
    if (!company) throw new Error(`Company '${COMPANY_SLUG}' non trovata in DB`);

    const codeMap = await loadCodeMap(pool);
    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);
    let ledgerMappings = (await loadLedgerMappings(pool, company.id)).map((m) => ({
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

      if (!forceAll && entry.skipIfExists) {
        const exists = await hasExistingFacts(pool, company.id, entry.year, entry.month);
        if (exists) {
          results.push({ year: entry.year, month: entry.month, file: entry.file, status: 'skip', message: 'già presente' });
          console.log(`[SKIP] ${key} — già presente`);
          continue;
        }
      }

      console.log(`[IMPORT] ${key} — ${path.basename(entry.file)}`);
      const result = await importOne(
        pool,
        company.id,
        codeMap,
        ledgerMappings,
        labelResolver,
        entry,
        true,
        false,
        true,
      );
      results.push(result);
      console.log(
        `  → ${result.status.toUpperCase()}${result.profile ? ` [${result.profile}]` : ''}${result.message ? `: ${result.message}` : ''}`,
      );
      if (result.stubs) console.log(`     stubs creati: ${result.stubs}`);
      if (result.kpis?.totaleRicavi != null) {
        console.log(
          `     totaleRicavi=${result.kpis.totaleRicavi.toFixed(2)}, risultato=${result.kpis.risultatoEsercizio?.toFixed(2) ?? 'n/d'}`,
        );
      }

      if (result.status === 'ok') {
        ledgerMappings = (await loadLedgerMappings(pool, company.id)).map((m) => ({
          accountCode: m.accountCode,
          analiticaLabel: m.analiticaLabel,
          signMultiplier: m.signMultiplier,
          famiglia: m.famiglia ?? null,
        }));
      }
    }

    console.log('\n===== ESITO IMPORT =====');
    console.table(
      results.map((r) => ({
        periodo: periodKey(r.year, r.month),
        status: r.status,
        profile: r.profile ?? '-',
        facts: r.facts ?? '-',
        stubs: r.stubs ?? '-',
        message: r.message ?? '',
      })),
    );

    await verifyDb(pool, company.id, verifyYears);

    const dec2025 = results.find((r) => r.year === 2025 && r.month === 12 && r.status === 'ok');
    if (dec2025?.kpis) verifyGoldenKpis(dec2025.kpis, 2025);
    else if (verifyYears.includes(2025)) {
      const prevFacts = await loadFinancialFacts(pool, company.id, 2025, 12);
      if (prevFacts.length > 0) {
        const kpis: Record<string, number | undefined> = {};
        for (const f of prevFacts) {
          if (['totaleRicavi', 'ebitda', 'risultatoEsercizio'].includes(f.categoryCode)) {
            kpis[f.categoryCode] = f.amountProgressive;
          }
        }
        verifyGoldenKpis(kpis, 2025);
      }
    }
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

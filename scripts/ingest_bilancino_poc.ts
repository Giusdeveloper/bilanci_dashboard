/**
 * ingest_bilancino_poc — Fase 2 PoC bilancino Awentia.
 *
 * Estrae il bilancino contabile, carica saldi in account_balances e (opzionale)
 * confronta l'aggregato in memoria con financial_facts esistenti.
 *
 * Uso:
 *   npx tsx scripts/ingest_bilancino_poc.ts --dry-run
 *   npx tsx scripts/ingest_bilancino_poc.ts
 *   npx tsx scripts/ingest_bilancino_poc.ts --compare
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
  upsertAccountBalances,
  upsertImportRecord,
  type AccountBalanceRow,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'awentia';
const BILANCINO_FILE = path.join(
  'import_data',
  'Bilancini',
  'AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx',
);

const COMPARE_KEYS = ['totaleRicavi', 'risultatoEsercizio', 'ebitda', 'totaleCosti'];
const TOLERANCE = 0.01;

function parseArgs(): { dryRun: boolean; compare: boolean; profileId?: string } {
  const args = process.argv.slice(2);
  const profileIdx = args.indexOf('--profile');
  const profileId = profileIdx >= 0 ? args[profileIdx + 1] : undefined;
  return {
    dryRun: args.includes('--dry-run'),
    compare: args.includes('--compare'),
    profileId,
  };
}

function toAccountBalanceRows(
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

function printExtractSummary(extracted: ReturnType<typeof extractBilancino>): void {
  console.log(`Profilo: ${extracted.profileId}`);
  console.log(`Azienda: ${extracted.companyName}`);
  console.log(`Periodo: ${extracted.year}/${String(extracted.month).padStart(2, '0')}`);
  console.log(`Conti CE leaf: ${extracted.accounts.length}`);
  console.log('Totali bilancino (quadratura interna):');
  console.log(`  totaleRicavi:  ${extracted.totals.totaleRicavi?.toFixed(2) ?? 'n/d'}`);
  console.log(`  totaleCosti:   ${extracted.totals.totaleCosti?.toFixed(2) ?? 'n/d'}`);
  console.log(`  risultato:     ${extracted.totals.risultato?.toFixed(2) ?? 'n/d'}`);
}

function buildFactsMap(
  facts: Awaited<ReturnType<typeof loadFinancialFacts>>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of facts) {
    if (f.month != null) map.set(f.categoryCode, f.amountProgressive);
  }
  for (const f of facts) {
    if (f.month == null && !map.has(f.categoryCode)) {
      map.set(f.categoryCode, f.amountProgressive);
    }
  }
  return map;
}

async function runCompare(
  pool: ReturnType<typeof createPool>,
  companyId: string,
  extracted: ReturnType<typeof extractBilancino>,
  pipelineResult: ReturnType<typeof runBilancinoPipeline>,
): Promise<void> {
  const dbFacts = await loadFinancialFacts(pool, companyId, extracted.year, extracted.month);
  const dbAnnual = await loadFinancialFacts(pool, companyId, extracted.year);
  const dbMap = buildFactsMap([...dbAnnual, ...dbFacts]);

  console.log('\n--- Confronto bilancino vs financial_facts ---');
  console.log(`Fonte DB: year=${extracted.year}, preferenza month=${extracted.month} se presente`);

  let deltasAboveTolerance = 0;

  for (const key of COMPARE_KEYS) {
    const bil = pipelineResult.kpis[key];
    const db = dbMap.get(key);
    if (bil == null && db == null) continue;
    const delta = bil != null && db != null ? bil - db : null;
    const ok = delta != null && Math.abs(delta) <= TOLERANCE;
    if (bil != null && db != null && !ok) deltasAboveTolerance += 1;
    console.log(
      `  ${key}: bilancino=${bil?.toFixed(2) ?? 'n/d'} | DB=${db?.toFixed(2) ?? 'n/d'} | delta=${delta?.toFixed(2) ?? 'n/d'} ${ok ? 'OK' : 'DIFF'}`,
    );
  }

  const pipelineMap = new Map(pipelineResult.facts.map((f) => [f.categoryCode, f.amountProgressive]));
  const sharedCodes = [...pipelineMap.keys()].filter((c) => dbMap.has(c));
  let categoryDiffs = 0;
  for (const code of sharedCodes.sort()) {
    const delta = (pipelineMap.get(code) ?? 0) - (dbMap.get(code) ?? 0);
    if (Math.abs(delta) > TOLERANCE) {
      categoryDiffs += 1;
      if (categoryDiffs <= 10) {
        console.log(`  [cat] ${code}: delta=${delta.toFixed(2)}`);
      }
    }
  }
  if (categoryDiffs > 10) {
    console.log(`  ... altre ${categoryDiffs - 10} categorie con delta > ${TOLERANCE}`);
  }

  console.log(`\nCategorie condivise: ${sharedCodes.length}, diffs > ${TOLERANCE}: ${categoryDiffs}`);
  console.log(`KPI principali diffs: ${deltasAboveTolerance}`);
}

async function main(): Promise<void> {
  const { dryRun, compare, profileId } = parseArgs();

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  const bytes = readFileSync(BILANCINO_FILE);
  const fileHash = await sha256Hex(new Uint8Array(bytes));
  const wb = readWorkbookData(XLSX as never, new Uint8Array(bytes));
  const detection = detectProfile(wb, profileId);
  const extracted = extractBilancino(wb, detection.profile);

  printExtractSummary(extracted);

  if (detection.usedFallback) {
    console.warn(`Warning: detection fallback (score=${detection.score})`);
  }

  const pool = dryRun && !compare ? null : createPool();

  try {
    let companyId = 'dry-run';
    if (pool) {
      const companies = await loadCompanies(pool);
      const company = companies.find((c) => c.slug === COMPANY_SLUG);
      if (!company) throw new Error(`Company '${COMPANY_SLUG}' non trovata`);
      companyId = company.id;
    }

    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);

    let ledgerMappings: Array<{ accountCode: string; analiticaLabel: string; signMultiplier: number }> = [];
    if (pool) {
      ledgerMappings = (await loadLedgerMappings(pool, companyId)).map((m) => ({
        accountCode: m.accountCode,
        analiticaLabel: m.analiticaLabel,
        signMultiplier: m.signMultiplier,
      }));
    }

    const pipelineResult = runBilancinoPipeline({
      workbook: wb,
      ledgerMappings,
      labelResolver,
      extract: extracted,
    });

    console.log(`\nPipeline in memoria: ${pipelineResult.facts.length} voci CE, ${pipelineResult.warnings.length} warning`);
    console.log(`KPI pipeline: totaleRicavi=${pipelineResult.kpis.totaleRicavi?.toFixed(2) ?? 'n/d'}, risultato=${pipelineResult.kpis.risultatoEsercizio?.toFixed(2) ?? 'n/d'}`);

    if (compare && pool) {
      await runCompare(pool, companyId, extracted, pipelineResult);
    }

    if (dryRun) {
      console.log('\n[dry-run] Nessuna scrittura su account_balances / imports.');
      return;
    }

    if (!pool) return;

    const importId = await upsertImportRecord(pool, {
      companyId,
      sourceFilename: path.basename(BILANCINO_FILE),
      fileHash,
      templateProfile: extracted.profileId,
      status: 'completed',
    });

    const balanceRows = toAccountBalanceRows(companyId, extracted);
    const count = await upsertAccountBalances(pool, importId, companyId, balanceRows);
    console.log(`\nIngest completato: import_id=${importId}, account_balances=${count} righe`);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

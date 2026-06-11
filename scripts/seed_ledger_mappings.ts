/**
 * seed_ledger_mappings — popola ledger_account_mappings dalla sheet Source.
 *
 * Uso:
 *   npx tsx scripts/seed_ledger_mappings.ts --company awentia --dry-run
 *   npx tsx scripts/seed_ledger_mappings.ts --all
 *   npx tsx scripts/seed_ledger_mappings.ts --all --dry-run
 */

import 'dotenv/config';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { extractSourceMapping } from '../shared/etl/seed/extractSourceMapping.ts';
import { resolveMasterAccountId } from '../shared/etl/seed/ledgerMappingResolve.ts';
import { readWorkbookData, findSheetName, getSheet } from '../shared/etl/workbook.ts';
import { slugFromFilename } from './lib/companySlug.ts';
import {
  createPool,
  loadCompanies,
  loadCodeMap,
  upsertLedgerMappings,
  type LedgerAccountMapping,
  type Company,
} from './lib/bilanciLoader.ts';

const IMPORT_DIRS = ['import_data/2025', 'import_data/2026'];

interface SeedTarget {
  slug: string;
  file: string;
}

function listAnalisiFilesByCompany(): Map<string, string> {
  const bySlug = new Map<string, string>();
  for (const dir of [...IMPORT_DIRS].reverse()) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.xlsx') || name.startsWith('~$')) continue;
      const slug = slugFromFilename(name);
      if (!slug || bySlug.has(slug)) continue;
      bySlug.set(slug, path.join(dir, name));
    }
  }
  return bySlug;
}

function parseArgs(): { targets: SeedTarget[]; dryRun: boolean } {
  const dryRun = process.argv.includes('--dry-run');
  const all = process.argv.includes('--all');
  const companyIdx = process.argv.indexOf('--company');
  const companySlug = companyIdx >= 0 ? process.argv[companyIdx + 1] : null;

  if (!all && !companySlug) {
    throw new Error('Specificare --company <slug> oppure --all');
  }

  const filesBySlug = listAnalisiFilesByCompany();
  const targets: SeedTarget[] = [];

  if (all) {
    for (const [slug, file] of filesBySlug) targets.push({ slug, file });
  } else if (companySlug) {
    const file = filesBySlug.get(companySlug);
    if (!file) {
      throw new Error(`Nessun file analisi trovato per company '${companySlug}' in ${IMPORT_DIRS.join(', ')}`);
    }
    targets.push({ slug: companySlug, file });
  }

  return { targets, dryRun };
}

async function loadAnaliticaLabelMap(
  pool: ReturnType<typeof createPool>,
  companyId: string,
): Promise<Map<string, string>> {
  const { rows } = await pool.query(
    `select am.original_label as label, am.master_account_id as master_id
       from account_mappings am
      where am.company_id = $1`,
    [companyId],
  );
  const map = new Map<string, string>();
  for (const r of rows as Array<{ label: string; master_id: string }>) {
    map.set(r.label.trim(), r.master_id);
  }
  return map;
}

function toLedgerMapping(companyId: string, resolved: ReturnType<typeof resolveMasterAccountId>): LedgerAccountMapping {
  return {
    companyId,
    accountCode: resolved.row.accountCode,
    accountDescription: resolved.row.accountDescription || null,
    famiglia: resolved.row.famiglia || null,
    analiticaLabel: resolved.row.analiticaLabel,
    masterAccountId: resolved.masterAccountId,
    signMultiplier: resolved.signMultiplier,
    sourceSheet: 'Source',
  };
}

async function seedCompany(
  pool: ReturnType<typeof createPool> | null,
  company: Company,
  file: string,
  dryRun: boolean,
): Promise<{ upserted: number; sourceRows: number; skipped: boolean }> {
  const bytes = readFileSync(file);
  const wb = readWorkbookData(XLSX, bytes);
  const sheetName = findSheetName(wb, /^source$/i);
  if (!sheetName) {
    console.warn(`  [SKIP] ${company.slug}: foglio Source assente in ${path.basename(file)}`);
    return { upserted: 0, sourceRows: 0, skipped: true };
  }

  const sourceRows = extractSourceMapping(getSheet(wb, sheetName));
  console.log(`  Source: ${sourceRows.length} codici (${path.basename(file)}, foglio ${sheetName})`);

  let labelMap = new Map<string, string>();
  let codeMap = new Map<string, string>();
  if (pool) {
    labelMap = await loadAnaliticaLabelMap(pool, company.id);
    codeMap = await loadCodeMap(pool);
  }

  const resolved = sourceRows.map((row) =>
    pool ? resolveMasterAccountId(row, labelMap, codeMap) : {
      row,
      masterAccountId: null,
      signMultiplier: row.accountCode.startsWith('58/') ? -1 : 1,
      resolution: 'unmapped' as const,
    },
  );

  const byResolution = {
    account_mappings: resolved.filter((r) => r.resolution === 'account_mappings').length,
    canonical_fallback: resolved.filter((r) => r.resolution === 'canonical_fallback').length,
    unmapped: resolved.filter((r) => r.resolution === 'unmapped').length,
  };
  const ricavi = resolved.filter((r) => r.signMultiplier === -1).length;
  console.log(`  Risoluzione: direct=${byResolution.account_mappings}, fallback=${byResolution.canonical_fallback}, unmapped=${byResolution.unmapped}, ricavi=${ricavi}`);

  if (dryRun || !pool) {
    return { upserted: sourceRows.length, sourceRows: sourceRows.length, skipped: false };
  }

  const ledgerRows = resolved.map((r) => toLedgerMapping(company.id, r));
  const count = await upsertLedgerMappings(pool, company.id, ledgerRows);
  return { upserted: count, sourceRows: sourceRows.length, skipped: false };
}

async function main(): Promise<void> {
  const { targets, dryRun } = parseArgs();

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  const pool = dryRun ? null : createPool();
  const companies = pool ? await loadCompanies(pool) : [];
  const bySlug = new Map(companies.map((c) => [c.slug, c]));

  console.log(`Seed ledger mappings — ${targets.length} aziende${dryRun ? ' [dry-run]' : ''}\n`);

  const summary: Array<{ slug: string; upserted: number; sourceRows: number; skipped: boolean }> = [];

  try {
    for (const { slug, file } of targets.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.log(`\n[${slug}]`);
      if (pool && !bySlug.has(slug)) {
        console.warn(`  [SKIP] company slug '${slug}' non trovata in DB`);
        summary.push({ slug, upserted: 0, sourceRows: 0, skipped: true });
        continue;
      }
      const company = pool ? bySlug.get(slug)! : { id: 'dry-run', slug, name: slug };
      const result = await seedCompany(pool, company, file, dryRun);
      summary.push({ slug, ...result });
      if (!result.skipped && !dryRun && pool) {
        console.log(`  Upsert: ${result.upserted} righe in ledger_account_mappings`);
      }
    }

    console.log('\n--- Riepilogo ---');
    for (const row of summary) {
      const status = row.skipped ? 'SKIP' : dryRun ? 'DRY' : 'OK';
      console.log(`  ${row.slug.padEnd(28)} ${status.padEnd(5)} source=${row.sourceRows} upserted=${row.upserted}`);
    }

    if (dryRun) console.log('\n[dry-run] Nessuna scrittura su ledger_account_mappings.');
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * @deprecated Usare scripts/seed_ledger_mappings.ts (--company awentia | --all).
 *
 * Wrapper retrocompatibile per seed Awentia.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { getCanonicalKey } from '../shared/domain/labelMapping.ts';
import {
  extractSourceMapping,
  isRicaviAccount,
  type SourceMappingRow,
} from '../shared/etl/seed/extractSourceMapping.ts';
import { readWorkbookData, findSheetName, getSheet } from '../shared/etl/workbook.ts';
import {
  createPool,
  loadCompanies,
  loadCodeMap,
  upsertLedgerMappings,
  type LedgerAccountMapping,
} from './lib/bilanciLoader.ts';

const COMPANY_SLUG = 'awentia';
const SOURCE_FILE = path.join('import_data', '2025', '[2025] Analisi Bilanci Awentia v. 2.xlsx');

interface ResolvedMapping {
  row: SourceMappingRow;
  masterAccountId: string | null;
  signMultiplier: number;
  resolution: 'account_mappings' | 'canonical_fallback' | 'unmapped';
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

function resolveSignMultiplier(row: SourceMappingRow): number {
  return isRicaviAccount(row) ? -1 : 1;
}

function resolveMasterAccountId(
  row: SourceMappingRow,
  labelMap: Map<string, string>,
  codeMap: Map<string, string>,
): ResolvedMapping {
  const signMultiplier = resolveSignMultiplier(row);
  const direct = labelMap.get(row.analiticaLabel.trim());
  if (direct) {
    return { row, masterAccountId: direct, signMultiplier, resolution: 'account_mappings' };
  }

  const canonical = getCanonicalKey(row.analiticaLabel);
  if (canonical) {
    const masterId = codeMap.get(canonical) ?? null;
    if (masterId) {
      return { row, masterAccountId: masterId, signMultiplier, resolution: 'canonical_fallback' };
    }
  }

  return { row, masterAccountId: null, signMultiplier, resolution: 'unmapped' };
}

function toLedgerMapping(companyId: string, resolved: ResolvedMapping): LedgerAccountMapping {
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

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  const bytes = readFileSync(SOURCE_FILE);
  const wb = readWorkbookData(XLSX, bytes);
  const sheetName = findSheetName(wb, /^source$/i);
  if (!sheetName) {
    throw new Error(`Foglio Source non trovato in ${SOURCE_FILE}`);
  }

  const sourceRows = extractSourceMapping(getSheet(wb, sheetName));
  console.log(`Source: ${sourceRows.length} codici con analitica (${sheetName})`);

  const pool = dryRun ? null : createPool();

  try {
    let companyId = 'dry-run';
    let labelMap = new Map<string, string>();
    let codeMap = new Map<string, string>();

    if (pool) {
      const companies = await loadCompanies(pool);
      const company = companies.find((c) => c.slug === COMPANY_SLUG);
      if (!company) {
        throw new Error(`Company slug '${COMPANY_SLUG}' non trovata in companies`);
      }
      companyId = company.id;
      labelMap = await loadAnaliticaLabelMap(pool, companyId);
      codeMap = await loadCodeMap(pool);
    } else {
      console.log('(dry-run: skip lookup DB master_account_id)');
    }

    const resolved = sourceRows.map((row) =>
      pool ? resolveMasterAccountId(row, labelMap, codeMap) : {
        row,
        masterAccountId: null,
        signMultiplier: resolveSignMultiplier(row),
        resolution: 'unmapped' as const,
      },
    );

    const byResolution = {
      account_mappings: resolved.filter((r) => r.resolution === 'account_mappings').length,
      canonical_fallback: resolved.filter((r) => r.resolution === 'canonical_fallback').length,
      unmapped: resolved.filter((r) => r.resolution === 'unmapped').length,
    };
    const ricavi = resolved.filter((r) => r.signMultiplier === -1).length;

    console.log(`Risoluzione master_account_id: direct=${byResolution.account_mappings}, fallback=${byResolution.canonical_fallback}, unmapped=${byResolution.unmapped}`);
    console.log(`Conti ricavi (sign -1): ${ricavi}`);

    const unmapped = resolved.filter((r) => r.resolution === 'unmapped');
    if (unmapped.length > 0) {
      console.log('\nWarning — analitica non mappata a master:');
      const labels = [...new Set(unmapped.map((r) => r.row.analiticaLabel))].sort();
      for (const label of labels) {
        const count = unmapped.filter((r) => r.row.analiticaLabel === label).length;
        console.log(`  - "${label}" (${count} conti)`);
      }
    }

    if (dryRun) {
      console.log('\n[dry-run] Nessuna scrittura su ledger_account_mappings.');
      return;
    }

    const ledgerRows = resolved.map((r) => toLedgerMapping(companyId, r));
    const count = await upsertLedgerMappings(pool!, companyId, ledgerRows);
    console.log(`\nUpsert completato: ${count} righe in ledger_account_mappings (company=${COMPANY_SLUG})`);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

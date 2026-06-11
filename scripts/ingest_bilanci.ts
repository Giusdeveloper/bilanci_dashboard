/**
 * ingest_bilanci — orchestratore di ingest dei file Excel di bilancio.
 *
 * Ingestiona TUTTI i file in import_data/2025 e import_data/2026 riusando lo
 * STESSO core della Edge Function (`shared/etl`): hash -> detect profilo ->
 * extract -> map (account_mappings + fallback) -> validazione/quadrature ->
 * load idempotente. Stampa un riepilogo di facts/warning per azienda/anno.
 *
 * Uso:
 *   npx tsx scripts/ingest_bilanci.ts            # ingest reale
 *   npx tsx scripts/ingest_bilanci.ts --dry-run  # solo estrazione, nessun write
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  buildResolver,
  runPipeline,
  buildLoadPlan,
  sha256Hex,
  buildMasterChart,
} from '../shared/etl/index';
import {
  createPool,
  loadCompanies,
  loadCodeMap,
  loadCompanyMappings,
  ensureSeed,
  loadPlanToDb,
  type Company,
} from './lib/bilanciLoader';
import { slugFromFilename } from './lib/companySlug';

const IMPORT_DIRS = ['import_data/2025', 'import_data/2026'];

function listExcelFiles(): string[] {
  const out: string[] = [];
  for (const dir of IMPORT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.xlsx')) continue;
      if (name.startsWith('~$')) continue; // file di lock temporaneo
      out.push(path.join(dir, name));
    }
  }
  return out.sort();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const pool = createPool();

  try {
    const companies = await loadCompanies(pool);
    const bySlug = new Map<string, Company>(companies.map((c) => [c.slug, c]));

    if (!dryRun) {
      console.log('Seed master_chart_of_accounts + account_mappings...');
      const seed = await ensureSeed(pool, companies);
      console.log(`  conti canonici: ${seed.accounts}, mapping: ${seed.mappings}`);
    }

    const codeMap = await loadCodeMap(pool);
    // I code canonici validi per il resolver derivano dalla gerarchia canonica
    // (verita' di dominio), non dallo stato del DB: cosi' il dry-run funziona
    // anche prima del seed.
    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const files = listExcelFiles();
    console.log(`\nFile da ingestionare: ${files.length}`);

    const summary: Array<Record<string, unknown>> = [];

    for (const file of files) {
      const filename = path.basename(file);
      const slug = slugFromFilename(filename);
      if (!slug || !bySlug.has(slug)) {
        console.warn(`  [SKIP] ${filename}: company non riconosciuta`);
        continue;
      }
      const company = bySlug.get(slug)!;

      const bytes = new Uint8Array(fs.readFileSync(file));
      const fileHash = await sha256Hex(bytes);
      const wb = readWorkbookData(XLSX as never, bytes);
      const detection = detectProfile(wb);

      const explicit = dryRun ? [] : await loadCompanyMappings(pool, company.id);
      const resolver = buildResolver(explicit, validCodes);

      let result;
      try {
        result = runPipeline({
          workbook: wb,
          profile: detection.profile,
          resolver,
          detectionFallback: detection.usedFallback,
        });
      } catch (err) {
        console.error(`  [ERRORE] ${filename}: ${(err as Error).message}`);
        continue;
      }

      const errors = result.warnings.filter((w) => w.severity === 'error').length;
      const warns = result.warnings.filter((w) => w.severity === 'warning').length;
      const infos = result.warnings.filter((w) => w.severity === 'info').length;
      const annual = result.facts.filter((f) => f.month == null).length;
      const monthly = result.facts.filter((f) => f.month != null).length;

      let loadInfo = '(dry-run)';
      if (!dryRun) {
        const plan = buildLoadPlan(company.id, filename, fileHash, result);
        const counts = await loadPlanToDb(pool, plan, codeMap);
        loadInfo = `import=${counts.importId.slice(0, 8)}`;
      }

      summary.push({
        company: company.name,
        anno: result.currentYear,
        profilo: result.profileId,
        meseRif: result.referenceMonth,
        factsAnnuali: annual,
        factsMensili: monthly,
        ricavi: result.kpis.totaleRicavi ?? result.kpis.ricaviCaratteristici ?? null,
        ebitda: result.kpis.ebitda ?? null,
        risultato: result.kpis.risultatoEsercizio ?? null,
        err: errors,
        warn: warns,
        info: infos,
      });
      console.log(
        `  [OK] ${company.name} ${result.currentYear} (${result.profileId}) ` +
          `facts ${annual}+${monthly}, warn ${warns}/info ${infos}/err ${errors} ${loadInfo}`,
      );
    }

    console.log('\n===== RIEPILOGO =====');
    console.table(summary);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

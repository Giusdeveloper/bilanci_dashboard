/**
 * seed_ledger_from_bilancino — stub conti dall'ultimo bilancino company.
 *
 * Per ogni conto CE leaf non ancora mappato crea uno stub con descrizione,
 * famiglia suggerita da prefix rules del ce_profile, analitica placeholder.
 *
 * Uso:
 *   npx tsx scripts/seed_ledger_from_bilancino.ts --company awentia --dry-run
 *   npx tsx scripts/seed_ledger_from_bilancino.ts --company sherpa42
 *   npx tsx scripts/seed_ledger_from_bilancino.ts --company awentia --file "import_data/..."
 */

import 'dotenv/config';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  detectProfile,
  extractBilancino,
  getCeProfile,
  readWorkbookData,
  suggestFamigliaFromAccountCode,
} from '../shared/etl/index.ts';
import {
  createPool,
  loadCompanies,
  loadLedgerMappings,
  upsertLedgerMappingStubs,
  type Company,
} from './lib/bilanciLoader.ts';
import type { LedgerMappingStub } from '../shared/etl/ledgerMappingStubs.ts';

const BILANCINI_ROOTS = [
  'import_data/Bilancini',
  'import_data/2026/Bilancini 2026',
];

function parseArgs(): { companySlug: string; dryRun: boolean; file?: string } {
  const dryRun = process.argv.includes('--dry-run');
  const companyIdx = process.argv.indexOf('--company');
  const fileIdx = process.argv.indexOf('--file');
  const companySlug = companyIdx >= 0 ? process.argv[companyIdx + 1] : null;
  const file = fileIdx >= 0 ? process.argv[fileIdx + 1] : undefined;
  if (!companySlug) {
    throw new Error('Specificare --company <slug>');
  }
  return { companySlug, dryRun, file };
}

function isBilancinoFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (lower.endsWith('.xlsx') || lower.endsWith('.csv')) && !name.startsWith('~$');
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
  return readWorkbookData(XLSX, readFileSync(absPath));
}

function collectBilanciniFiles(companySlug: string): string[] {
  const out: string[] = [];
  const slugHints =
    companySlug === 'sherpa42'
      ? ['sherpa', 'sherpa42']
      : companySlug === 'maia-management'
        ? ['maia']
        : [companySlug, 'awentia'];

  for (const root of BILANCINI_ROOTS) {
    if (!existsSync(root)) continue;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!isBilancinoFile(entry.name)) continue;
        const lower = entry.name.toLowerCase();
        if (slugHints.some((h) => lower.includes(h))) out.push(full);
      }
    };
    walk(root);
  }
  return out;
}

function pickLatestBilancino(companySlug: string): string | null {
  const files = collectBilanciniFiles(companySlug);
  if (files.length === 0) return null;
  return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
}

async function loadFamigliaLabels(
  pool: ReturnType<typeof createPool>,
  companyId: string,
): Promise<Map<string, string>> {
  const { rows } = await pool.query(
    `select code, label from company_famiglie where company_id = $1 order by sort_order`,
    [companyId],
  );
  return new Map((rows as Array<{ code: string; label: string }>).map((r) => [r.code, r.label]));
}

async function main(): Promise<void> {
  const { companySlug, dryRun, file: fileArg } = parseArgs();

  if (!dryRun && !process.env.DATABASE_URL) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }

  const bilancinoFile = fileArg ?? pickLatestBilancino(companySlug);
  if (!bilancinoFile || !existsSync(bilancinoFile)) {
    throw new Error(`Nessun bilancino trovato per ${companySlug}. Usa --file <path>.`);
  }

  const pool = dryRun ? null : createPool();
  const companies = pool ? await loadCompanies(pool) : [];
  const company = pool
    ? companies.find((c) => c.slug === companySlug)
    : ({ id: 'dry-run', slug: companySlug, name: companySlug } as Company);

  if (!company) throw new Error(`Company '${companySlug}' non trovata in DB`);

  const ceProfile = getCeProfile(companySlug);
  const famigliaLabelByCode = pool
    ? await loadFamigliaLabels(pool, company.id)
    : new Map(
        (ceProfile.prefixRules ?? []).map((r) => [r.famigliaCode, r.famigliaCode.replace(/_/g, ' ')]),
      );

  const wb = loadWorkbookFromFile(bilancinoFile);
  const detection = detectProfile(wb);
  const extracted = extractBilancino(wb, detection.profile, path.basename(bilancinoFile));

  const existing = pool ? await loadLedgerMappings(pool, company.id) : [];
  const existingCodes = new Set(existing.map((m) => m.accountCode));

  const stubs: LedgerMappingStub[] = [];
  for (const acc of extracted.accounts) {
    if (acc.section !== 'CE') continue;
    if (existingCodes.has(acc.accountCode)) continue;

    const suggestion = suggestFamigliaFromAccountCode(acc.accountCode, ceProfile, famigliaLabelByCode);
    stubs.push({
      accountCode: acc.accountCode,
      accountDescription: acc.description || null,
      famiglia: suggestion.famiglia,
      signMultiplier: acc.side === 'ricavi' ? -1 : 1,
    });
  }

  console.log(`Bilancino: ${bilancinoFile}`);
  console.log(`Profilo CE: ${ceProfile.id} | periodo ${extracted.year}/${extracted.month}`);
  console.log(`Conti CE leaf: ${extracted.accounts.filter((a) => a.section === 'CE').length}`);
  console.log(`Stub da creare: ${stubs.length}`);

  if (stubs.length > 0) {
    const preview = stubs.slice(0, 8);
    for (const s of preview) {
      console.log(`  ${s.accountCode} | famiglia=${s.famiglia ?? '—'} | ${s.accountDescription ?? ''}`);
    }
    if (stubs.length > 8) console.log(`  ... +${stubs.length - 8} altri`);
  }

  if (dryRun || !pool) {
    console.log('\n[dry-run] Nessuna scrittura su ledger_account_mappings.');
    if (pool) await pool.end();
    return;
  }

  const count = await upsertLedgerMappingStubs(pool, company.id, stubs);
  console.log(`\nUpsert stub: ${count} righe`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * One-off: confronto Awentia aprile 2026
 * Excel analisi vs financial_facts vs bilancino (account_balances pipeline).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractCE,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
  runBilancinoPipeline,
  extractBilancino,
} from '../shared/etl/index';
import {
  createPool,
  loadCompanies,
  loadFinancialFacts,
  loadAccountBalances,
  loadLedgerMappings,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'awentia';
const YEAR = 2026;
const MONTH = 4;
const TOLERANCE = 0.01;

const ANALISI_FILE = path.join(
  'import_data',
  '2026',
  '[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx',
);
const BILANCINO_CANDIDATES = [
  path.join('import_data', '2026', 'Bilancini 2026', 'AWENTIA SRL 30 04 provvisorio.xlsx'),
  path.join(
    'import_data',
    '2026',
    'Bilancini 2026-20260610T093924Z-3-001',
    'Bilancini 2026',
    'AWENTIA SRL 30 04 provvisorio.xlsx',
  ),
  path.join('import_data', '2026', 'Bilancini 2026', 'AWENTIA SRL 03 26.xlsx'),
];

function resolveExistingFile(candidates: string[]): string | null {
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

const KPI_KEYS = ['totaleRicavi', 'ebitda', 'risultatoEsercizio', 'totaleCosti'] as const;

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return 'n/d';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function delta(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  return a - b;
}

function buildFactsMap(
  facts: Awaited<ReturnType<typeof loadFinancialFacts>>,
  preferMonth: number | null = MONTH,
): Map<string, number> {
  const map = new Map<string, number>();
  if (preferMonth != null) {
    for (const f of facts) {
      if (f.month === preferMonth) map.set(f.categoryCode, f.amountProgressive);
    }
  }
  for (const f of facts) {
    if (f.month == null && !map.has(f.categoryCode)) {
      map.set(f.categoryCode, f.amountProgressive);
    }
  }
  return map;
}

function extractAnalisiKpis(extracted: ReturnType<typeof extractCE>): Record<string, number> {
  const kpis: Record<string, number> = {};
  for (const row of extracted.rows) {
    if (!row.canonicalKey) continue;
    if (KPI_KEYS.includes(row.canonicalKey as (typeof KPI_KEYS)[number])) {
      kpis[row.canonicalKey] = row.valueCurrent;
    }
  }
  return kpis;
}

function listSheetNames(file: string): string[] {
  const bytes = readFileSync(file);
  const wb = XLSX.read(new Uint8Array(bytes), { type: 'array' });
  return wb.SheetNames;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL mancante');
  }

  console.log('=== Awentia 2026 — Confronto aprile ===\n');
  console.log(`Analisi: ${ANALISI_FILE}`);
  const bilancinoPath = resolveExistingFile(BILANCINO_CANDIDATES);
  console.log(`Bilancino: ${bilancinoPath ?? 'NON TROVATO (solo analisi vs DB)'}\n`);

  // --- Excel analisi ---
  const analisiBytes = readFileSync(ANALISI_FILE);
  const analisiWb = readWorkbookData(XLSX as never, new Uint8Array(analisiBytes));
  const detection = detectProfile(analisiWb);
  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);
  const extracted = extractCE(analisiWb, detection.profile, labelResolver);

  console.log(`Profilo rilevato: ${detection.profile.id}`);
  console.log(`Anno corrente Excel: ${extracted.currentYear}`);
  console.log(`Mese riferimento Excel: ${extracted.referenceMonth}`);
  console.log(`Mesi mensili estratti: ${extracted.monthsCount}`);
  console.log(`Righe CE dettaglio: ${extracted.rows.length}`);
  console.log(`Fogli: ${analisiWb.sheetNames.join(', ')}\n`);

  const analisiAnnual = new Map<string, number>();
  for (const r of extracted.rows) {
    if (r.canonicalKey) analisiAnnual.set(r.canonicalKey, r.valueCurrent);
  }

  const analisiKpis = extractAnalisiKpis(extracted);
  const unmapped = extracted.rows.filter((r) => !r.canonicalKey && r.label.trim());
  console.log(`Voci non mappate in analisi: ${unmapped.length}`);
  if (unmapped.length > 0) {
    for (const r of unmapped.slice(0, 15)) {
      console.log(`  - "${r.label}" = ${fmt(r.valueCurrent)}`);
    }
    if (unmapped.length > 15) console.log(`  ... altre ${unmapped.length - 15}`);
  }
  console.log('');

  // --- DB (sempre) ---
  const pool = createPool();
  try {
    const companies = await loadCompanies(pool);
    const company = companies.find((c) => c.slug === COMPANY_SLUG);
    if (!company) throw new Error('Company awentia non trovata');

    const dbFactsMonth4 = await loadFinancialFacts(pool, company.id, YEAR, MONTH);
    const dbFactsAnnual = await loadFinancialFacts(pool, company.id, YEAR);
    const dbFactsAll = [...dbFactsAnnual, ...dbFactsMonth4];
    const dbMap = buildFactsMap(dbFactsAll, MONTH);

    const dbMonths = new Set(
      dbFactsAll.filter((f) => f.month != null).map((f) => f.month as number),
    );
    console.log(`DB financial_facts mesi presenti: ${[...dbMonths].sort((a, b) => a - b).join(', ') || 'nessuno'}`);
    console.log(`DB facts month=4: ${dbFactsMonth4.length}, annual (month=null): ${dbFactsAnnual.filter((f) => f.month == null).length}`);

    const accountBalances = await loadAccountBalances(pool, company.id, YEAR, MONTH);
    console.log(`DB account_balances apr: ${accountBalances.length} righe\n`);

    // --- Bilancino pipeline (opzionale) ---
    let bilancinoKpis: Record<string, number | undefined> = {};
    let bilancinoFacts = new Map<string, number>();
    let bilancinoMonth: number | null = null;

    if (bilancinoPath) {
      try {
        const bilBytes = readFileSync(bilancinoPath);
        const bilWb = readWorkbookData(XLSX as never, new Uint8Array(bilBytes));
        const bilExtracted = extractBilancino(bilWb, detectProfile(bilWb).profile, path.basename(bilancinoPath));
        bilancinoMonth = bilExtracted.month;
        console.log(`Bilancino periodo: ${bilExtracted.year}/${String(bilExtracted.month).padStart(2, '0')}`);
        console.log(`Conti CE leaf: ${bilExtracted.accounts.length}`);

        const ledgerMappings = (await loadLedgerMappings(pool, company.id)).map((m) => ({
          accountCode: m.accountCode,
          analiticaLabel: m.analiticaLabel,
          signMultiplier: m.signMultiplier,
        }));

        const pipelineResult = runBilancinoPipeline({
          workbook: bilWb,
          ledgerMappings,
          labelResolver,
          extract: bilExtracted,
        });

        bilancinoKpis = pipelineResult.kpis;
        bilancinoFacts = new Map(pipelineResult.facts.map((f) => [f.categoryCode, f.amountProgressive]));
        console.log(`Pipeline bilancino warnings: ${pipelineResult.warnings.length}\n`);
      } catch (e) {
        console.error('Errore pipeline bilancino:', e);
      }
    }

      // --- KPI table ---
      console.log('--- KPI (progressivo YTD aprile) ---');
      console.log(
        `${'Voce'.padEnd(22)} | ${'Excel analisi'.padStart(16)} | ${'DB facts'.padStart(16)} | ${'Bilancino'.padStart(16)} | ${'Δ analisi-DB'.padStart(14)}`,
      );
      console.log('-'.repeat(95));

      for (const key of KPI_KEYS) {
        const excel = analisiKpis[key] ?? analisiAnnual.get(key);
        const db = dbMap.get(key);
        const bil = bilancinoKpis[key];
        const d = delta(excel, db);
        const flag = d != null && Math.abs(d) > TOLERANCE ? ' ⚠' : '';
        console.log(
          `${key.padEnd(22)} | ${fmt(excel).padStart(16)} | ${fmt(db).padStart(16)} | ${fmt(bil).padStart(16)} | ${fmt(d).padStart(14)}${flag}`,
        );
      }

      // --- Macro CE dettaglio ---
      const macroKeys = [
        'ricaviCaratteristici',
        'altriRicavi',
        'totaleRicavi',
        'costiDiretti',
        'grossProfit',
        'speseCommerciali',
        'speseStruttura',
        'ebitda',
        'ammortamenti',
        'risultatoEsercizio',
      ];

      console.log('\n--- Voci macro CE dettaglio ---');
      console.log(
        `${'Code'.padEnd(22)} | ${'Excel'.padStart(14)} | ${'DB'.padStart(14)} | ${'Bilancino'.padStart(14)} | ${'Δ analisi-DB'.padStart(14)} | Causa probabile`,
      );
      console.log('-'.repeat(110));

      const diffs: Array<{ code: string; excel: number; db: number; delta: number; label: string }> = [];

      for (const code of macroKeys) {
        const excel = analisiAnnual.get(code);
        const db = dbMap.get(code);
        const bil = bilancinoFacts.get(code);
        const d = delta(excel, db);
        if (excel == null && db == null) continue;
        const label = extracted.rows.find((r) => r.canonicalKey === code)?.label ?? code;
        if (d != null && Math.abs(d) > TOLERANCE) {
          diffs.push({ code, excel: excel ?? 0, db: db ?? 0, delta: d, label });
        }
        const cause =
          excel == null
            ? 'mancante in Excel (non mappata?)'
            : db == null
              ? 'mancante in DB'
              : d != null && Math.abs(d) > TOLERANCE
                ? 'valore diverso'
                : 'OK';
        if (excel != null || db != null) {
          const flag = d != null && Math.abs(d) > TOLERANCE ? ' ⚠' : '';
          console.log(
            `${code.padEnd(22)} | ${fmt(excel).padStart(14)} | ${fmt(db).padStart(14)} | ${fmt(bil).padStart(14)} | ${fmt(d).padStart(14)}${flag} | ${cause}`,
          );
        }
      }

      // --- All leaf diffs ---
      const allCodes = new Set([...analisiAnnual.keys(), ...dbMap.keys()]);
      const leafDiffs: Array<{ code: string; excel: number; db: number; delta: number }> = [];
      for (const code of allCodes) {
        const excel = analisiAnnual.get(code);
        const db = dbMap.get(code);
        if (excel == null || db == null) {
          if (excel != null && db == null) {
            leafDiffs.push({ code, excel, db: 0, delta: excel });
          } else if (excel == null && db != null) {
            leafDiffs.push({ code, excel: 0, db, delta: -db });
          }
          continue;
        }
        const d = excel - db;
        if (Math.abs(d) > TOLERANCE) {
          leafDiffs.push({ code, excel, db, delta: d });
        }
      }
      leafDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      console.log(`\n--- Differenze leaf/tutte le categorie (|Δ| > ${TOLERANCE}) — top 30 ---`);
      for (const item of leafDiffs.slice(0, 30)) {
        const label = extracted.rows.find((r) => r.canonicalKey === item.code)?.label ?? item.code;
        let cause = 'mapping/rollup';
        if (item.db === 0) cause = 'assente in DB (non importata o mese sbagliato)';
        else if (item.excel === 0) cause = 'assente in Excel analisi (non mappata o voce nuova DB)';
        else if (Math.abs(item.delta) > 10000) cause = 'scarto significativo — verificare progressivo vs puntuale o bilancino provvisorio';
        console.log(
          `  ${item.code.padEnd(22)} "${label.slice(0, 40)}" | Excel=${fmt(item.excel)} DB=${fmt(item.db)} Δ=${fmt(item.delta)} | ${cause}`,
        );
      }
      if (leafDiffs.length > 30) console.log(`  ... altre ${leafDiffs.length - 30} differenze`);

      // --- Check month confusion ---
      const dbMapFeb = buildFactsMap(await loadFinancialFacts(pool, company.id, YEAR, 2), 2);
      const dbMapMar = buildFactsMap(await loadFinancialFacts(pool, company.id, YEAR, 3), 3);
      console.log('\n--- Controllo confusione mese (feb/mar vs apr) ---');
      for (const key of ['totaleRicavi', 'ebitda', 'risultatoEsercizio'] as const) {
        const apr = dbMap.get(key);
        const mar = dbMapMar.get(key);
        const feb = dbMapFeb.get(key);
        console.log(
          `  ${key}: feb=${fmt(feb)} mar=${fmt(mar)} apr=${fmt(apr)} | Excel apr=${fmt(analisiKpis[key] ?? analisiAnnual.get(key))}`,
        );
      }

      // --- Compare analisi vs feb file if different reference month ---
      if (extracted.referenceMonth !== MONTH) {
        console.log(`\n⚠ ATTENZIONE: Excel referenceMonth=${extracted.referenceMonth}, atteso ${MONTH}`);
      }
      if (extracted.currentYear !== YEAR) {
        console.log(`\n⚠ ATTENZIONE: Excel currentYear=${extracted.currentYear}, atteso ${YEAR}`);
      }
      if (bilancinoMonth !== MONTH) {
        console.log(`\n⚠ ATTENZIONE: Bilancino month=${bilancinoMonth}, atteso ${MONTH}`);
      }

      // --- Bilancino vs analisi ---
      console.log('\n--- Bilancino pipeline vs Excel analisi (KPI) ---');
      for (const key of KPI_KEYS) {
        const excel = analisiKpis[key] ?? analisiAnnual.get(key);
        const bil = bilancinoKpis[key];
        const d = delta(excel, bil);
        const flag = d != null && Math.abs(d) > TOLERANCE ? ' ⚠ bilancino≠analisi' : '';
        console.log(`  ${key}: analisi=${fmt(excel)} bilancino=${fmt(bil)} Δ=${fmt(d)}${flag}`);
      }

    console.log(`\nTotale categorie con diff analisi↔DB: ${leafDiffs.length}`);
    console.log(`Totale macro con diff: ${diffs.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

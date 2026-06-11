/**
 * Analisi stato mapping + gate Sherpa42 dic 2025 (diagnostica).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  runBilancinoPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
} from '../shared/etl/index.ts';
import { evaluateBilancinoPublishGate } from '../shared/etl/bilancinoPublishGate.ts';
import { STUB_ANALITICA_PLACEHOLDER } from '../shared/etl/ledgerMappingStubs.ts';
import { createPool, loadCompanies, loadLedgerMappings } from './lib/bilanciLoader.ts';

const FILE = 'import_data/Bilancini/Sherpa/Bilancini 2025/SHERPA 12 25.xlsx';

const bytes = readFileSync(FILE);
const wb = readWorkbookData(XLSX, bytes);
const det = detectProfile(wb);
const ext = extractBilancino(wb, det.profile, 'SHERPA 12 25.xlsx');

console.log('=== Bilancino SHERPA 12 25 ===');
console.log('Profile:', det.profile.id);
console.log('Period:', ext.year, ext.month);
console.log('CE accounts:', ext.accounts.filter((a) => a.section === 'CE').length);
console.log('Totals (natura economica):', ext.totals);

const pool = createPool();
try {
  const companies = await loadCompanies(pool);
  const co = companies.find((c) => c.slug === 'sherpa42');
  if (!co) throw new Error('sherpa42 not found');

  const mappings = await loadLedgerMappings(pool, co.id);
  const ceCodes = new Set(ext.accounts.filter((a) => a.section === 'CE').map((a) => a.accountCode));
  const stubs = mappings.filter((m) => m.analiticaLabel === STUB_ANALITICA_PLACEHOLDER);
  const incomplete = mappings.filter(
    (m) => !m.masterAccountId || m.analiticaLabel === STUB_ANALITICA_PLACEHOLDER,
  );
  const missing = [...ceCodes].filter((c) => !mappings.some((m) => m.accountCode === c));

  console.log('\n=== DB ledger_account_mappings ===');
  console.log('Total mappings:', mappings.length);
  console.log('Stubs (__DA_COMPLETARE__):', stubs.length);
  console.log('Incomplete:', incomplete.length);
  console.log('Missing from DB:', missing.length);
  if (stubs.length > 0) {
    console.log('\nStub accounts:');
    for (const s of stubs) {
      console.log(`  ${s.accountCode} | ${s.famiglia ?? '—'} | ${s.accountDescription ?? ''}`);
    }
  }
  const acc64100 = mappings.find((m) => m.accountCode === '64/05/100');
  console.log('64/05/100 mapping:', acc64100 ?? 'NOT IN DB');

  if (missing.length > 0) {
    console.log('\nMissing accounts (in bilancino, not in DB):');
    for (const code of missing) {
      const acc = ext.accounts.find((a) => a.accountCode === code);
      console.log(`  ${code} | ${acc?.description ?? ''} | side=${acc?.side}`);
    }
  }

  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const labelResolver = buildResolver(mappingsForCompany('sherpa42'), validCodes);
  const ledgerMappings = mappings.map((m) => ({
    accountCode: m.accountCode,
    analiticaLabel: m.analiticaLabel,
    signMultiplier: m.signMultiplier,
    famiglia: m.famiglia ?? null,
  }));

  const result = runBilancinoPipeline({
    workbook: wb,
    ledgerMappings,
    labelResolver,
    extract: ext,
    sourceFilename: 'SHERPA 12 25.xlsx',
    companySlug: 'sherpa42',
  });

  console.log('\n=== Pipeline (current mappings) ===');
  console.log('Errors:', result.warnings.filter((w) => w.severity === 'error').length);
  console.log('KPIs:', {
    totaleRicavi: result.kpis.totaleRicavi,
    ebitda: result.kpis.ebitda,
    risultatoEsercizio: result.kpis.risultatoEsercizio,
    totaleCosti: result.kpis.totaleCosti,
  });
  console.log('Gate blocked:', result.publishGate?.blocked);
  if (result.publishGate) {
    for (const c of result.publishGate.quadratureChecks) {
      console.log(
        `  ${c.key}: extracted=${c.extracted} rollup=${c.rollup} delta=${c.delta} ok=${c.ok}`,
      );
    }
    if (result.publishGate.errors.length) {
      console.log('Gate errors:');
      for (const e of result.publishGate.errors) console.log(`  - ${e}`);
    }
  }

  const incompleteNoMaster = mappings.filter((m) => !m.masterAccountId);
  const balByCode = new Map(ext.accounts.map((a) => [a.accountCode, a]));
  console.log('\n=== Incomplete (no master_account_id) ===');
  let missingSum = 0;
  for (const m of incompleteNoMaster) {
    const acc = balByCode.get(m.accountCode);
    const bal = acc?.balanceNormalized ?? 0;
    missingSum += Math.abs(bal);
    console.log(
      `  ${m.accountCode} | ${m.famiglia ?? '—'} | ${m.analiticaLabel} | bal=${bal} | ${m.accountDescription ?? ''}`,
    );
  }
  console.log('Sum abs balances (incomplete):', missingSum);

  console.log('\n=== Top CE balances ===');
  const ce = ext.accounts
    .filter((a) => a.section === 'CE')
    .sort((a, b) => Math.abs(b.balanceNormalized) - Math.abs(a.balanceNormalized));
  for (const a of ce.slice(0, 20)) {
    const m = mappings.find((x) => x.accountCode === a.accountCode);
    const r = m?.masterAccountId ? labelResolver(m.analiticaLabel) : null;
    console.log(
      `  ${a.accountCode} bal=${a.balanceNormalized} fam=${m?.famiglia ?? '—'} anal=${m?.analiticaLabel?.slice(0, 45) ?? '—'} cat=${r?.categoryCode ?? '—'}`,
    );
  }

  const { rows: decFacts } = await pool.query(
    `select mc.code, ff.amount_progressive, ff.amount_period
       from financial_facts ff
       join master_chart_of_accounts mc on mc.id = ff.category_id
      where ff.company_id = $1 and ff.year = 2025 and ff.month = 12
        and mc.code in ('totaleRicavi','ebitda','risultatoEsercizio','totaleCosti')
      order by mc.code`,
    [co.id],
  );
  console.log('\n=== Current DB Dec 2025 KPIs ===');
  console.table(decFacts);
} finally {
  await pool.end();
}

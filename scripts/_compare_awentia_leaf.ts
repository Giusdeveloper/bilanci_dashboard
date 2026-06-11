/** Leaf-level analisi vs DB for Awentia apr 2026 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData, detectProfile, extractCE, buildResolver, buildMasterChart, mappingsForCompany,
} from '../shared/etl/index';
import { createPool, loadCompanies, loadFinancialFacts } from './lib/bilanciLoader';

const ANALISI = 'import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx';

async function main() {
  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const resolver = buildResolver(mappingsForCompany('awentia'), validCodes);
  const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(ANALISI)));
  const ex = extractCE(wb, detectProfile(wb).profile, resolver);
  const excel = new Map<string, { val: number; label: string }>();
  for (const r of ex.rows) {
    if (r.canonicalKey) excel.set(r.canonicalKey, { val: r.valueCurrent, label: r.label });
  }

  const pool = createPool();
  const company = (await loadCompanies(pool)).find((c) => c.slug === 'awentia')!;
  const facts = await loadFinancialFacts(pool, company.id, 2026, 4);
  const db = new Map(facts.map((f) => [f.categoryCode, f.amountProgressive]));
  await pool.end();

  const all = new Set([...excel.keys(), ...db.keys()]);
  const rows: Array<{ code: string; label: string; excel: number | null; db: number | null; delta: number | null }> = [];
  for (const code of all) {
    const e = excel.get(code);
    const d = db.get(code);
    const delta = e != null && d != null ? e.val - d : null;
    rows.push({ code, label: e?.label ?? code, excel: e?.val ?? null, db: d ?? null, delta });
  }
  rows.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  console.log('ONLY_EXCEL', rows.filter((r) => r.excel != null && r.db == null).map((r) => r.code).join(', ') || 'none');
  console.log('ONLY_DB', rows.filter((r) => r.excel == null && r.db != null).map((r) => r.code).join(', ') || 'none');
  console.log('\nTOP_DIFFS');
  for (const r of rows.filter((r) => r.delta != null && Math.abs(r.delta) > 0.01).slice(0, 25)) {
    console.log(`${r.code}\t${r.label}\t${r.excel}\t${r.db}\t${r.delta?.toFixed(2)}`);
  }
}

main();

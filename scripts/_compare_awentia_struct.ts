import 'dotenv/config';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import { readWorkbookData, detectProfile, extractCE, buildResolver, buildMasterChart, mappingsForCompany } from '../shared/etl/index';
import { createPool, loadCompanies, loadFinancialFacts } from './lib/bilanciLoader';

const STRUCT = ['personale','assicurazioni','locazioniNoleggi','serviziAmministrativi','consulenzeTecniche','speseGenerali','speseRappresentanza','serviziIndeducibili','utenze','utenzeTelefoniche','speseViaggio','sanzioniMulte','altriOneri','tasseValori'];

async function main() {
  const resolver = buildResolver(mappingsForCompany('awentia'), new Set(buildMasterChart().map((a) => a.code)));
  const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync('import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx')));
  const ex = extractCE(wb, detectProfile(wb).profile, resolver);
  const pool = createPool();
  const co = (await loadCompanies(pool)).find((c) => c.slug === 'awentia')!;
  const db = new Map((await loadFinancialFacts(pool, co.id, 2026, 4)).map((f) => [f.categoryCode, f.amountProgressive]));
  await pool.end();

  console.log('code\texcel\tdb\tdelta');
  for (const c of STRUCT) {
    const ev = ex.rows.find((r) => r.canonicalKey === c)?.valueCurrent ?? 0;
    const dv = db.get(c) ?? 0;
    if (ev || dv) console.log(`${c}\t${ev}\t${dv}\t${(ev - dv).toFixed(2)}`);
  }
  console.log('macro speseStruttura excel', ex.rows.find((r) => r.canonicalKey === 'speseStruttura')?.valueCurrent);
  console.log('macro speseStruttura db', db.get('speseStruttura'));
}

main();

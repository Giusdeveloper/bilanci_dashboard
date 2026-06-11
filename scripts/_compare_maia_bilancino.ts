import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  runBilancinoPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
} from '../shared/etl/index';

function load(path: string) {
  if (path.endsWith('.csv')) {
    const text = readFileSync(path).toString('utf8');
    return readWorkbookData(XLSX as never, new Uint8Array(Buffer.from(text)));
  }
  return readWorkbookData(XLSX as never, new Uint8Array(readFileSync(path)));
}

const files = [
  'import_data/Bilancini/Maia/2025/MAIA 01 25.csv',
  'import_data/Bilancini/Awentia/Bilancini 2024/awentia.csv',
  'import_data/Bilancini/Awentia/Bilancini 2025/awentia 01 25.xlsx',
];

for (const f of files) {
  console.log(`\n======== ${f} ========`);
  const wb = load(f);
  const headers = (wb.sheets[wb.sheetNames[0]]?.[0] ?? []).map((c) => String(c ?? ''));
  console.log('headers:', headers.join(' | '));
  const det = detectProfile(wb);
  console.log('profile:', det.profile.id, 'score:', det.score);
  try {
    const ext = extractBilancino(wb, det.profile);
    console.log('extract:', ext.companyName, `${ext.year}/${ext.month}`, 'accounts:', ext.accounts.length);
    console.log('totals:', JSON.stringify(ext.totals));
    const resolver = buildResolver(mappingsForCompany('maia-management'), new Set(buildMasterChart().map((a) => a.code)));
    const pipe = runBilancinoPipeline({ workbook: wb, ledgerMappings: [], labelResolver: resolver, extract: ext });
    console.log('pipeline: facts', pipe.facts.length, 'warn', pipe.warnings.length);
  } catch (e) {
    console.log('FAIL:', (e as Error).message);
  }
}

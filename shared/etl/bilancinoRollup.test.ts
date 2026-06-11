/**
 * Test rollup bilancino → macro CE (formule e golden Awentia).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  runBilancinoPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
  rollupLeafSums,
} from './index.ts';
import { extractSourceMapping } from './seed/extractSourceMapping.ts';
import { findSheetName, getSheet } from './workbook.ts';
import { GOLDEN_CASES } from './__fixtures__/goldenKpis.ts';

const AWENTIA_GOLDEN = GOLDEN_CASES.find((g) => g.companySlug === 'awentia')!;
const BILANCINO_FILE = 'import_data/Bilancini/AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx';
const ANALISI_FILE = AWENTIA_GOLDEN.file;

function loadLedgerFromSource(analisiFile: string) {
  const bytes = new Uint8Array(fs.readFileSync(analisiFile));
  const wb = readWorkbookData(XLSX as never, bytes);
  const sheetName = findSheetName(wb, /^source$/i);
  if (!sheetName) return [];
  const sourceRows = extractSourceMapping(getSheet(wb, sheetName));
  const validCodes = new Set(buildMasterChart().map((a) => a.code));
  const resolver = buildResolver(mappingsForCompany('awentia'), validCodes);
  return sourceRows.map((row) => {
    const res = resolver(row.analiticaLabel);
    const isRicavi = row.famiglia?.toLowerCase().includes('ricav');
    return {
      accountCode: row.accountCode,
      analiticaLabel: row.analiticaLabel,
      signMultiplier: isRicavi ? -1 : 1,
    };
  });
}

describe('rollupLeafSums — formule CE', () => {
  it('calcola EBITDA e risultato da leaf noti (Awentia Dec 2025)', () => {
    const rolled = rollupLeafSums({
      ricaviCaratteristici: 318148.36,
      altriRicavi: 13693.72,
      serviziDiretti: 37068.18,
      serviziInformatici: 1388.57,
      altriServizi: 1750,
      speseViaggio: 3735.27,
      speseRappresentanza: 7426.66,
      mostreFiere: 10814.96,
      serviziCommerciali: 608.44,
      carburante: 1651.49,
      beniIndeducibili: 8413.8,
      speseGenerali: 26606.17,
      utenze: 1182.53,
      assicurazioni: 291.69,
      tasseValori: 620.16,
      sanzioniMulte: 507.17,
      personale: 207496.26,
      serviziAmministrativi: 18776.43,
      consulenzeTecniche: 35513.73,
      consulenzeLegali: 4784,
      locazioniNoleggi: 10984.24,
      serviziIndeducibili: 6245.43,
      utiliPerditeCambi: 516.64,
      licenzeUso: 204,
      utenzeTelefoniche: 327.74,
      altriOneri: 7328.96,
      abbuoniArrotondamenti: 12.42,
      ammortamentiImmateriali: 51870.55,
      ammortamentiMateriali: 858.09,
      speseCommissioniBancarie: 1039.64,
      interessiPassiviMutui: 3700.98,
      altriInteressi: 364.51,
    });

    expect(rolled.totaleRicavi).toBeCloseTo(331842.08, 2);
    expect(rolled.ebitda).toBeCloseTo(-62412.86, 2);
    expect(rolled.risultatoEsercizio).toBeCloseTo(-120246.63, 2);
  });
});

describe('runBilancinoPipeline + rollup — Awentia bilancino Dec 2025', () => {
  it.skipIf(!fs.existsSync(BILANCINO_FILE) || !fs.existsSync(ANALISI_FILE))(
    'KPI macro allineati al golden Excel analisi',
    () => {
      const bilBytes = new Uint8Array(fs.readFileSync(BILANCINO_FILE));
      const bilWb = readWorkbookData(XLSX as never, bilBytes);
      const detection = detectProfile(bilWb, 'bilancino_studio');
      const extracted = extractBilancino(bilWb, detection.profile);

      const validCodes = new Set(buildMasterChart().map((a) => a.code));
      const resolver = buildResolver(mappingsForCompany('awentia'), validCodes);
      const ledgerMappings = loadLedgerFromSource(ANALISI_FILE);

      const result = runBilancinoPipeline({
        workbook: bilWb,
        ledgerMappings,
        labelResolver: resolver,
        extract: extracted,
      });

      expect(result.layout.length).toBeGreaterThan(50);
      expect(result.kpis.totaleRicavi).toBeCloseTo(AWENTIA_GOLDEN.kpis.totaleRicavi, 0);
      expect(result.kpis.ebitda).toBeCloseTo(AWENTIA_GOLDEN.kpis.ebitda, 0);
      expect(result.kpis.risultatoEsercizio).toBeCloseTo(AWENTIA_GOLDEN.kpis.risultatoEsercizio, 0);
    },
  );
});

/**
 * Test pipeline bilancino — convenzione segno ricavi vs sign_multiplier ledger.
 */

import { describe, it, expect } from 'vitest';
import {
  runBilancinoPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
  STUB_ANALITICA_PLACEHOLDER,
  type BilancinoExtractResult,
} from './index.ts';

const validCodes = new Set(buildMasterChart().map((a) => a.code));
const labelResolver = buildResolver(mappingsForCompany('awentia'), validCodes);

function mockExtract(accounts: BilancinoExtractResult['accounts']): BilancinoExtractResult {
  return {
    profileId: 'bilancino_studio',
    companyName: 'Test',
    year: 2025,
    month: 12,
    accounts,
    totals: { totaleRicavi: 150, totaleCosti: null, risultato: null },
  };
}

describe('runBilancinoPipeline — segno ricavi', () => {
  it('ignora sign_multiplier -1 sui ricavi già normalizzati in CE', () => {
    const extract = mockExtract([
      {
        accountCode: '58/10/005',
        description: 'Ricavi consulenza',
        balanceRaw: 100,
        balanceNormalized: 100,
        section: 'CE',
        side: 'ricavi',
        tipologia: 'CE',
      },
      {
        accountCode: '64/05/010',
        description: 'Altri proventi',
        balanceRaw: 50,
        balanceNormalized: 50,
        section: 'CE',
        side: 'ricavi',
        tipologia: 'CE',
      },
    ]);

    const result = runBilancinoPipeline({
      workbook: { sheetNames: [], sheets: {} },
      ledgerMappings: [
        { accountCode: '58/10/005', analiticaLabel: 'Ricavi caratteristici', signMultiplier: -1 },
        { accountCode: '64/05/010', analiticaLabel: 'Altri ricavi', signMultiplier: -1 },
      ],
      labelResolver,
      extract,
    });

    expect(result.kpis.ricaviCaratteristici).toBe(100);
    expect(result.kpis.altriRicavi).toBe(50);
  });

  it('ignora sign_multiplier sui costi — storni negativi riducono spesa', () => {
    const extract = mockExtract([
      {
        accountCode: '66/20/005',
        description: 'Assicurazioni storno',
        balanceRaw: -200,
        balanceNormalized: -200,
        section: 'CE',
        side: 'costi',
        tipologia: 'CE',
      },
    ]);

    const result = runBilancinoPipeline({
      workbook: { sheetNames: [], sheets: {} },
      ledgerMappings: [
        { accountCode: '66/20/005', analiticaLabel: 'Assicurazioni', signMultiplier: -1 },
      ],
      labelResolver,
      extract,
    });

    expect(result.kpis.assicurazioni).toBe(-200);
  });

  it('applica importo costi positivi', () => {
    const extract = mockExtract([
      {
        accountCode: '66/20/005',
        description: 'Spese generali',
        balanceRaw: 200,
        balanceNormalized: 200,
        section: 'CE',
        side: 'costi',
        tipologia: 'CE',
      },
    ]);

    const result = runBilancinoPipeline({
      workbook: { sheetNames: [], sheets: {} },
      ledgerMappings: [
        { accountCode: '66/20/005', analiticaLabel: 'Spese generali', signMultiplier: 1 },
      ],
      labelResolver,
      extract,
    });

    expect(result.kpis.speseGenerali).toBe(200);
  });

  it('blocca import su mapping stub incompleto', () => {
    const extract = mockExtract([
      {
        accountCode: '66/99/001',
        description: 'Conto nuovo',
        balanceRaw: 50,
        balanceNormalized: 50,
        section: 'CE',
        side: 'costi',
        tipologia: 'CE',
      },
    ]);

    const result = runBilancinoPipeline({
      workbook: { sheetNames: [], sheets: {} },
      ledgerMappings: [
        { accountCode: '66/99/001', analiticaLabel: STUB_ANALITICA_PLACEHOLDER, signMultiplier: 1 },
      ],
      labelResolver,
      extract,
    });

    const incomplete = result.warnings.filter((w) => w.message.startsWith('Mapping incompleto'));
    expect(incomplete).toHaveLength(1);
    expect(result.warnings.some((w) => w.message.includes('mapping stub da completare'))).toBe(true);
    expect(result.kpis.speseGenerali).toBeUndefined();
  });
});

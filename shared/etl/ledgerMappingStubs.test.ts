import { describe, it, expect } from 'vitest';
import {
  BILANCINO_DISCOVERY_SOURCE,
  STUB_ANALITICA_PLACEHOLDER,
  buildLedgerMappingStubs,
  isIncompleteLedgerMapping,
  isIncompleteStubAnalitica,
  toStubUpsertRows,
} from './ledgerMappingStubs.ts';
import type { BilancinoAccountRow } from './extractBilancino.ts';

function ceAccount(
  code: string,
  description: string,
  side: 'costi' | 'ricavi' = 'costi',
): BilancinoAccountRow {
  return {
    accountCode: code,
    description,
    balanceRaw: 100,
    balanceNormalized: 100,
    section: 'CE',
    side,
    tipologia: 'CE',
  };
}

describe('ledgerMappingStubs', () => {
  it('identifica analitica placeholder come incompleta', () => {
    expect(isIncompleteStubAnalitica(STUB_ANALITICA_PLACEHOLDER)).toBe(true);
    expect(isIncompleteStubAnalitica('')).toBe(true);
    expect(isIncompleteStubAnalitica('  ')).toBe(true);
    expect(isIncompleteStubAnalitica('Spese generali')).toBe(false);
  });

  it('buildLedgerMappingStubs esclude conti già mappati e sezione SP', () => {
    const accounts = [
      ceAccount('66/05/001', 'Spese A'),
      ceAccount('58/10/005', 'Ricavi B', 'ricavi'),
      {
        ...ceAccount('10/01/001', 'Attivo'),
        section: 'SP' as const,
      },
      ceAccount('66/05/001', 'Duplicato'),
    ];

    const stubs = buildLedgerMappingStubs(accounts, new Set(['58/10/005']));

    expect(stubs).toHaveLength(1);
    expect(stubs[0]).toEqual({
      accountCode: '66/05/001',
      accountDescription: 'Spese A',
      signMultiplier: 1,
      famiglia: null,
    });
  });

  it('assegna sign_multiplier -1 ai ricavi', () => {
    const stubs = buildLedgerMappingStubs([ceAccount('58/01/001', 'Ricavi', 'ricavi')], []);
    expect(stubs[0].signMultiplier).toBe(-1);
  });

  it('toStubUpsertRows produce righe discovery con placeholder', () => {
    const rows = toStubUpsertRows('company-1', [
      { accountCode: '66/01', accountDescription: 'Test', signMultiplier: 1 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      company_id: 'company-1',
      account_code: '66/01',
      analitica_label: STUB_ANALITICA_PLACEHOLDER,
      source_sheet: BILANCINO_DISCOVERY_SOURCE,
      famiglia: null,
    });
  });

  it('isIncompleteLedgerMapping rileva stub discovery', () => {
    expect(
      isIncompleteLedgerMapping({
        analiticaLabel: STUB_ANALITICA_PLACEHOLDER,
        sourceSheet: BILANCINO_DISCOVERY_SOURCE,
      }),
    ).toBe(true);
    expect(
      isIncompleteLedgerMapping({
        analiticaLabel: 'Consulenze',
        sourceSheet: BILANCINO_DISCOVERY_SOURCE,
      }),
    ).toBe(false);
  });
});

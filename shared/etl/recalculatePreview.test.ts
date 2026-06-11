/**
 * Test recalculateFromDraft — delta saldi in memoria + pipeline bilancino.
 */

import { describe, it, expect } from 'vitest';
import {
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
} from './index.ts';
import { recalculateFromDraft, mergeBalanceChanges } from './recalculatePreview.ts';
import type { AccountBalanceRow } from './recalculatePreview.ts';

const validCodes = new Set(buildMasterChart().map((a) => a.code));
const labelResolver = buildResolver(mappingsForCompany('awentia'), validCodes);

const baseBalances: AccountBalanceRow[] = [
  {
    accountCode: '58/10/005',
    accountDescription: 'Ricavi consulenza',
    section: 'CE',
    accountSide: 'ricavi',
    year: 2025,
    month: 12,
    balanceRaw: 100,
    balanceNormalized: 100,
  },
  {
    accountCode: '66/20/005',
    accountDescription: 'Spese generali',
    section: 'CE',
    accountSide: 'costi',
    year: 2025,
    month: 12,
    balanceRaw: 40,
    balanceNormalized: 40,
  },
];

const ledgerMappings = [
  { accountCode: '58/10/005', analiticaLabel: 'Ricavi caratteristici', signMultiplier: -1 },
  { accountCode: '66/20/005', analiticaLabel: 'Spese generali', signMultiplier: 1 },
];

describe('mergeBalanceChanges', () => {
  it('sovrascrive il saldo normalizzato del conto esistente', () => {
    const merged = mergeBalanceChanges(baseBalances, [
      { accountCode: '58/10/005', year: 2025, month: 12, balanceNormalized: 150 },
    ], 2025, 12);
    const ricavi = merged.find((b) => b.accountCode === '58/10/005');
    expect(ricavi?.balanceNormalized).toBe(150);
  });
});

describe('recalculateFromDraft', () => {
  it('ricalcola KPI dopo modifica saldo ricavi', () => {
    const baseline = recalculateFromDraft({
      companyId: 'test-co',
      year: 2025,
      month: 12,
      baseBalances,
      balanceChanges: [],
      ledgerMappings,
      labelResolver,
    });

    const updated = recalculateFromDraft({
      companyId: 'test-co',
      year: 2025,
      month: 12,
      baseBalances,
      balanceChanges: [
        { accountCode: '58/10/005', year: 2025, month: 12, balanceNormalized: 200 },
      ],
      ledgerMappings,
      labelResolver,
    });

    expect(baseline.kpis.ricaviCaratteristici).toBe(100);
    expect(updated.kpis.ricaviCaratteristici).toBe(200);
    expect(updated.facts.length).toBeGreaterThan(0);
    expect(updated.warnings.every((w) => w.severity !== 'error')).toBe(true);
  });
});

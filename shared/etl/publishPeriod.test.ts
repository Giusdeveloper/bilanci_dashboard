/**
 * Test publish periodo — gate quadratura-only + allineamento preview KPI.
 */

import { describe, it, expect } from 'vitest';
import {
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
} from './index.ts';
import { evaluatePublishPeriodGate, evaluateBilancinoPublishGate } from './bilancinoPublishGate.ts';
import { mergeMappingChanges, parseDraftMappingChanges } from './draftChanges.ts';
import { recalculateFromDraft } from './recalculatePreview.ts';
import type { AccountBalanceRow } from './recalculatePreview.ts';
import type { Warning } from './types.ts';

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

describe('evaluatePublishPeriodGate', () => {
  it('non blocca su mapping incompleto (solo warning)', () => {
    const warnings: Warning[] = [
      {
        severity: 'error',
        message: 'Mapping incompleto per conto 99/01/001 (Test): completare famiglia e analitica CE.',
      },
    ];
    const gateImport = evaluateBilancinoPublishGate({
      extracted: {
        profileId: 'bilancino_studio',
        companyName: 'test',
        year: 2025,
        month: 12,
        accounts: [],
        totals: { totaleRicavi: 100, totaleCosti: 40, risultato: 60 },
      },
      kpis: { totaleRicavi: 100, totaleCosti: 40, risultatoEsercizio: 60 },
      warnings,
    });
    expect(gateImport.blocked).toBe(true);

    const gatePeriod = evaluatePublishPeriodGate({
      extracted: {
        profileId: 'bilancino_studio',
        companyName: 'test',
        year: 2025,
        month: 12,
        accounts: [],
        totals: { totaleRicavi: 100, totaleCosti: 40, risultato: 60 },
      },
      kpis: { totaleRicavi: 100, totaleCosti: 40, risultatoEsercizio: 60 },
      warnings,
    });
    expect(gatePeriod.blocked).toBe(false);
  });

  it('blocca su mismatch quadratura ricavi', () => {
    const gate = evaluatePublishPeriodGate({
      extracted: {
        profileId: 'bilancino_studio',
        companyName: 'test',
        year: 2025,
        month: 12,
        accounts: [],
        totals: { totaleRicavi: 100, totaleCosti: 40, risultato: 60 },
      },
      kpis: { totaleRicavi: 200, totaleCosti: 40, risultatoEsercizio: 60 },
      warnings: [],
    });
    expect(gate.blocked).toBe(true);
    expect(gate.errors.some((e) => e.includes('Totale ricavi'))).toBe(true);
  });
});

describe('mergeMappingChanges', () => {
  it('sovrascrive analitica su conto esistente', () => {
    const merged = mergeMappingChanges(ledgerMappings, [
      {
        accountCode: '58/10/005',
        analiticaLabel: 'Altri ricavi',
        signMultiplier: -1,
      },
    ]);
    const row = merged.find((m) => m.accountCode === '58/10/005');
    expect(row?.analiticaLabel).toBe('Altri ricavi');
  });

  it('parseDraftMappingChanges legge entity_key/new_value', () => {
    const parsed = parseDraftMappingChanges([
      {
        entity_key: { account_code: '58/10/005' },
        new_value: { analitica_label: 'Ricavi caratteristici', sign_multiplier: -1 },
      },
    ]);
    expect(parsed[0].accountCode).toBe('58/10/005');
    expect(parsed[0].analiticaLabel).toBe('Ricavi caratteristici');
  });
});

describe('publish preview KPI alignment', () => {
  it('preview KPI coerenti dopo modifica saldo e mapping bozza', () => {
    const balanceChanges = [
      { accountCode: '58/10/005', year: 2025, month: 12, balanceNormalized: 200 },
    ];
    const mappingChanges = parseDraftMappingChanges([
      {
        entity_key: { account_code: '58/10/005' },
        new_value: { analitica_label: 'Ricavi caratteristici', sign_multiplier: -1 },
      },
    ]);

    const preview = recalculateFromDraft({
      companyId: 'test-co',
      year: 2025,
      month: 12,
      baseBalances,
      balanceChanges,
      mappingChanges,
      ledgerMappings,
      labelResolver,
    });

    const postApply = recalculateFromDraft({
      companyId: 'test-co',
      year: 2025,
      month: 12,
      baseBalances: baseBalances.map((b) =>
        b.accountCode === '58/10/005'
          ? { ...b, balanceNormalized: 200, balanceRaw: 200 }
          : b,
      ),
      balanceChanges: [],
      ledgerMappings: mergeMappingChanges(ledgerMappings, mappingChanges),
      labelResolver,
    });

    expect(preview.kpis.totaleRicavi).toBe(postApply.kpis.totaleRicavi);
    expect(preview.kpis.risultatoEsercizio).toBe(postApply.kpis.risultatoEsercizio);
    expect(preview.kpis.totaleRicavi).toBe(200);
  });
});

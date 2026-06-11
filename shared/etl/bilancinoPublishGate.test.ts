/**
 * Test gate publish bilancino — quadratura KPI vs totali estratti.
 */

import { describe, it, expect } from 'vitest';
import {
  buildQuadratureChecks,
  compareQuadraturePair,
  evaluateBilancinoPublishGate,
} from './bilancinoPublishGate.ts';
import type { BilancinoExtractResult } from './extractBilancino.ts';
import type { Warning } from './types.ts';

function mockExtract(totals: BilancinoExtractResult['totals']): BilancinoExtractResult {
  return {
    profileId: 'bilancino_studio',
    companyName: 'Test',
    year: 2026,
    month: 4,
    accounts: [],
    totals,
  };
}

describe('compareQuadraturePair', () => {
  it('accetta delta entro tolleranza', () => {
    expect(compareQuadraturePair(100, 100.005).ok).toBe(true);
  });

  it('rifiuta delta oltre tolleranza', () => {
    const { ok, delta } = compareQuadraturePair(100, 102);
    expect(ok).toBe(false);
    expect(delta).toBe(-2);
  });
});

describe('evaluateBilancinoPublishGate', () => {
  it('blocca su mismatch KPI ricavi', () => {
    const warnings: Warning[] = [];
    const gate = evaluateBilancinoPublishGate({
      extracted: mockExtract({
        totaleRicavi: 12500,
        totaleCosti: 20000,
        risultato: -7500,
      }),
      kpis: {
        totaleRicavi: 13000,
        totaleCosti: 20000,
        risultatoEsercizio: -7500,
      },
      warnings,
      companySlug: 'awentia',
    });

    expect(gate.blocked).toBe(true);
    expect(gate.errors.some((e) => e.includes('Totale ricavi'))).toBe(true);
    expect(gate.actionLinks[0].href).toContain('filter=incomplete');
    expect(gate.actionLinks[0].href).toContain('company=awentia');
  });

  it('passa quando KPI allineati ai totali bilancino', () => {
    const warnings: Warning[] = [];
    const gate = evaluateBilancinoPublishGate({
      extracted: mockExtract({
        totaleRicavi: 12500,
        totaleCosti: 20000,
        risultato: -7500,
      }),
      kpis: {
        totaleRicavi: 12500,
        totaleCosti: 20000,
        risultatoEsercizio: -7500,
        ebitda: -5000,
      },
      warnings,
    });

    expect(gate.blocked).toBe(false);
    expect(buildQuadratureChecks(
      mockExtract({ totaleRicavi: 12500, totaleCosti: 20000, risultato: -7500 }).totals,
      { totaleRicavi: 12500, totaleCosti: 20000, risultatoEsercizio: -7500 },
    ).every((c) => c.ok)).toBe(true);
  });
});

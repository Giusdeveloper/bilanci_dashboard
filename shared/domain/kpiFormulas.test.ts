import { describe, it, expect } from 'vitest';
import {
  calculateVariance,
  getVarianceType,
  calculateEbitdaMargin,
  calculateMargin,
  macroMetricsLabels,
} from './kpiFormulas';

describe('calculateVariance', () => {
  it('calcola la varianza percentuale', () => {
    expect(calculateVariance(110, 100)).toBeCloseTo(10);
    expect(calculateVariance(90, 100)).toBeCloseTo(-10);
    expect(calculateVariance(200, 100)).toBeCloseTo(100);
  });

  it('normalizza sul valore assoluto del precedente', () => {
    // da -100 a -50: miglioramento del 50%
    expect(calculateVariance(-50, -100)).toBeCloseTo(50);
  });

  it('ritorna 0 quando il precedente è 0 (no divisione per zero)', () => {
    expect(calculateVariance(100, 0)).toBe(0);
  });

  it('ritorna 0 con input mancanti', () => {
    expect(calculateVariance(null, 100)).toBe(0);
    expect(calculateVariance(100, undefined)).toBe(0);
    expect(calculateVariance(undefined, undefined)).toBe(0);
  });
});

describe('getVarianceType', () => {
  it('classifica con soglia ±5%', () => {
    expect(getVarianceType(10)).toBe('positive');
    expect(getVarianceType(-10)).toBe('negative');
    expect(getVarianceType(0)).toBe('neutral');
    expect(getVarianceType(5)).toBe('neutral');
    expect(getVarianceType(-5)).toBe('neutral');
    expect(getVarianceType(5.01)).toBe('positive');
  });
});

describe('calculateEbitdaMargin', () => {
  it('calcola il margine EBITDA percentuale', () => {
    expect(calculateEbitdaMargin(180000, 1250000)).toBeCloseTo(14.4);
    expect(calculateEbitdaMargin(250, 1000)).toBeCloseTo(25);
    expect(calculateEbitdaMargin(-21178, 231136)).toBeCloseTo(-9.162, 2);
  });

  it('ritorna 0 se i ricavi sono 0', () => {
    expect(calculateEbitdaMargin(1000, 0)).toBe(0);
  });

  it('gestisce input null/undefined', () => {
    expect(calculateEbitdaMargin(null, 1000)).toBe(0);
    expect(calculateEbitdaMargin(100, null)).toBe(0);
  });
});

describe('calculateMargin', () => {
  it('calcola un margine percentuale generico', () => {
    expect(calculateMargin(50, 200)).toBeCloseTo(25);
    expect(calculateMargin(0, 100)).toBe(0);
    expect(calculateMargin(100, 0)).toBe(0);
  });
});

describe('macroMetricsLabels', () => {
  it('mantiene la sequenza gerarchica del CE', () => {
    const labels = macroMetricsLabels.map(m => m.label);
    expect(labels[0]).toBe('TOTALE RICAVI');
    expect(labels[labels.length - 1]).toBe('RISULTATO DI ESERCIZIO');
    expect(labels).toContain('EBITDA');
    expect(labels).toContain('GROSS PROFIT');
    expect(labels).toContain('EBIT');
  });

  it('le key-metric hanno il tipo corretto', () => {
    const ebitda = macroMetricsLabels.find(m => m.label === 'EBITDA');
    expect(ebitda?.type).toBe('key-metric');
    expect(ebitda?.keys).toContain('ebitda');

    const risultato = macroMetricsLabels.find(m => m.label === 'RISULTATO DI ESERCIZIO');
    expect(risultato?.type).toBe('result');
  });
});

import { describe, it, expect } from 'vitest';
import { normalizeForCe } from './extractBilancino.ts';

describe('normalizeForCe', () => {
  it('ricavi sempre positivi', () => {
    expect(normalizeForCe('58/10/005', 'ricavi', -1500)).toBe(1500);
    expect(normalizeForCe('64/05/010', 'ricavi', 800)).toBe(800);
  });

  it('costo operativo positivo aumenta spesa', () => {
    expect(normalizeForCe('66/20/005', 'costi', 1200)).toBe(1200);
  });

  it('storno costo negativo riduce spesa (no abs cieco)', () => {
    expect(normalizeForCe('66/05/010', 'costi', -350)).toBe(-350);
    expect(normalizeForCe('68/05/005', 'costi', -120)).toBe(-120);
  });

  it('conti 88/ finanziari preservano segno', () => {
    expect(normalizeForCe('88/20/551', 'costi', 500)).toBe(500);
    expect(normalizeForCe('88/20/551', 'costi', -80)).toBe(-80);
  });

  it('conti 84/ imposte preservano segno', () => {
    expect(normalizeForCe('84/05/010', 'costi', 2000)).toBe(2000);
    expect(normalizeForCe('84/05/010', 'costi', -100)).toBe(-100);
  });
});

describe('resolveAccountCe — storni costo in colonna ricavi', () => {
  it('68/ in colonna ricavi resta costo con importo negativo', async () => {
    const { resolveAccountCe } = await import('./extractBilancino.ts');
    const r = resolveAccountCe('68/05/125', 'ricavi', 3796.8);
    expect(r.side).toBe('costi');
    expect(r.balanceNormalized).toBe(-3796.8);
  });

  it('88/ in colonna ricavi resta costo finanziario negativo', async () => {
    const { resolveAccountCe } = await import('./extractBilancino.ts');
    const r = resolveAccountCe('88/20/552', 'ricavi', 3184.77);
    expect(r.side).toBe('costi');
    expect(r.balanceNormalized).toBe(-3184.77);
  });

  it('58/ in colonna ricavi resta ricavo positivo', async () => {
    const { resolveAccountCe } = await import('./extractBilancino.ts');
    const r = resolveAccountCe('58/10/005', 'ricavi', 12500);
    expect(r.side).toBe('ricavi');
    expect(r.balanceNormalized).toBe(12500);
  });
});

/**
 * Test estrattore bilancino Awentia (studio + stampa).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  parseDataRif,
  parseFilenamePeriod,
} from './index.ts';
import { hasImportFixtures } from '../test/importFixtures.ts';

const BILANCINO_FILE = 'import_data/Bilancini/Awentia/Bilancini 2025/AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx';
const STAMPA_FILE = 'import_data/Bilancini/Awentia/Bilancini 2025/AWENTIA 06 25.xlsx';
const STAMPA_FILENAME = 'AWENTIA 06 25.xlsx';

function loadBilancino() {
  const bytes = new Uint8Array(readFileSync(BILANCINO_FILE));
  return readWorkbookData(XLSX as never, bytes);
}

describe('parseDataRif / parseFilenamePeriod', () => {
  it('parseDataRif da serial Excel 46022 → dicembre 2025', () => {
    const { year, month } = parseDataRif(46022);
    expect(year).toBe(2025);
    expect(month).toBe(12);
  });

  it('parseDataRif da stringa IT', () => {
    const { year, month } = parseDataRif('31/12/2025');
    expect(year).toBe(2025);
    expect(month).toBe(12);
  });

  it('parseFilenamePeriod da "06 25"', () => {
    expect(parseFilenamePeriod(STAMPA_FILENAME)).toEqual({ year: 2025, month: 6 });
  });
});

if (hasImportFixtures()) {
  describe('extractBilancino — Awentia BI 31.12.2025', () => {
    let wb: ReturnType<typeof readWorkbookData>;

    beforeAll(() => {
      wb = loadBilancino();
    });

    it('riconosce profilo bilancino_studio', () => {
      const detection = detectProfile(wb);
      expect(detection.profile.id).toBe('bilancino_studio');
      expect(detection.usedFallback).toBe(false);
    });

    it('estrae 71 conti CE leaf e quadratura totali', () => {
      const result = extractBilancino(wb);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(12);
      expect(result.accounts).toHaveLength(71);
      expect(result.accounts.every((a) => a.section === 'CE')).toBe(true);
      expect(result.accounts.every((a) => !a.accountCode.endsWith('/000'))).toBe(true);

      expect(result.totals.totaleRicavi).toBeCloseTo(331842.08, 2);
      expect(result.totals.totaleCosti).toBeCloseTo(452088.71, 2);
      expect(result.totals.risultato).toBeCloseTo(-120246.63, 2);

      const q = (result.totals.totaleRicavi ?? 0)
        - (result.totals.totaleCosti ?? 0)
        - (result.totals.risultato ?? 0);
      expect(Math.abs(q)).toBeLessThanOrEqual(0.01);
    });

    it('normalizza i ricavi Conto2 in convenzione CE positiva', () => {
      const result = extractBilancino(wb);
      const ricavi = result.accounts.filter((a) => a.side === 'ricavi');
      expect(ricavi.length).toBeGreaterThan(0);
      for (const acc of ricavi) {
        expect(acc.balanceNormalized).toBeGreaterThanOrEqual(0);
        expect(acc.balanceNormalized).toBe(Math.abs(acc.balanceRaw));
      }
    });
  });

  describe('extractBilancino — Awentia giugno 2025 (bilancino_stampa)', () => {
    let wb: ReturnType<typeof readWorkbookData>;

    beforeAll(() => {
      wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(STAMPA_FILE)));
    });

    it('riconosce profilo bilancino_stampa', () => {
      const detection = detectProfile(wb);
      expect(detection.profile.id).toBe('bilancino_stampa');
      expect(detection.usedFallback).toBe(false);
    });

    it('estrae 53 conti CE leaf da Table 2+3 e quadratura totali Table 3', () => {
      const result = extractBilancino(wb, detectProfile(wb).profile, STAMPA_FILENAME);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(6);
      expect(result.profileId).toBe('bilancino_stampa');
      expect(result.accounts).toHaveLength(53);
      expect(result.accounts.every((a) => a.section === 'CE')).toBe(true);
      expect(result.accounts.every((a) => !a.accountCode.includes('***'))).toBe(true);

      const costi = result.accounts.filter((a) => a.side === 'costi');
      const ricavi = result.accounts.filter((a) => a.side === 'ricavi');
      expect(costi).toHaveLength(50);
      expect(ricavi).toHaveLength(3);

      expect(result.totals.totaleRicavi).toBeCloseTo(186440.99, 2);
      expect(result.totals.totaleCosti).toBeCloseTo(236358.17, 2);
      expect(result.totals.risultato).toBeCloseTo(-49917.18, 2);

      const q = (result.totals.totaleRicavi ?? 0)
        - (result.totals.totaleCosti ?? 0)
        - (result.totals.risultato ?? 0);
      expect(Math.abs(q)).toBeLessThanOrEqual(0.01);
    });
  });
}

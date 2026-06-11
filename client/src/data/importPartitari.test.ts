import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  countCeAccounts,
  inferPartitariPeriod,
  loadPartitariParser,
  parseItalianDate,
  previewPartitariImport,
} from './importPartitari';
import { importFixtureExists } from '@shared/test/importFixtures';

const CSV_FIXTURE = 'import_data/CASA PROFITTO VELOCE PARTITARI 31 07.csv';
const XLSX_FIXTURE = 'import_data/PARTITARI_BABYLON_31_12_25.xlsx';

function fileFromPath(path: string, mimeType: string): File {
  const buffer = readFileSync(path);
  const name = path.split(/[/\\]/).pop() ?? 'partitario.csv';
  return new File([buffer], name, { type: mimeType });
}

describe('importPartitari', () => {
  it('parseItalianDate accetta dd/mm/yyyy e dd/mm/yy', () => {
    expect(parseItalianDate('31/07/2025')).toEqual(new Date(2025, 6, 31));
    expect(parseItalianDate('01/01/25')).toEqual(new Date(2025, 0, 1));
    expect(parseItalianDate('')).toBeNull();
  });

  it('inferPartitariPeriod usa la data più recente', () => {
    const period = inferPartitariPeriod([
      { Data_registraz: '01/01/25' },
      { Data_registraz: '31/07/25' },
    ]);
    expect(period).toEqual({ year: 2025, month: 7 });
  });

  it('countCeAccounts conta codici conto distinti', () => {
    expect(
      countCeAccounts([
        { CodiceConto: '58/10/010' },
        { CodiceConto: '58/10/010' },
        { CodiceConto: '61/05/005' },
      ]),
    ).toBe(2);
  });

  it.skipIf(!importFixtureExists(CSV_FIXTURE))('loadPartitariParser rileva export CSV con separatore ;', async () => {
    const file = fileFromPath(CSV_FIXTURE, 'text/csv');
    const parser = await loadPartitariParser(file);
    expect(parser.detectPartitari()).toBe(true);
  });

  it.skipIf(!importFixtureExists(CSV_FIXTURE))('previewPartitariImport su CSV di esempio', async () => {
    const file = fileFromPath(CSV_FIXTURE, 'text/csv');
    const preview = await previewPartitariImport(file);
    expect(preview.rowCount).toBeGreaterThan(0);
    expect(preview.ceAccountCount).toBeGreaterThan(0);
    expect(preview.year).toBe(2025);
    expect(preview.month).toBe(7);
    expect(preview.headers).toContain('CodiceConto');
    expect(preview.headers).toContain('Data_registraz');
  });

  it.skipIf(!importFixtureExists(XLSX_FIXTURE))('previewPartitariImport su XLSX di esempio', async () => {
    const file = fileFromPath(
      XLSX_FIXTURE,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const preview = await previewPartitariImport(file);
    expect(preview.rowCount).toBeGreaterThan(0);
    expect(preview.ceAccountCount).toBeGreaterThan(0);
    expect(preview.year).toBeGreaterThanOrEqual(2025);
    expect(preview.month).toBeGreaterThanOrEqual(1);
    expect(preview.month).toBeLessThanOrEqual(12);
    expect(preview.periodLabel.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { buildSourceMatrix, SOURCE_MONTH_HEADERS } from './sourceMatrix';

describe('buildSourceMatrix', () => {
  it('costruisce header Excel-like con split anno corrente/precedente', () => {
    const matrix = buildSourceMatrix({
      primaryYear: 2025,
      referenceMonth: 8,
      mappings: [
        {
          accountCode: '66/20/005',
          accountDescription: 'MATERIE DI CONSUMO',
          famiglia: 'Struttura',
          analiticaLabel: 'Spese generali',
        },
      ],
      balances: [
        { accountCode: '66/20/005', year: 2025, month: 8, balanceNormalized: 100 },
        { accountCode: '66/20/005', year: 2024, month: 12, balanceNormalized: 21.85 },
      ],
    });

    expect(matrix[0][3]).toBe(2025);
    expect(matrix[0][5]).toBe('ANNO CORRENTE');
    expect(String(matrix[0].find((c) => c === 'ANNO PRECEDENTE'))).toBe('ANNO PRECEDENTE');
    expect(matrix[2].slice(0, 4)).toEqual(['Conto Co.Ge.', 'Descrizione', 'Famiglia', 'Analitica']);
    expect(matrix[2].slice(5, 17)).toEqual([...SOURCE_MONTH_HEADERS]);
  });

  it('inserisce saldi mensili e YTD per conto', () => {
    const matrix = buildSourceMatrix({
      primaryYear: 2025,
      mappings: [
        {
          accountCode: '68/05/005',
          accountDescription: 'TRASPORTI SU ACQUISTI',
          famiglia: 'Struttura',
          analiticaLabel: 'Spese generali',
        },
      ],
      balances: [
        { accountCode: '68/05/005', year: 2025, month: 1, balanceNormalized: 8.9 },
        { accountCode: '68/05/005', year: 2025, month: 2, balanceNormalized: 682.65 },
        { accountCode: '68/05/005', year: 2025, month: 3, balanceNormalized: 688.77 },
      ],
    });

    const row = matrix[4];
    expect(row[0]).toBe('68/05/005');
    expect(row[5]).toBe(8.9);
    expect(row[6]).toBe(682.65);
    expect(row[7]).toBe(688.77);
    expect(row[8]).toBeNull();
    expect(row[17]).toBe(688.77);
    expect(row[18]).toBe(688.77);
  });
});

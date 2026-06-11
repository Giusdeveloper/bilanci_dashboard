import { describe, expect, it } from 'vitest';
import { buildPartitariPeriods } from './financialReads';

describe('buildPartitariPeriods', () => {
  it('deduplicates and sorts periods from most recent', () => {
    const periods = buildPartitariPeriods([
      { year: 2025, month: 12 },
      { year: 2026, month: 2 },
      { year: 2025, month: 12 },
      { year: 2026, month: 4 },
      { year: 2025, month: 6 },
    ]);

    expect(periods).toEqual([
      { year: 2026, month: 4 },
      { year: 2026, month: 2 },
      { year: 2025, month: 12 },
      { year: 2025, month: 6 },
    ]);
  });

  it('skips invalid rows', () => {
    const periods = buildPartitariPeriods([
      { year: 0, month: 3 },
      { year: 2026, month: 0 },
      { year: 2026, month: 13 },
      { year: '2026', month: '3' },
    ]);

    expect(periods).toEqual([{ year: 2026, month: 3 }]);
  });
});

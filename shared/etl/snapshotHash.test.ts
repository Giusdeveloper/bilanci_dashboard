import { describe, it, expect } from 'vitest';
import { hashSnapshotFacts } from './snapshotHash.ts';

describe('hashSnapshotFacts', () => {
  it('è deterministico indipendentemente dall ordine input', () => {
    const a = hashSnapshotFacts([
      {
        category_id: 'cat-b',
        year: 2025,
        month: 6,
        amount_progressive: 100,
        amount_period: 10,
        source_label: 'A',
      },
      {
        category_id: 'cat-a',
        year: 2025,
        month: null,
        amount_progressive: 200,
        amount_period: null,
        source_label: 'B',
      },
    ]);
    const b = hashSnapshotFacts([
      {
        category_id: 'cat-a',
        year: 2025,
        month: null,
        amount_progressive: 200,
        amount_period: null,
        source_label: 'B',
      },
      {
        category_id: 'cat-b',
        year: 2025,
        month: 6,
        amount_progressive: 100,
        amount_period: 10,
        source_label: 'A',
      },
    ]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('cambia se cambia un importo', () => {
    const base = hashSnapshotFacts([
      {
        category_id: 'cat-a',
        year: 2025,
        month: 3,
        amount_progressive: 50,
        amount_period: 5,
        source_label: null,
      },
    ]);
    const changed = hashSnapshotFacts([
      {
        category_id: 'cat-a',
        year: 2025,
        month: 3,
        amount_progressive: 51,
        amount_period: 5,
        source_label: null,
      },
    ]);
    expect(base).not.toBe(changed);
  });
});

import { describe, it, expect } from 'vitest';
import {
  applyBalanceChangesToMap,
  applyManualFactOverrides,
  buildBalanceUpdateChanges,
  buildManualFactChange,
  buildMappingUpdateChanges,
} from './draftChanges.ts';

describe('buildBalanceUpdateChanges', () => {
  const published = [
    { accountCode: '58/10/005', year: 2025, month: 12, balanceNormalized: 100 },
    { accountCode: '66/20/005', year: 2025, month: 12, balanceNormalized: 40 },
  ];

  it('produce solo i delta rispetto ai saldi published', () => {
    const edited = new Map([
      ['58/10/005', 150],
      ['66/20/005', 40],
    ]);
    const changes = buildBalanceUpdateChanges(published, edited, 2025, 12);
    expect(changes).toHaveLength(1);
    expect(changes[0].entityKey).toEqual({ account_code: '58/10/005', year: 2025, month: 12 });
    expect(changes[0].newValue).toEqual({ balance_normalized: 150 });
    expect(changes[0].oldValue).toEqual({ balance_normalized: 100 });
  });

  it('include conti nuovi non presenti in published', () => {
    const edited = new Map([['99/99/001', 25]]);
    const changes = buildBalanceUpdateChanges(published, edited, 2025, 12);
    expect(changes).toHaveLength(1);
    expect(changes[0].oldValue).toEqual({ balance_normalized: 0 });
  });
});

describe('applyBalanceChangesToMap', () => {
  it('applica i change sulla mappa base', () => {
    const base = new Map([['A', 10], ['B', 20]]);
    const changes = buildBalanceUpdateChanges(
      [{ accountCode: 'A', year: 2025, month: 1, balanceNormalized: 10 }],
      new Map([['A', 30]]),
      2025,
      1,
    );
    const result = applyBalanceChangesToMap(base, changes);
    expect(result.get('A')).toBe(30);
    expect(result.get('B')).toBe(20);
  });
});

describe('applyManualFactOverrides', () => {
  it('sovrascrive amount_progressive per categoria/mese', () => {
    const facts = [
      {
        categoryCode: 'R01',
        year: 2025,
        month: 6,
        amountProgressive: 100,
        amountPeriod: 10,
        sourceLabel: 'Pipeline',
      },
    ];
    const result = applyManualFactOverrides(facts, [
      {
        categoryCode: 'R01',
        year: 2025,
        month: 6,
        amountProgressive: 150,
        motivazione: 'Rettifica cliente',
      },
    ]);
    expect(result[0].amountProgressive).toBe(150);
    expect(result[0].sourceLabel).toContain('Rettifica cliente');
  });

  it('aggiunge fact mancante se non presente in pipeline', () => {
    const result = applyManualFactOverrides([], [
      {
        categoryCode: 'C99',
        year: 2025,
        month: 3,
        amountProgressive: 42,
        motivazione: 'Nuova voce',
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].categoryCode).toBe('C99');
  });
});

describe('buildManualFactChange', () => {
  it('produce change manual_fact con motivazione', () => {
    const change = buildManualFactChange('R01', 2025, 6, 100, 120, 'Correzione');
    expect(change.changeType).toBe('manual_fact');
    expect(change.entityKey).toEqual({ category_code: 'R01', year: 2025, month: 6 });
    expect(change.newValue).toMatchObject({ amount_progressive: 120, motivazione: 'Correzione' });
  });
});

describe('buildMappingUpdateChanges', () => {
  const published = [
    {
      accountCode: '58/10/005',
      analiticaLabel: 'Ricavi vendite',
      signMultiplier: 1,
      famiglia: 'Ricavi',
    },
  ];

  it('produce delta quando cambia analitica', () => {
    const edited = new Map([
      [
        '58/10/005',
        {
          accountCode: '58/10/005',
          analiticaLabel: 'Altri ricavi',
          signMultiplier: 1,
          famiglia: 'Ricavi',
        },
      ],
    ]);
    const changes = buildMappingUpdateChanges(published, edited);
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe('mapping_update');
    expect(changes[0].newValue).toMatchObject({ analitica_label: 'Altri ricavi' });
  });
});

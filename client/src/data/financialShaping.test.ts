import { describe, it, expect } from 'vitest';
import {
  yearColumnKey,
  cssClassForMetricType,
  cssClassForRowKind,
  formatVariance,
  buildMacroTableRows,
  findRevenueReference,
  buildCEDettaglioTableRows,
  monthLabels,
  buildMonthlyDetailRows,
  buildSingleMonthDetailRows,
  monthDetailHref,
  monthFromSlug,
  monthSlug,
  buildMonthlySinteticoRows,
} from './financialShaping';
import type { MacroMetricRow, CEDettaglioModel, MonthlyMacroRow } from '@shared/queries';

// Formatter deterministici e semplici (no Intl) per asserzioni leggibili.
const fmtCur = (v: number | null | undefined): string => `€${Math.round(v ?? 0)}`;
const fmtPct = (v: number | null | undefined, decimals = 1): string =>
  `${(v ?? 0).toFixed(decimals)}%`;

describe('helpers di stile/colonne', () => {
  it('yearColumnKey', () => {
    expect(yearColumnKey(2025)).toBe('val2025');
  });

  it('cssClassForMetricType', () => {
    expect(cssClassForMetricType('result')).toBe('result');
    expect(cssClassForMetricType('key-metric')).toBe('key-metric');
    expect(cssClassForMetricType('total')).toBe('total-dark');
    expect(cssClassForMetricType('subtotal')).toBe('total-dark');
    expect(cssClassForMetricType('normal')).toBe('');
  });

  it('cssClassForRowKind', () => {
    expect(cssClassForRowKind('risultato')).toBe('result');
    expect(cssClassForRowKind('margine')).toBe('key-metric');
    expect(cssClassForRowKind('totale')).toBe('total-dark');
    expect(cssClassForRowKind('subtotale')).toBe('highlight');
    expect(cssClassForRowKind('voce')).toBe('');
    expect(cssClassForRowKind(null)).toBe('');
  });
});

describe('formatVariance', () => {
  it('aggiunge il segno e gestisce il null', () => {
    expect(formatVariance(12.3, fmtPct)).toBe('+12.3%');
    expect(formatVariance(-4, fmtPct)).toBe('-4.0%');
    expect(formatVariance(null, fmtPct)).toBe('n/a');
  });
});

describe('buildMacroTableRows', () => {
  const rows: MacroMetricRow[] = [
    {
      label: 'TOTALE RICAVI',
      type: 'total',
      keys: ['totaleRicavi'],
      valuesByYear: { 2025: 1000, 2024: 500, 2023: 0 },
      percentOfRevenueByYear: { 2025: 100, 2024: 100, 2023: 0 },
      variancePct: 100,
    },
    {
      label: 'EBITDA',
      type: 'key-metric',
      keys: ['ebitda'],
      valuesByYear: { 2025: 200, 2024: 100, 2023: 0 },
      percentOfRevenueByYear: { 2025: 20, 2024: 20, 2023: 0 },
      variancePct: null,
    },
  ];

  it('formatta i valori per ogni anno + % ricavi t0 + varianza + classe', () => {
    const out = buildMacroTableRows(rows, [2025, 2024, 2023], fmtCur, fmtPct);
    expect(out[0]).toMatchObject({
      voce: 'TOTALE RICAVI',
      val2025: '€1000',
      val2024: '€500',
      val2023: '€0',
      percentage: '100.0%',
      variance: '+100.0%',
      className: 'total-dark',
    });
    expect(out[1].variance).toBe('n/a');
    expect(out[1].className).toBe('key-metric');
    expect(out[1].percentage).toBe('20.0%');
  });
});

describe('CE dettaglio fedele', () => {
  const model: CEDettaglioModel = {
    year: 2025,
    reportType: 'ce_dettaglio',
    profile: 'awentia',
    rows: [
      {
        rowIndex: 0,
        label: 'TOTALE RICAVI',
        indentLevel: 0,
        rowKind: 'totale',
        code: 'totaleRicavi',
        isMapped: true,
        amountProgressive: 1000,
        monthlyPeriod: null,
        monthlyProgressive: null,
      },
      {
        rowIndex: 1,
        label: 'Voce esotica non mappata',
        indentLevel: 1,
        rowKind: 'voce',
        code: null,
        isMapped: false,
        amountProgressive: 250,
        monthlyPeriod: null,
        monthlyProgressive: null,
      },
    ],
  };

  it('findRevenueReference usa totaleRicavi', () => {
    expect(findRevenueReference(model)).toBe(1000);
  });

  it('costruisce righe fedeli, incidenza %, indent e voci non mappate', () => {
    const out = buildCEDettaglioTableRows(model, fmtCur, fmtPct);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      voce: 'TOTALE RICAVI',
      val2025: '€1000',
      percentage: '100.0%',
      className: 'total-dark',
    });
    // La voce non mappata è preservata, indentata e con incidenza calcolata.
    expect(out[1].voce).toBe('\u00A0\u00A0Voce esotica non mappata');
    expect(out[1].percentage).toBe('25.0%');
    expect(out[1].className).toBe('');
  });

  it('evita la divisione per zero quando i ricavi sono 0', () => {
    const noRev: CEDettaglioModel = { ...model, rows: [model.rows[1]] };
    expect(findRevenueReference(noRev)).toBe(0);
    const out = buildCEDettaglioTableRows(noRev, fmtCur, fmtPct);
    // base=1 -> 250/1*100 = 25000%
    expect(out[0].percentage).toBe('25000.0%');
  });
});

describe('tabelle mensili', () => {
  it('monthLabels mappa i numeri mese alle etichette brevi', () => {
    expect(monthLabels([1, 2, 12])).toEqual(['Gen', 'Feb', 'Dic']);
  });

  it('buildMonthlyDetailRows prende la serie ai mesi e mette — se assente', () => {
    const model: CEDettaglioModel = {
      year: 2025,
      reportType: 'ce_dettaglio',
      profile: 'awentia',
      rows: [
        {
          rowIndex: 0,
          label: 'Ricavi',
          indentLevel: 1,
          rowKind: 'voce',
          code: 'ricaviCaratteristici',
          isMapped: true,
          amountProgressive: 300,
          monthlyPeriod: [10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          monthlyProgressive: [10, 30, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          rowIndex: 1,
          label: 'Voce non mappata',
          indentLevel: 0,
          rowKind: 'voce',
          code: null,
          isMapped: false,
          amountProgressive: 5,
          monthlyPeriod: null,
          monthlyProgressive: null,
        },
      ],
    };
    const prog = buildMonthlyDetailRows(model, 'progressive', [1, 2, 3], fmtCur);
    expect(prog[0].voce).toBe('\u00A0\u00A0Ricavi');
    expect(prog[0].values).toEqual(['€10', '€30', '€60']);
    expect(prog[1].values).toEqual(['—', '—', '—']);

    const point = buildMonthlyDetailRows(model, 'period', [1, 2, 3], fmtCur);
    expect(point[0].values).toEqual(['€10', '€20', '€30']);
  });

  it('monthSlug e monthFromSlug mappano slug URL e numeri mese', () => {
    expect(monthSlug(3)).toBe('marzo');
    expect(monthFromSlug('marzo')).toBe(3);
    expect(monthFromSlug('invalid')).toBeUndefined();
    expect(monthDetailHref(4, 2025)).toBe('/ce-dettaglio-mensile/aprile?anno=2025');
  });

  it('buildSingleMonthDetailRows estrae valori puntuale e confronto anno precedente', () => {
    const model: CEDettaglioModel = {
      year: 2025,
      reportType: 'ce_dettaglio',
      profile: 'awentia',
      rows: [
        {
          rowIndex: 0,
          label: 'TOTALE RICAVI',
          indentLevel: 0,
          rowKind: 'totale',
          code: 'totaleRicavi',
          isMapped: true,
          amountProgressive: 300,
          monthlyPeriod: [100, 200, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          monthlyProgressive: [100, 300, 600, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          rowIndex: 1,
          label: 'EBITDA',
          indentLevel: 0,
          rowKind: 'margine',
          code: 'ebitda',
          isMapped: true,
          amountProgressive: 90,
          monthlyPeriod: [30, 60, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          monthlyProgressive: [30, 90, 180, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    };
    const prev: CEDettaglioModel = {
      ...model,
      year: 2024,
      rows: model.rows.map((r) => ({
        ...r,
        monthlyPeriod: r.code === 'totaleRicavi' ? [80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : [20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      })),
    };

    const out = buildSingleMonthDetailRows(model, 2, fmtCur, fmtPct, prev);
    expect(out[0].valueCurrent).toBe('€200');
    expect(out[0].percentage).toBe('100.0%');
    expect(out[0].valuePrevious).toBe('€0');
    expect(out[1].valueCurrent).toBe('€60');
    expect(out[1].percentage).toBe('30.0%');
    expect(out[1].varianceEuro).toBe('€60');
  });

  it('buildMonthlySinteticoRows formatta le serie macro per i mesi', () => {
    const rows: MonthlyMacroRow[] = [
      { label: 'TOTALE RICAVI', type: 'total', keys: ['totaleRicavi'], series: [100, 200, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { label: 'EBITDA', type: 'key-metric', keys: ['ebitda'], series: [30, 60, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ];
    const out = buildMonthlySinteticoRows(rows, [1, 2, 3], fmtCur);
    expect(out[0]).toMatchObject({ voce: 'TOTALE RICAVI', className: 'total-dark' });
    expect(out[0].values).toEqual(['€100', '€200', '€300']);
    expect(out[1].className).toBe('key-metric');
  });
});

import { describe, it, expect } from 'vitest';
import {
  aggregateYearFacts,
  valueForPeriod,
  computeKpis,
  buildMacroRows,
  buildCESintetico,
  buildDashboardModel,
  buildCEDettaglio,
  buildMonthlyMacroSeries,
  type LayoutInputRow,
} from './financialModel';
import type { FactRow, YearAggregates } from './types';

/**
 * Dataset mock ispirato ai dati reali (Awentia 2025): la serie mensile NON
 * quadra con la riga annuale (dicembre puntuale azzera il progressivo), quindi
 * il totale annuale deve provenire dalla riga `month = null`.
 */
function awentia2025Facts(): FactRow[] {
  const progressive = [
    56600.36, 82100.44, 117340.14, 142840.44, 161440.99, 186440.99,
    230029.65, 231135.88, 294225.87, 319882.1, 329341.94, 0,
  ];
  const period = [
    56600.36, 25500.08, 35239.7, 25500.3, 18600.55, 25000,
    43588.66, 1106.23, 63089.99, 25656.23, 9459.84, -329341.94,
  ];
  const rows: FactRow[] = [
    {
      code: 'totaleRicavi',
      label: 'TOTALE RICAVI',
      type: 'total',
      year: 2025,
      month: null,
      amountProgressive: 331842.08,
      amountPeriod: null,
    },
  ];
  for (let m = 1; m <= 12; m++) {
    rows.push({
      code: 'totaleRicavi',
      label: 'TOTALE RICAVI',
      type: 'total',
      year: 2025,
      month: m,
      amountProgressive: progressive[m - 1],
      amountPeriod: period[m - 1],
    });
  }
  return rows;
}

describe('aggregateYearFacts', () => {
  it('separa la riga annuale dalle serie mensili', () => {
    const agg = aggregateYearFacts(awentia2025Facts(), 2025);
    expect(agg.year).toBe(2025);
    expect(agg.annualByCode['totaleRicavi']).toBeCloseTo(331842.08, 2);
    expect(agg.monthsAvailable).toBe(12);
    expect(agg.periodByCode['totaleRicavi']).toHaveLength(12);
    expect(agg.periodByCode['totaleRicavi'][0]).toBeCloseTo(56600.36, 2);
    expect(agg.progressiveByCode['totaleRicavi'][6]).toBeCloseTo(230029.65, 2);
  });

  it('ignora le righe di anni diversi', () => {
    const facts: FactRow[] = [
      ...awentia2025Facts(),
      { code: 'totaleRicavi', label: 'x', type: 'total', year: 2024, month: null, amountProgressive: 99999, amountPeriod: null },
    ];
    const agg = aggregateYearFacts(facts, 2025);
    expect(agg.annualByCode['totaleRicavi']).toBeCloseTo(331842.08, 2);
  });

  it('gestisce un anno con soli dati annuali (nessun mese)', () => {
    const facts: FactRow[] = [
      { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2026, month: null, amountProgressive: 1234.5, amountPeriod: null },
    ];
    const agg = aggregateYearFacts(facts, 2026);
    expect(agg.monthsAvailable).toBe(0);
    expect(agg.annualByCode['ebitda']).toBe(1234.5);
    expect(agg.periodByCode['ebitda']).toBeUndefined();
  });
});

describe('valueForPeriod', () => {
  const agg = aggregateYearFacts(awentia2025Facts(), 2025);

  it("usa il totale annuale per l'intero anno (non la serie mensile rotta)", () => {
    expect(valueForPeriod(agg, 'totaleRicavi', '12M', 12)).toBeCloseTo(331842.08, 2);
    // YTD fino a dicembre = intero anno → usa l'annuale.
    expect(valueForPeriod(agg, 'totaleRicavi', 'YTD', 12)).toBeCloseTo(331842.08, 2);
  });

  it('somma la serie puntuale per i periodi infra-annuali', () => {
    // YTD fino a marzo = somma puntuali gen+feb+mar.
    expect(valueForPeriod(agg, 'totaleRicavi', 'YTD', 3)).toBeCloseTo(
      56600.36 + 25500.08 + 35239.7,
      2,
    );
    // Solo il mese di febbraio.
    expect(valueForPeriod(agg, 'totaleRicavi', 'M', 2)).toBeCloseTo(25500.08, 2);
    // Primo trimestre.
    expect(valueForPeriod(agg, 'totaleRicavi', '3M', 12)).toBeCloseTo(
      56600.36 + 25500.08 + 35239.7,
      2,
    );
  });

  it('usa il totale annuale quando non ci sono mesi', () => {
    const annualOnly: YearAggregates = {
      year: 2026,
      annualByCode: { ebitda: 500 },
      periodByCode: {},
      progressiveByCode: {},
      monthsAvailable: 0,
    };
    expect(valueForPeriod(annualOnly, 'ebitda', 'YTD', 6)).toBe(500);
    expect(valueForPeriod(annualOnly, 'mancante', '12M', 12)).toBe(0);
  });

  it('ripiega sul progressivo annuale per i file interinali con mensile rotto', () => {
    // Caso reale Awentia 2026 "al 28 febbraio": Gen ok, Feb progressivo=0 e
    // puntuale=-Gen, così la somma puntuale Gen-Feb si annulla. Il progressivo
    // annuale (totale-attraverso-Feb) è 7500 ed è la fonte autorevole.
    const interim: YearAggregates = {
      year: 2026,
      annualByCode: { totaleRicavi: 7500 },
      periodByCode: { totaleRicavi: [7500, -7500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      progressiveByCode: { totaleRicavi: [7500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      monthsAvailable: 2,
    };
    // Progressivo fino a Febbraio: serie mensile incoerente → annuale 7500.
    expect(valueForPeriod(interim, 'totaleRicavi', 'YTD', 2)).toBeCloseTo(7500, 2);
    // Progressivo fino a Gennaio: il progressivo mensile di Gennaio è valido.
    expect(valueForPeriod(interim, 'totaleRicavi', 'YTD', 1)).toBeCloseTo(7500, 2);
  });
});

describe('computeKpis', () => {
  it('calcola ricavi/costi/ebitda/margine e fa il fallback sulle chiavi', () => {
    const facts: FactRow[] = [
      { code: 'ricaviCaratteristici', label: 'Ricavi', type: 'normal', year: 2025, month: null, amountProgressive: 1000, amountPeriod: null },
      { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2025, month: null, amountProgressive: 200, amountPeriod: null },
      { code: 'risultato', label: 'Risultato', type: 'normal', year: 2025, month: null, amountProgressive: 50, amountPeriod: null },
    ];
    const agg = aggregateYearFacts(facts, 2025);
    const kpi = computeKpis(agg, 'YTD', 12);
    // totaleRicavi assente → fallback su ricaviCaratteristici.
    expect(kpi.ricavi).toBe(1000);
    expect(kpi.ebitda).toBe(200);
    expect(kpi.risultato).toBe(50);
    expect(kpi.costi).toBe(950);
    expect(kpi.margineEbitda).toBeCloseTo(20, 5);
  });

  it('margine 0 se ricavi 0', () => {
    const agg = aggregateYearFacts([], 2025);
    const kpi = computeKpis(agg, 'YTD', 12);
    expect(kpi.ricavi).toBe(0);
    expect(kpi.margineEbitda).toBe(0);
  });

  it('Awentia apr 2026: costi lordi = ricavi − risultato (gate CFO)', () => {
    const facts: FactRow[] = [
      { code: 'totaleRicavi', label: 'TOTALE RICAVI', type: 'total', year: 2026, month: 4, amountProgressive: 12500, amountPeriod: 0 },
      { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2026, month: 4, amountProgressive: -73404.15, amountPeriod: -8587.72 },
      { code: 'risultatoEsercizio', label: 'RISULTATO', type: 'result', year: 2026, month: 4, amountProgressive: -98874.79, amountPeriod: -17552.22 },
    ];
    const agg = aggregateYearFacts(facts, 2026);
    const kpi = computeKpis(agg, 'YTD', 4);
    expect(kpi.ricavi).toBeCloseTo(12500, 2);
    expect(kpi.costi).toBeCloseTo(111374.79, 2);
    expect(kpi.costi).not.toBeCloseTo(kpi.ricavi - kpi.ebitda, 2);
  });
});

describe('buildMacroRows / buildCESintetico', () => {
  const facts2025: FactRow[] = [
    { code: 'totaleRicavi', label: 'TOTALE RICAVI', type: 'total', year: 2025, month: null, amountProgressive: 1000, amountPeriod: null },
    { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2025, month: null, amountProgressive: 300, amountPeriod: null },
    { code: 'risultatoEsercizio', label: 'RISULTATO', type: 'result', year: 2025, month: null, amountProgressive: 100, amountPeriod: null },
    { code: 'grossProfit', label: 'GROSS PROFIT', type: 'key-metric', year: 2025, month: null, amountProgressive: 800, amountPeriod: null },
  ];
  const facts2024: FactRow[] = [
    { code: 'totaleRicavi', label: 'TOTALE RICAVI', type: 'total', year: 2024, month: null, amountProgressive: 500, amountPeriod: null },
    { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2024, month: null, amountProgressive: 100, amountPeriod: null },
    { code: 'risultatoEsercizio', label: 'RISULTATO', type: 'result', year: 2024, month: null, amountProgressive: 50, amountPeriod: null },
  ];
  const aggByYear = {
    2025: aggregateYearFacts(facts2025, 2025),
    2024: aggregateYearFacts(facts2024, 2024),
  };

  it("calcola 'TOTALE COSTI' come ricavi - risultato (costi lordi)", () => {
    const rows = buildMacroRows(aggByYear, [2025, 2024], 'YTD', 12);
    const totaleCosti = rows.find((r) => r.keys.includes('totaleCosti'))!;
    expect(totaleCosti.valuesByYear[2025]).toBe(900); // 1000 - 100
    expect(totaleCosti.valuesByYear[2024]).toBe(450); // 500 - 50
  });

  it('calcola incidenza % sui ricavi e varianza t0 vs t1', () => {
    const rows = buildMacroRows(aggByYear, [2025, 2024], 'YTD', 12);
    const ricavi = rows.find((r) => r.label === 'TOTALE RICAVI')!;
    expect(ricavi.percentOfRevenueByYear[2025]).toBeCloseTo(100, 5);
    expect(ricavi.variancePct).toBeCloseTo(100, 5); // (1000-500)/500*100

    const gross = rows.find((r) => r.label === 'GROSS PROFIT')!;
    expect(gross.percentOfRevenueByYear[2025]).toBeCloseTo(80, 5);
  });

  it('buildCESintetico riporta anni, periodo e mese', () => {
    const model = buildCESintetico(aggByYear, [2025, 2024], '6M', 8);
    expect(model.years).toEqual([2025, 2024]);
    expect(model.period).toBe('6M');
    expect(model.monthReference).toBe(8);
    expect(model.rows.length).toBeGreaterThan(0);
  });

  it('sherpa42 usa PRIMO MARGINE al posto di GROSS PROFIT', () => {
    const rows = buildMacroRows(aggByYear, [2025, 2024], 'YTD', 12, 'sherpa42');
    expect(rows.find((r) => r.keys.includes('grossProfit'))?.label).toBe('PRIMO MARGINE');
    expect(rows.find((r) => r.label === 'GROSS PROFIT')).toBeUndefined();
  });
});

describe('buildDashboardModel', () => {
  it('costruisce kpi per anno e azzera gli anni mancanti', () => {
    const facts: FactRow[] = [
      { code: 'totaleRicavi', label: 'TOTALE RICAVI', type: 'total', year: 2025, month: null, amountProgressive: 1000, amountPeriod: null },
      { code: 'ebitda', label: 'EBITDA', type: 'key-metric', year: 2025, month: null, amountProgressive: 200, amountPeriod: null },
    ];
    const aggByYear = { 2025: aggregateYearFacts(facts, 2025) };
    const model = buildDashboardModel(aggByYear, [2025, 2024, 2023], 'YTD', 12);
    expect(model.kpisByYear[2025].ricavi).toBe(1000);
    expect(model.kpisByYear[2024].ricavi).toBe(0);
    expect(model.kpisByYear[2023].monthsAvailable).toBe(0);
    expect(model.trendMonths).toHaveLength(12);
    expect(model.summary.length).toBeGreaterThan(0);
  });
});

describe('buildCEDettaglio', () => {
  const layout: LayoutInputRow[] = [
    { rowIndex: 2, originalLabel: 'TOTALE RICAVI', indentLevel: 0, rowKind: 'totale', code: 'totaleRicavi', isMapped: true, amountProgressive: 1000 },
    { rowIndex: 0, originalLabel: 'Voce esotica non mappata', indentLevel: 1, rowKind: 'voce', code: null, isMapped: false, amountProgressive: 42 },
    { rowIndex: 1, originalLabel: 'Ricavi caratteristici', indentLevel: 1, rowKind: 'voce', code: 'ricaviCaratteristici', isMapped: true, amountProgressive: 900 },
  ];

  it('ordina per rowIndex e preserva le righe non mappate', () => {
    const model = buildCEDettaglio(layout, 2025, 'ce_dettaglio', 'awentia');
    expect(model.rows.map((r) => r.rowIndex)).toEqual([0, 1, 2]);
    const unmapped = model.rows[0];
    expect(unmapped.isMapped).toBe(false);
    expect(unmapped.code).toBeNull();
    expect(unmapped.label).toBe('Voce esotica non mappata');
    expect(unmapped.amountProgressive).toBe(42);
  });

  it('aggancia le serie mensili alle righe mappate quando fornito agg', () => {
    const facts: FactRow[] = [];
    for (let m = 1; m <= 6; m++) {
      facts.push({ code: 'ricaviCaratteristici', label: 'r', type: 'normal', year: 2025, month: m, amountProgressive: m * 10, amountPeriod: 10 });
    }
    const agg = aggregateYearFacts(facts, 2025);
    const model = buildCEDettaglio(layout, 2025, 'ce_dettaglio', 'awentia', agg);
    const ricavi = model.rows.find((r) => r.code === 'ricaviCaratteristici')!;
    expect(ricavi.monthlyPeriod).not.toBeNull();
    expect(ricavi.monthlyPeriod!).toHaveLength(12);
    expect(ricavi.monthlyPeriod![0]).toBe(10);
    // La riga non mappata non ha serie.
    const unmapped = model.rows.find((r) => !r.isMapped)!;
    expect(unmapped.monthlyPeriod).toBeNull();
  });
});

describe('buildMonthlyMacroSeries', () => {
  function facts(): FactRow[] {
    const rows: FactRow[] = [];
    for (let m = 1; m <= 3; m++) {
      rows.push({ code: 'totaleRicavi', label: 'r', type: 'total', year: 2025, month: m, amountProgressive: m * 100, amountPeriod: 100 });
      rows.push({ code: 'risultatoEsercizio', label: 'res', type: 'result', year: 2025, month: m, amountProgressive: m * 20, amountPeriod: 20 });
    }
    return rows;
  }

  it('estrae le serie progressive per le macro-voci', () => {
    const agg = aggregateYearFacts(facts(), 2025);
    const rows = buildMonthlyMacroSeries(agg, 'progressive');
    const ricavi = rows.find((r) => r.label === 'TOTALE RICAVI')!;
    expect(ricavi.series.slice(0, 3)).toEqual([100, 200, 300]);
    const risultato = rows.find((r) => r.label === 'RISULTATO DI ESERCIZIO')!;
    expect(risultato.series.slice(0, 3)).toEqual([20, 40, 60]);
  });

  it('estrae le serie puntuali e calcola TOTALE COSTI = ricavi - risultato', () => {
    const agg = aggregateYearFacts(facts(), 2025);
    const rows = buildMonthlyMacroSeries(agg, 'period');
    const ricavi = rows.find((r) => r.label === 'TOTALE RICAVI')!;
    expect(ricavi.series.slice(0, 3)).toEqual([100, 100, 100]);
    const costi = rows.find((r) => r.keys.includes('totaleCosti'))!;
    expect(costi.series.slice(0, 3)).toEqual([80, 80, 80]);
  });

  it('ritorna serie di zeri se non ci sono mesi', () => {
    const agg = aggregateYearFacts([], 2025);
    const rows = buildMonthlyMacroSeries(agg, 'progressive');
    const ricavi = rows.find((r) => r.label === 'TOTALE RICAVI')!;
    expect(ricavi.series).toHaveLength(12);
    expect(ricavi.series.every((v) => v === 0)).toBe(true);
  });
});

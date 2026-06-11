/**
 * periodMath — modulo PURO (nessuna dipendenza da React/Supabase/xlsx a runtime).
 *
 * Raccoglie la matematica di periodo del dominio bilanci:
 *  - parsing numerico in formato italiano (`cleanNumber`);
 *  - conversione progressivo (cumulato) <-> puntuale (mensile);
 *  - somme di periodo (YTD, trimestre, semestre, periodi dashboard).
 */

/**
 * Converte un valore arbitrario (numero, stringa in formato IT, errori Excel...)
 * in un numero. Restituisce 0 per input vuoti, trattini, "N/A" ed errori
 * Excel (`#REF!`, `#VALUE!`, `#ERROR!`, `#DIV/0!`).
 *
 * Formato IT: il punto è separatore delle migliaia, la virgola è il decimale.
 * Es: "1.234,56" -> 1234.56
 */
export const cleanNumber = (val: unknown): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    if (typeof val === 'string') {
        const s = val.trim().toUpperCase();
        if (s === '' || s === '-' || s === 'N/A' || s.includes('#REF') || s.includes('#VALUE') || s.includes('#ERROR') || s.includes('#DIV/0')) return 0;

        const clean = s.replace(/[^0-9,.-]/g, '')
                      .replace(/\./g, '')
                      .replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

/** Tipo di una serie per chiave (con eventuale chiave speciale `months`). */
export type SeriesByKey = Record<string, unknown[]>;

/**
 * Calcola i valori PUNTUALI (mensili) a partire da quelli PROGRESSIVI (cumulati).
 * La chiave speciale `months` viene copiata invariata.
 *
 * puntuale[0] = progressivo[0]
 * puntuale[i] = progressivo[i] - progressivo[i-1]   (arrotondato a 2 decimali)
 */
export const calculatePuntualFromProgressive = (data: SeriesByKey | null): SeriesByKey | null => {
    if (!data) return null;
    const result: SeriesByKey = { months: data.months };

    Object.keys(data).forEach(key => {
        if (key === 'months') return;
        const progValues = data[key] as number[];
        const puntualValues: number[] = [];

        for (let i = 0; i < progValues.length; i++) {
            if (i === 0) {
                puntualValues.push(progValues[i]);
            } else {
                puntualValues.push(Number((progValues[i] - progValues[i - 1]).toFixed(2)));
            }
        }
        result[key] = puntualValues;
    });

    return result;
};

/**
 * Inverso di {@link calculatePuntualFromProgressive}: ricostruisce i valori
 * PROGRESSIVI (cumulati) a partire da quelli PUNTUALI (mensili).
 * La chiave speciale `months` viene copiata invariata.
 */
export const calculateProgressiveFromPuntual = (data: SeriesByKey | null): SeriesByKey | null => {
    if (!data) return null;
    const result: SeriesByKey = { months: data.months };

    Object.keys(data).forEach(key => {
        if (key === 'months') return;
        const puntualValues = data[key] as number[];
        const progValues: number[] = [];
        let running = 0;

        for (let i = 0; i < puntualValues.length; i++) {
            running = Number((running + (puntualValues[i] || 0)).toFixed(2));
            progValues.push(running);
        }
        result[key] = progValues;
    });

    return result;
};

/** Somma i primi `n` elementi della serie (i null/undefined contano come 0). */
export const sumFirstN = (values: Array<number | null | undefined> | null | undefined, n: number): number => {
    if (!values || values.length === 0) return 0;
    return values.slice(0, n).reduce<number>((acc, v) => acc + (v || 0), 0);
};

/**
 * Somma Year-To-Date: somma i primi `month` valori (1..12) di una serie puntuale.
 */
export const sumYTD = (values: Array<number | null | undefined> | null | undefined, month: number): number =>
    sumFirstN(values, month);

/**
 * Somma di un trimestre (`quarter` da 1 a 4) su una serie puntuale di 12 mesi.
 */
export const sumQuarter = (values: Array<number | null | undefined> | null | undefined, quarter: number): number => {
    if (!values || values.length === 0) return 0;
    const start = (quarter - 1) * 3;
    return values.slice(start, start + 3).reduce<number>((acc, v) => acc + (v || 0), 0);
};

/**
 * Somma di un semestre (`semester` 1 o 2) su una serie puntuale di 12 mesi.
 */
export const sumSemester = (values: Array<number | null | undefined> | null | undefined, semester: number): number => {
    if (!values || values.length === 0) return 0;
    const start = (semester - 1) * 6;
    return values.slice(start, start + 6).reduce<number>((acc, v) => acc + (v || 0), 0);
};

export type DashboardPeriod =
  | 'M'
  | '3M'
  | '6M'
  | '9M'
  | '12M'
  | 'YTD'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'H1'
  | 'H2'
  | string;

/** Periodi a finestra fissa (non progressivi): trimestre, semestre, mese singolo. */
export const FIXED_WINDOW_PERIODS: readonly DashboardPeriod[] = [
  'M',
  '3M',
  '6M',
  '9M',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'H1',
  'H2',
];

/** Normalizza valori periodo legacy (3M → Q1, 6M → H1). */
export function normalizeDashboardPeriod(period: DashboardPeriod): DashboardPeriod {
  if (period === '3M') return 'Q1';
  if (period === '6M') return 'H1';
  return period;
}

/** Opzioni del selettore periodo in dashboard / CE sintetico. */
export const DASHBOARD_PERIOD_OPTIONS: ReadonlyArray<{ value: DashboardPeriod; label: string }> = [
  { value: 'YTD', label: 'Progressivo (Gen-Mese)' },
  { value: 'M', label: 'Solo Mese Selezionato' },
  { value: 'Q1', label: '1° Trimestre (Q1)' },
  { value: 'Q2', label: '2° Trimestre (Q2)' },
  { value: 'Q3', label: '3° Trimestre (Q3)' },
  { value: 'Q4', label: '4° Trimestre (Q4)' },
  { value: 'H1', label: '1° Semestre (H1)' },
  { value: 'H2', label: '2° Semestre (H2)' },
  { value: '9M', label: 'Progressivo (Gen-Set)' },
  { value: '12M', label: 'Anno Intero' },
];

/**
 * Calcola il valore di periodo usato dalla dashboard a partire da una serie
 * PUNTUALE e dal mese di riferimento `month` (1..12).
 *
 *  - 'M'   -> valore del singolo mese `month`
 *  - 'Q1'/'3M' -> trimestre 1 (gen-mar)
 *  - 'Q2'..'Q4' -> trimestri 2..4
 *  - 'H1'/'6M' -> semestre 1 (gen-giu)
 *  - 'H2' -> semestre 2 (lug-dic)
 *  - '9M'  -> somma primi 9 mesi (progressivo gen-set)
 *  - '12M' -> somma primi 12 mesi
 *  - altrimenti (es. 'YTD') -> somma primi `month` mesi
 */
export const sumPeriod = (
    values: Array<number | null | undefined> | null | undefined,
    period: DashboardPeriod,
    month: number
): number => {
    if (!values || values.length === 0) return 0;
    switch (period) {
        case 'M': return values[month - 1] || 0;
        case 'Q1':
        case '3M': return sumQuarter(values, 1);
        case 'Q2': return sumQuarter(values, 2);
        case 'Q3': return sumQuarter(values, 3);
        case 'Q4': return sumQuarter(values, 4);
        case 'H1':
        case '6M': return sumSemester(values, 1);
        case 'H2': return sumSemester(values, 2);
        case '9M': return sumFirstN(values, 9);
        case '12M': return sumFirstN(values, 12);
        default: return sumFirstN(values, month);
    }
};

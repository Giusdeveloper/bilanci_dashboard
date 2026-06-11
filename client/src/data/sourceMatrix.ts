/**
 * sourceMatrix — costruzione pura della griglia Source (foglio Excel) a partire
 * da mapping conti + saldi mensili bilancino.
 */

export const SOURCE_MONTH_HEADERS = [
  'GEN',
  'FEB',
  'MAR',
  'APR',
  'MAG',
  'GIU',
  'LUG',
  'AGO',
  'SET',
  'OTT',
  'NOV',
  'DIC',
] as const;

export interface SourceMappingInput {
  accountCode: string;
  accountDescription: string | null;
  famiglia: string | null;
  analiticaLabel: string | null;
}

export interface SourceBalanceInput {
  accountCode: string;
  year: number;
  month: number;
  balanceNormalized: number;
}

export interface BuildSourceMatrixInput {
  mappings: SourceMappingInput[];
  balances: SourceBalanceInput[];
  primaryYear: number;
  /** Ultimo mese disponibile per l'anno corrente (header "Mese"). Default: max mese con saldi. */
  referenceMonth?: number;
}

type Cell = string | number | null;

function balanceLookup(
  balances: SourceBalanceInput[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of balances) {
    map.set(`${b.accountCode}|${b.year}|${b.month}`, b.balanceNormalized);
  }
  return map;
}

function monthValue(
  lookup: Map<string, number>,
  accountCode: string,
  year: number,
  month: number,
): number | null {
  const v = lookup.get(`${accountCode}|${year}|${month}`);
  return v === undefined ? null : v;
}

function lastMonthWithData(
  lookup: Map<string, number>,
  accountCode: string,
  year: number,
): number {
  for (let m = 12; m >= 1; m--) {
    if (lookup.has(`${accountCode}|${year}|${m}`)) return m;
  }
  return 0;
}

function ytdValue(
  lookup: Map<string, number>,
  accountCode: string,
  year: number,
): number | null {
  const last = lastMonthWithData(lookup, accountCode, year);
  if (last === 0) return null;
  return monthValue(lookup, accountCode, year, last);
}

function buildMonthSection(
  lookup: Map<string, number>,
  accountCode: string,
  year: number,
): Cell[] {
  const months: Cell[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push(monthValue(lookup, accountCode, year, m));
  }
  const ytd = ytdValue(lookup, accountCode, year);
  months.push(ytd);
  months.push(ytd);
  return months;
}

function padRow(row: Cell[], targetLen: number): Cell[] {
  const out = [...row];
  while (out.length < targetLen) out.push('');
  return out;
}

/**
 * Costruisce la matrice 2D attesa da `/source` (header Excel-like + righe conto).
 */
export function buildSourceMatrix(input: BuildSourceMatrixInput): Cell[][] {
  const { mappings, balances, primaryYear } = input;
  const prevYear = primaryYear - 1;
  const lookup = balanceLookup(balances);

  const referenceMonth =
    input.referenceMonth ??
    Math.max(
      0,
      ...balances.filter((b) => b.year === primaryYear).map((b) => b.month),
    );

  const identityHeader = ['Conto Co.Ge.', 'Descrizione', 'Famiglia', 'Analitica', ''];
  const currentHeader = [...SOURCE_MONTH_HEADERS, 'YEAR TO DATE', 'TOTALE', ''];
  const previousHeader = [...SOURCE_MONTH_HEADERS.map((h) => ` ${h}`), 'YEAR TO DATE', 'TOTALE'];
  const headerRow = [...identityHeader, ...currentHeader, ...previousHeader];

  const splitIndex = identityHeader.length + currentHeader.length;
  const metaRow = padRow(
    ['Mese', referenceMonth || '', 'Anno', primaryYear, '', 'ANNO CORRENTE'],
    splitIndex,
  );
  metaRow[splitIndex] = 'ANNO PRECEDENTE';

  const monthNumbersRow = padRow(['', '', '', '', ''], splitIndex);
  for (let m = 1; m <= 12; m++) monthNumbersRow[identityHeader.length + m - 1] = m;
  for (let m = 1; m <= 12; m++) monthNumbersRow[splitIndex + m - 1] = m;

  const sortedMappings = [...mappings].sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const dataRows: Cell[][] = sortedMappings.map((m) => {
    const current = buildMonthSection(lookup, m.accountCode, primaryYear);
    const previous = buildMonthSection(lookup, m.accountCode, prevYear);
    return [
      m.accountCode,
      m.accountDescription ?? '',
      m.famiglia ?? '',
      m.analiticaLabel ?? '',
      '',
      ...current,
      ...previous,
    ];
  });

  return [metaRow, monthNumbersRow, headerRow, [], ...dataRows];
}

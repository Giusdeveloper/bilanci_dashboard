import * as XLSX from 'xlsx';

import { ExcelParser } from '@/utils/excelParser';

export interface PartitariBlob {
  headers: string[];
  data: Record<string, unknown>[];
}

export interface PartitariPreview extends PartitariBlob {
  fileName: string;
  rowCount: number;
  ceAccountCount: number;
  year: number;
  month: number;
  periodLabel: string;
}

const MONTH_LABELS = [
  '',
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const PERIOD_DATE_KEYS = ['DataFine', 'Data_registraz', 'Data_documento', 'DataInizio'] as const;

export function parseItalianDate(raw: unknown): Date | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

function readRawPartitariRows(parser: ExcelParser): Record<string, unknown>[] {
  const sheetName = parser.workbook.SheetNames[0];
  const sheet = parser.workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  if (!jsonData.length) return [];

  const headers = (jsonData[0] ?? []).map((cell) => String(cell ?? '').trim());
  return jsonData.slice(1).map((row) => {
    const entry: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) entry[header] = (row ?? [])[index];
    });
    return entry;
  });
}

export function inferPartitariPeriod(rows: Record<string, unknown>[]): { year: number; month: number } {
  const dataFineDates: Date[] = [];
  const otherDates: Date[] = [];

  for (const row of rows) {
    const dataFine = parseItalianDate(row.DataFine);
    if (dataFine) {
      dataFineDates.push(dataFine);
      continue;
    }

    for (const key of PERIOD_DATE_KEYS) {
      if (key === 'DataFine') continue;
      const parsed = parseItalianDate(row[key]);
      if (parsed) otherDates.push(parsed);
    }
  }

  const dates = dataFineDates.length > 0 ? dataFineDates : otherDates;
  if (dates.length === 0) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  const latest = dates.reduce((max, current) => (current > max ? current : max));
  return { year: latest.getFullYear(), month: latest.getMonth() + 1 };
}

export function countCeAccounts(rows: Record<string, unknown>[]): number {
  const accounts = new Set<string>();
  for (const row of rows) {
    const code = String(row.CodiceConto ?? '').trim();
    if (code) accounts.add(code);
  }
  return accounts.size;
}

function detectCsvDelimiter(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

export async function loadPartitariParser(file: File): Promise<ExcelParser> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const workbook = XLSX.read(text, {
      type: 'string',
      FS: detectCsvDelimiter(text),
      raw: false,
    });
    return ExcelParser.fromWorkbook(workbook);
  }

  const buffer = await file.arrayBuffer();
  return new ExcelParser(buffer);
}

export async function previewPartitariImport(file: File): Promise<PartitariPreview> {
  const parser = await loadPartitariParser(file);

  if (!parser.detectPartitari()) {
    throw new Error(
      'Formato partitario non riconosciuto. Il file deve essere un export PARTITARIO con colonne CodiceConto, Descr_conto e Data_registraz.',
    );
  }

  const parsed = parser.parsePartitari() as PartitariBlob | null;
  if (!parsed?.headers?.length || !parsed.data?.length) {
    throw new Error('Nessuna riga CE (conti 58–88) trovata nel partitario.');
  }

  const rawRows = readRawPartitariRows(parser);
  const { year, month } = inferPartitariPeriod(rawRows.length > 0 ? rawRows : parsed.data);
  const periodLabel = `${MONTH_LABELS[month] ?? month} ${year}`;

  return {
    fileName: file.name,
    headers: parsed.headers,
    data: parsed.data,
    rowCount: parsed.data.length,
    ceAccountCount: countCeAccounts(parsed.data),
    year,
    month,
    periodLabel,
  };
}

export async function savePartitariImport(
  saveFinancialData: (
    companyId: string,
    dataType: string,
    data: PartitariBlob,
    year: number,
    month?: number,
  ) => Promise<unknown>,
  companyId: string,
  preview: PartitariPreview,
): Promise<void> {
  await saveFinancialData(
    companyId,
    'partitari',
    { headers: preview.headers, data: preview.data },
    preview.year,
    preview.month,
  );
}

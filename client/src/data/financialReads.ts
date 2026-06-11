/**
 * financialReads — layer di LETTURA typed sopra il modello normalizzato.
 *
 * Legge da `financial_facts` / `report_layout` / `fiscal_periods` via supabase-js
 * e restituisce dati AGGREGATI per `(companyId, year, month|periodo)` usando la
 * logica PURA e testata in `@shared/queries`.
 *
 * Sostituisce l'accesso ai blob di `financial_data` e la nozione hardcoded
 * `progressivo2025`: i confronti pluriennali e gli YTD sono ora query/aggregazioni
 * sui facts per ANNO REALE. L'isolamento multi-tenant è garantito dalle RLS sul DB
 * (questo modulo NON aggiunge filtri di sicurezza lato client: il `company_id`
 * passato serve solo a delimitare la richiesta).
 */

import { supabase } from '@/lib/supabase';
import {
  aggregateYearFacts,
  buildDashboardModel,
  buildCESintetico,
  buildCEDettaglio,
  type FactRow,
  type YearAggregates,
  type DashboardModel,
  type CESinteticoModel,
  type CEDettaglioModel,
  type CompanyPeriods,
  type DashboardPeriod,
  type LayoutInputRow,
} from '@shared/queries';

/** Opzioni di periodo per le letture aggregate. */
export interface ReadOptions {
  /** periodo dashboard ('YTD' | 'M' | 'Q1'..'Q4' | 'H1' | 'H2' | '9M' | '12M'). Default 'YTD'. */
  period?: DashboardPeriod;
  /** mese di riferimento 1..12. Se omesso, dedotto dai dati (ultimo mese o 12). */
  month?: number;
  /** quanti anni precedenti includere nel confronto. Default 2 (=> t0, t1, t2). */
  compareYears?: number;
  /** Slug o id profilo CE (`companies.ce_profile` o slug azienda). */
  ceProfileId?: string | null;
}

/** report_type usato per il CE di dettaglio fedele all'Excel. */
export const REPORT_TYPE_CE_DETTAGLIO = 'ce_dettaglio';

type EmbeddedAccount = { code: string; label: string; type: string };

/** Converte un valore numerico Postgres (number|string|null) in number. */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? 0 : n;
}

/** Come {@link toNum} ma preserva null (per le righe annuali senza puntuale). */
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return toNum(v);
}

/** Estrae l'account embedded (PostgREST può restituire oggetto o array). */
function pickAccount(raw: unknown): EmbeddedAccount | null {
  if (!raw) return null;
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (!obj || typeof obj !== 'object') return null;
  const a = obj as Record<string, unknown>;
  if (typeof a.code !== 'string') return null;
  return {
    code: a.code,
    label: typeof a.label === 'string' ? a.label : a.code,
    type: typeof a.type === 'string' ? a.type : 'normal',
  };
}

/** Calcola gli anni di confronto a partire da `year` (incluso) andando a ritroso. */
export function resolveComparisonYears(year: number, compareYears = 2): number[] {
  const years: number[] = [];
  for (let i = 0; i <= compareYears; i++) years.push(year - i);
  return years;
}

/** Limite PostgREST di default: senza paginazione si troncano i facts multi-anno. */
export const FACT_ROWS_PAGE_SIZE = 1000;

const FACT_ROWS_SELECT =
  'year, month, amount_progressive, amount_period, master_chart_of_accounts:category_id (code, label, type)';

/** Converte righe grezze PostgREST in {@link FactRow}. */
export function mapRawFactRows(data: unknown[]): FactRow[] {
  const rows: FactRow[] = [];
  for (const r of data) {
    const account = pickAccount((r as Record<string, unknown>).master_chart_of_accounts);
    if (!account) continue;
    rows.push({
      code: account.code,
      label: account.label,
      type: account.type,
      year: toNum((r as Record<string, unknown>).year),
      month: ((r as Record<string, unknown>).month ?? null) as number | null,
      amountProgressive: toNum((r as Record<string, unknown>).amount_progressive),
      amountPeriod: toNumOrNull((r as Record<string, unknown>).amount_period),
    });
  }
  return rows;
}

/**
 * Legge le righe grezze di `financial_facts` per un'azienda e un set di anni,
 * unendo il conto canonico da `master_chart_of_accounts`.
 */
export async function fetchFactRows(
  companyId: string,
  years: number[],
): Promise<FactRow[]> {
  if (years.length === 0) return [];

  const rows: FactRow[] = [];
  let from = 0;

  while (true) {
    const to = from + FACT_ROWS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('financial_facts')
      .select(FACT_ROWS_SELECT)
      .eq('company_id', companyId)
      .in('year', years)
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = data ?? [];
    if (page.length === 0) break;

    rows.push(...mapRawFactRows(page));

    if (page.length < FACT_ROWS_PAGE_SIZE) break;
    from += FACT_ROWS_PAGE_SIZE;
  }

  return rows;
}

/** Aggrega i facts in mappa { anno -> YearAggregates }. */
function aggregateByYear(facts: FactRow[], years: number[]): Record<number, YearAggregates> {
  const out: Record<number, YearAggregates> = {};
  for (const y of years) out[y] = aggregateYearFacts(facts, y);
  return out;
}

/**
 * Mese di riferimento da usare: quello richiesto, oppure l'ultimo mese
 * disponibile per l'anno principale, oppure 12 (dati solo annuali).
 */
function resolveMonth(opts: ReadOptions | undefined, primaryAgg: YearAggregates): number {
  if (opts?.month && opts.month >= 1 && opts.month <= 12) return opts.month;
  return primaryAgg.monthsAvailable > 0 ? primaryAgg.monthsAvailable : 12;
}

/** Costruisce {@link CompanyPeriods} da righe `{ year, month }`. */
function buildCompanyPeriods(
  rows: Array<{ year: unknown; month: unknown }>,
): CompanyPeriods {
  const byYear: Record<number, { months: number[]; hasAnnual: boolean }> = {};
  for (const r of rows) {
    const year = toNum(r.year);
    const monthRaw = r.month;
    if (!byYear[year]) byYear[year] = { months: [], hasAnnual: false };
    if (monthRaw === null || monthRaw === undefined) {
      byYear[year].hasAnnual = true;
    } else {
      const m = toNum(monthRaw);
      if (!byYear[year].months.includes(m)) byYear[year].months.push(m);
    }
  }
  for (const entry of Object.values(byYear)) {
    entry.months.sort((a, b) => a - b);
  }
  const years = Object.keys(byYear)
    .map((y) => Number(y))
    .sort((a, b) => b - a);
  return { years, byYear };
}

/**
 * Elenco anni/periodi disponibili per un'azienda.
 * Legge prima `fiscal_periods`; se vuoto (es. import bilancino con publish_facts
 * ma senza periodi scritti), ricade su `financial_facts`.
 */
export async function fetchCompanyPeriods(companyId: string): Promise<CompanyPeriods> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('year, month')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('month', { ascending: true });

  if (error) throw error;

  const fromFiscal = buildCompanyPeriods(data ?? []);
  if (fromFiscal.years.length > 0) return fromFiscal;

  const { data: factRows, error: factErr } = await supabase
    .from('financial_facts')
    .select('year, month')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('month', { ascending: true, nullsFirst: true });

  if (factErr) throw factErr;
  return buildCompanyPeriods(factRows ?? []);
}

/**
 * Elenco anni disponibili per un'azienda dai facts (fallback se `fiscal_periods`
 * non fosse popolato). Ordinati discendenti.
 */
export async function fetchAvailableYears(companyId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('financial_facts')
    .select('year')
    .eq('company_id', companyId);
  if (error) throw error;
  const years = new Set<number>();
  for (const r of data ?? []) years.add(toNum((r as Record<string, unknown>).year));
  return Array.from(years).sort((a, b) => b - a);
}

/** Costruisce il modello dati della dashboard per `(companyId, year)`. */
export async function fetchDashboardModel(
  companyId: string,
  year: number,
  opts?: ReadOptions,
): Promise<DashboardModel> {
  const years = resolveComparisonYears(year, opts?.compareYears ?? 2);
  const facts = await fetchFactRows(companyId, years);
  const aggByYear = aggregateByYear(facts, years);
  const month = resolveMonth(opts, aggByYear[year]);
  const period = opts?.period ?? 'YTD';
  return buildDashboardModel(aggByYear, years, period, month, opts?.ceProfileId);
}

/** Costruisce il Conto Economico sintetico (multi-anno) per `(companyId, year)`. */
export async function fetchCESintetico(
  companyId: string,
  year: number,
  opts?: ReadOptions,
): Promise<CESinteticoModel> {
  const years = resolveComparisonYears(year, opts?.compareYears ?? 2);
  const facts = await fetchFactRows(companyId, years);
  const aggByYear = aggregateByYear(facts, years);
  const month = resolveMonth(opts, aggByYear[year]);
  const period = opts?.period ?? 'YTD';
  return buildCESintetico(aggByYear, years, period, month, opts?.ceProfileId);
}

/**
 * Costruisce il Conto Economico di dettaglio fedele all'Excel per
 * `(companyId, year)`, includendo le voci NON mappate e agganciando le serie
 * mensili (dai facts) alle righe mappate.
 */
export async function fetchCEDettaglio(
  companyId: string,
  year: number,
  reportType: string = REPORT_TYPE_CE_DETTAGLIO,
): Promise<CEDettaglioModel> {
  const { data, error } = await supabase
    .from('report_layout')
    .select(
      'row_index, original_label, indent_level, row_kind, is_mapped, amount_progressive, profile, master_chart_of_accounts:master_account_id (code, label, type)',
    )
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('report_type', reportType)
    .order('row_index', { ascending: true });

  if (error) throw error;

  let profile: string | null = null;
  const layout: LayoutInputRow[] = [];
  for (const r of data ?? []) {
    const rec = r as Record<string, unknown>;
    if (profile === null && typeof rec.profile === 'string') profile = rec.profile;
    const account = pickAccount(rec.master_chart_of_accounts);
    layout.push({
      rowIndex: toNum(rec.row_index),
      originalLabel: typeof rec.original_label === 'string' ? rec.original_label : '',
      indentLevel: toNum(rec.indent_level),
      rowKind: (rec.row_kind ?? null) as string | null,
      code: account?.code ?? null,
      isMapped: rec.is_mapped === true,
      amountProgressive: toNum(rec.amount_progressive),
    });
  }

  // Serie mensili dai facts dell'anno per agganciarle alle righe mappate.
  const facts = await fetchFactRows(companyId, [year]);
  const agg = aggregateYearFacts(facts, year);

  return buildCEDettaglio(layout, year, reportType, profile, agg);
}

/** Aggregati grezzi per un anno (utile per pagine custom della Fase 5). */
export async function fetchYearAggregates(
  companyId: string,
  year: number,
): Promise<YearAggregates> {
  const facts = await fetchFactRows(companyId, [year]);
  return aggregateYearFacts(facts, year);
}

/** Periodo (anno/mese) per cui esiste un blob partitari in `financial_data`. */
export interface PartitariPeriod {
  year: number;
  month: number;
}

/** Costruisce periodi partitari unici ordinati dal più recente (anno, mese). */
export function buildPartitariPeriods(
  rows: Array<{ year: unknown; month: unknown }>,
): PartitariPeriod[] {
  const seen = new Set<string>();
  const periods: PartitariPeriod[] = [];
  for (const row of rows) {
    const year = toNum(row.year);
    const month = toNum(row.month);
    if (year < 1 || month < 1 || month > 12) continue;
    const key = `${year}-${month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    periods.push({ year, month });
  }
  periods.sort((a, b) => b.year - a.year || b.month - a.month);
  return periods;
}

/** Elenco periodi partitari disponibili per un'azienda, dal più recente. */
export async function fetchPartitariPeriods(companyId: string): Promise<PartitariPeriod[]> {
  const { data, error } = await supabase
    .from('financial_data')
    .select('year, month')
    .eq('company_id', companyId)
    .eq('data_type', 'partitari')
    .not('month', 'is', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;

  return buildPartitariPeriods(data ?? []);
}

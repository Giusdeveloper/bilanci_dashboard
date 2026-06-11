/**
 * ledgerReads — lettura saldi bilancino (account_balances + mapping analitica).
 */

import { supabase } from '@/lib/supabase';
import { buildSourceMatrix } from './sourceMatrix';

export interface LedgerBalanceRow {
  accountCode: string;
  accountDescription: string | null;
  section: string;
  accountSide: string | null;
  year: number;
  month: number;
  balanceRaw: number;
  balanceNormalized: number;
  analiticaLabel: string | null;
  famiglia: string | null;
}

export async function fetchLedgerBalances(
  companyId: string,
  year: number,
  month?: number,
): Promise<LedgerBalanceRow[]> {
  let balQuery = supabase
    .from('account_balances')
    .select('account_code, account_description, section, account_side, year, month, balance_raw, balance_normalized')
    .eq('company_id', companyId)
    .eq('year', year)
    .order('account_code');

  if (month != null) balQuery = balQuery.eq('month', month);

  const [{ data: balances, error: balErr }, { data: mappings, error: mapErr }] = await Promise.all([
    balQuery,
    supabase
      .from('ledger_account_mappings')
      .select('account_code, analitica_label, famiglia')
      .eq('company_id', companyId),
  ]);

  if (balErr) throw balErr;
  if (mapErr) throw mapErr;

  const mapByCode = new Map(
    (mappings ?? []).map((m: { account_code: string; analitica_label: string; famiglia: string | null }) => [
      m.account_code,
      m,
    ]),
  );

  return (balances ?? []).map((r: Record<string, unknown>) => {
    const m = mapByCode.get(String(r.account_code));
    return {
      accountCode: String(r.account_code),
      accountDescription: (r.account_description as string | null) ?? null,
      section: String(r.section ?? 'CE'),
      accountSide: (r.account_side as string | null) ?? null,
      year: Number(r.year),
      month: Number(r.month),
      balanceRaw: Number(r.balance_raw),
      balanceNormalized: Number(r.balance_normalized),
      analiticaLabel: m?.analitica_label ?? null,
      famiglia: m?.famiglia ?? null,
    };
  });
}

/** Anni con saldi bilancino per un'azienda. */
export async function fetchLedgerYears(companyId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('year')
    .eq('company_id', companyId);
  if (error) throw error;
  const years = new Set((data ?? []).map((r: { year: number }) => Number(r.year)));
  return Array.from(years).sort((a, b) => b - a);
}

/** Griglia Source (mapping + saldi mensili) per la pagina `/source`. */
export async function fetchSourceMatrix(
  companyId: string,
  primaryYear?: number,
): Promise<unknown[][]> {
  const years = await fetchLedgerYears(companyId);
  const year = primaryYear ?? years[0] ?? new Date().getFullYear();
  const prevYear = year - 1;

  const [{ data: mappings, error: mapErr }, { data: balances, error: balErr }] = await Promise.all([
    supabase
      .from('ledger_account_mappings')
      .select('account_code, account_description, famiglia, analitica_label')
      .eq('company_id', companyId)
      .order('account_code'),
    supabase
      .from('account_balances')
      .select('account_code, year, month, balance_normalized')
      .eq('company_id', companyId)
      .in('year', [year, prevYear]),
  ]);

  if (mapErr) throw mapErr;
  if (balErr) throw balErr;

  return buildSourceMatrix({
    primaryYear: year,
    mappings: (mappings ?? []).map((r: Record<string, unknown>) => ({
      accountCode: String(r.account_code),
      accountDescription: (r.account_description as string | null) ?? null,
      famiglia: (r.famiglia as string | null) ?? null,
      analiticaLabel: (r.analitica_label as string | null) ?? null,
    })),
    balances: (balances ?? []).map((r: Record<string, unknown>) => ({
      accountCode: String(r.account_code),
      year: Number(r.year),
      month: Number(r.month),
      balanceNormalized: Number(r.balance_normalized),
    })),
  });
}

/** Mesi disponibili per anno. */
export async function fetchLedgerMonths(companyId: string, year: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('month')
    .eq('company_id', companyId)
    .eq('year', year);
  if (error) throw error;
  const months = new Set((data ?? []).map((r: { month: number }) => Number(r.month)));
  return Array.from(months).sort((a, b) => a - b);
}

/**
 * ledgerMappings — CRUD mapping conto bilancino → voce analitica CE.
 */

import { supabase } from '@/lib/supabase';
import { getCanonicalKey } from '@shared/domain/labelMapping';
import {
  BILANCINO_DISCOVERY_SOURCE,
  isIncompleteStubAnalitica,
  STUB_ANALITICA_PLACEHOLDER,
} from '@shared/etl/ledgerMappingStubs';
import type { ImportWarning } from '@/data/importBilancio';

const UNMAPPED_RE = /^Conto bilancino non mappato in ledger: (.+?) \((.+)\)$/;
const INCOMPLETE_RE = /^Mapping incompleto per conto (.+?) \((.+)\):/;

export interface LedgerMappingRow {
  id: string;
  companyId: string;
  accountCode: string;
  accountDescription: string | null;
  famiglia: string | null;
  analiticaLabel: string;
  masterAccountId: string | null;
  signMultiplier: number;
  sourceSheet: string;
  updatedAt: string | null;
}

export interface LedgerMappingInput {
  id?: string;
  companyId: string;
  accountCode: string;
  accountDescription?: string | null;
  famiglia?: string | null;
  analiticaLabel: string;
  masterAccountId?: string | null;
  signMultiplier?: number;
  sourceSheet?: string;
}

export interface MasterAccountOption {
  id: string;
  code: string;
  label: string;
  type: string | null;
}

export interface CompanyFamigliaOption {
  id: string;
  companyId: string;
  code: string;
  label: string;
  sortOrder: number;
}

function mapRow(r: Record<string, unknown>): LedgerMappingRow {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    accountCode: String(r.account_code),
    accountDescription: (r.account_description as string | null) ?? null,
    famiglia: (r.famiglia as string | null) ?? null,
    analiticaLabel: String(r.analitica_label),
    masterAccountId: (r.master_account_id as string | null) ?? null,
    signMultiplier: Number(r.sign_multiplier ?? 1),
    sourceSheet: String(r.source_sheet ?? 'manual'),
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export function parseUnmappedAccountWarnings(
  warnings: ImportWarning[],
): Array<{ accountCode: string; description: string }> {
  return warnings
    .filter((w) => w.severity === 'error' && UNMAPPED_RE.test(w.message))
    .map((w) => {
      const m = w.message.match(UNMAPPED_RE)!;
      return { accountCode: m[1], description: m[2] };
    });
}

export function parseIncompleteStubWarnings(
  warnings: ImportWarning[],
): Array<{ accountCode: string; description: string }> {
  return warnings
    .filter((w) => w.severity === 'error' && INCOMPLETE_RE.test(w.message))
    .map((w) => {
      const m = w.message.match(INCOMPLETE_RE)!;
      return { accountCode: m[1], description: m[2] };
    });
}

export function isIncompleteMapping(row: LedgerMappingRow): boolean {
  return isIncompleteStubAnalitica(row.analiticaLabel);
}

export { BILANCINO_DISCOVERY_SOURCE, STUB_ANALITICA_PLACEHOLDER };

export async function fetchCompanyFamiglie(companyId: string): Promise<CompanyFamigliaOption[]> {
  const { data, error } = await supabase
    .from('company_famiglie')
    .select('id, company_id, code, label, sort_order')
    .eq('company_id', companyId)
    .order('sort_order');

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    companyId: String(r.company_id),
    code: String(r.code),
    label: String(r.label),
    sortOrder: Number(r.sort_order ?? 0),
  }));
}

export async function fetchLedgerMappings(companyId: string): Promise<LedgerMappingRow[]> {
  const { data, error } = await supabase
    .from('ledger_account_mappings')
    .select(
      'id, company_id, account_code, account_description, famiglia, analitica_label, master_account_id, sign_multiplier, source_sheet, updated_at',
    )
    .eq('company_id', companyId)
    .order('account_code');

  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function fetchMasterAccounts(): Promise<MasterAccountOption[]> {
  const { data, error } = await supabase
    .from('master_chart_of_accounts')
    .select('id, code, label, type')
    .order('label');

  if (error) throw error;
  return (data ?? []).map((r: { id: string; code: string; label: string; type: string | null }) => ({
    id: r.id,
    code: r.code,
    label: r.label,
    type: r.type,
  }));
}

export async function fetchAnaliticaSuggestions(companyId: string): Promise<string[]> {
  const [{ data: am, error: amErr }, { data: mc, error: mcErr }] = await Promise.all([
    supabase.from('account_mappings').select('original_label').eq('company_id', companyId),
    supabase.from('master_chart_of_accounts').select('label'),
  ]);

  if (amErr) throw amErr;
  if (mcErr) throw mcErr;

  const labels = new Set<string>();
  for (const r of am ?? []) labels.add(String((r as { original_label: string }).original_label));
  for (const r of mc ?? []) labels.add(String((r as { label: string }).label));
  return Array.from(labels).sort((a, b) => a.localeCompare(b, 'it'));
}

export async function resolveMasterAccountId(
  companyId: string,
  analiticaLabel: string,
  masterAccounts: MasterAccountOption[],
): Promise<string | null> {
  const trimmed = analiticaLabel.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('account_mappings')
    .select('master_account_id')
    .eq('company_id', companyId)
    .eq('original_label', trimmed)
    .maybeSingle();

  if (error) throw error;
  if (data?.master_account_id) return String(data.master_account_id);

  const canonical = getCanonicalKey(trimmed);
  if (canonical) {
    const match = masterAccounts.find((m) => m.code === canonical);
    if (match) return match.id;
  }
  return null;
}

export async function upsertLedgerMapping(input: LedgerMappingInput): Promise<LedgerMappingRow> {
  const payload = {
    company_id: input.companyId,
    account_code: input.accountCode.trim(),
    account_description: input.accountDescription ?? null,
    famiglia: input.famiglia ?? null,
    analitica_label: input.analiticaLabel.trim(),
    master_account_id: input.masterAccountId ?? null,
    sign_multiplier: input.signMultiplier ?? 1,
    source_sheet: input.sourceSheet ?? 'manual',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ledger_account_mappings')
    .upsert(payload, { onConflict: 'company_id,account_code' })
    .select(
      'id, company_id, account_code, account_description, famiglia, analitica_label, master_account_id, sign_multiplier, source_sheet, updated_at',
    )
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function deleteLedgerMapping(id: string): Promise<void> {
  const { error } = await supabase.from('ledger_account_mappings').delete().eq('id', id);
  if (error) throw error;
}

export interface BulkLedgerMappingUpdate {
  row: LedgerMappingRow;
  famiglia: string | null;
  analiticaLabel: string;
}

export async function bulkCompleteLedgerMappings(
  companyId: string,
  updates: BulkLedgerMappingUpdate[],
  masterAccounts: MasterAccountOption[],
): Promise<number> {
  if (updates.length === 0) return 0;

  const now = new Date().toISOString();
  const payloads = await Promise.all(
    updates.map(async (u) => {
      const analitica = u.analiticaLabel.trim();
      const masterId = analitica
        ? await resolveMasterAccountId(companyId, analitica, masterAccounts)
        : null;
      return {
        company_id: companyId,
        account_code: u.row.accountCode,
        account_description: u.row.accountDescription,
        famiglia: u.famiglia?.trim() || null,
        analitica_label: analitica,
        master_account_id: masterId,
        sign_multiplier: u.row.signMultiplier,
        source_sheet: 'manual',
        updated_at: now,
      };
    }),
  );

  const { error } = await supabase
    .from('ledger_account_mappings')
    .upsert(payloads, { onConflict: 'company_id,account_code' });

  if (error) throw error;
  return updates.length;
}

/**
 * publishedSnapshots — versioni pubblicate e rollback periodo (Sprint 7).
 */

import { supabase } from '@/lib/supabase';

export interface PublishedSnapshot {
  id: string;
  companyId: string;
  periodYear: number;
  periodMonth: number;
  version: number;
  publishedBy: string | null;
  publishedAt: string;
  importId: string | null;
  draftEditId: string | null;
  factsHash: string;
}

function mapSnapshotRow(row: Record<string, unknown>): PublishedSnapshot {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    periodYear: Number(row.period_year),
    periodMonth: Number(row.period_month),
    version: Number(row.version),
    publishedBy: row.published_by == null ? null : String(row.published_by),
    publishedAt: String(row.published_at),
    importId: row.import_id == null ? null : String(row.import_id),
    draftEditId: row.draft_edit_id == null ? null : String(row.draft_edit_id),
    factsHash: String(row.facts_hash),
  };
}

/** Elenco snapshot per periodo, dal più recente. */
export async function fetchPublishedSnapshots(
  companyId: string,
  year: number,
  month: number,
): Promise<PublishedSnapshot[]> {
  const { data, error } = await supabase
    .from('published_snapshots')
    .select('id, company_id, period_year, period_month, version, published_by, published_at, import_id, draft_edit_id, facts_hash')
    .eq('company_id', companyId)
    .eq('period_year', year)
    .eq('period_month', month)
    .order('version', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapSnapshotRow(row as Record<string, unknown>));
}

export interface RollbackPeriodResult {
  snapshot_id: string;
  version: number;
  facts_restored: number;
  layout_restored: number;
}

async function extractError(error: unknown): Promise<string> {
  const anyErr = error as { message?: string; context?: Response };
  try {
    const res = anyErr?.context;
    if (res && typeof res.json === 'function') {
      const body = await res.clone().json();
      if (body?.error) return String(body.error);
    }
  } catch {
    // ignore
  }
  return anyErr?.message ?? 'Errore sconosciuto.';
}

/** Ripristina financial_facts + report_layout da snapshot pubblicato. */
export async function rollbackToSnapshot(snapshotId: string): Promise<RollbackPeriodResult> {
  const { data, error } = await supabase.functions.invoke('rollback-period', {
    body: { snapshot_id: snapshotId },
  });

  if (error) throw new Error(await extractError(error));
  if (data?.error) throw new Error(String(data.error));
  return data as RollbackPeriodResult;
}

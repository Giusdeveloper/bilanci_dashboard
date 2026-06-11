/**
 * auditLog — lettura registro audit (admin / amministrazione).
 */

import { supabase } from '@/lib/supabase';

export interface AuditLogEntry {
  id: string;
  companyId: string | null;
  companyName: string | null;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  /** Anno periodo estratto da payload, se presente. */
  periodYear: number | null;
  /** Mese periodo estratto da payload, se presente. */
  periodMonth: number | null;
}

export interface AuditLogFilters {
  companyId?: string;
  action?: string;
  actorId?: string;
  periodYear?: number;
  periodMonth?: number;
  limit?: number;
}

function mapAuditRow(
  row: Record<string, unknown>,
  companyNameById: Map<string, string>,
  emailByUserId: Map<string, string>,
): AuditLogEntry {
  const payload = (row.payload as Record<string, unknown>) ?? {};
  const companyId = row.company_id == null ? null : String(row.company_id);
  const actorId = row.actor_id == null ? null : String(row.actor_id);
  const yearRaw = payload.year ?? payload.period_year;
  const monthRaw = payload.month ?? payload.period_month;

  return {
    id: String(row.id),
    companyId,
    companyName: companyId ? companyNameById.get(companyId) ?? null : null,
    actorId,
    actorEmail: actorId ? emailByUserId.get(actorId) ?? null : null,
    action: String(row.action),
    entityType: row.entity_type == null ? null : String(row.entity_type),
    entityId: row.entity_id == null ? null : String(row.entity_id),
    payload,
    createdAt: String(row.created_at),
    periodYear: yearRaw == null ? null : Number(yearRaw),
    periodMonth: monthRaw == null ? null : Number(monthRaw),
  };
}

/** Elenco voci audit con filtri lato client (payload periodo). */
export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('id, company_id, actor_id, action, entity_type, entity_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const companyIds = Array.from(new Set(rows.map((r) => r.company_id).filter(Boolean))) as string[];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];

  const [companiesRes, usersRes] = await Promise.all([
    companyIds.length
      ? supabase.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    actorIds.length
      ? supabase.from('bilanci_users').select('id, email').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (usersRes.error) throw usersRes.error;

  const companyNameById = new Map(
    (companiesRes.data ?? []).map((c) => [String(c.id), String(c.name)]),
  );
  const emailByUserId = new Map(
    (usersRes.data ?? []).map((u) => [String(u.id), String(u.email ?? '')]),
  );

  let entries = rows.map((row) => mapAuditRow(row, companyNameById, emailByUserId));

  if (filters.periodYear != null) {
    entries = entries.filter((e) => e.periodYear === filters.periodYear);
  }
  if (filters.periodMonth != null) {
    entries = entries.filter((e) => e.periodMonth === filters.periodMonth);
  }

  return entries;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  period_publish_facts: 'Pubblicazione periodo',
  edit_publish: 'Publish bozza',
  import_bilancio: 'Import bilancio',
  import_partitari: 'Import partitario',
  mapping_update: 'Aggiornamento mapping',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

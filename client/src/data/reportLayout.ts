/**
 * reportLayout — lettura righe report_layout per editor layout_override.
 */

import { supabase } from '@/lib/supabase';
import type { PublishedLayoutRow } from '@shared/etl/draftChanges';

const REPORT_TYPE_CE_DETTAGLIO = 'ce_dettaglio';

export async function fetchReportLayoutRows(
  companyId: string,
  year: number,
  reportType: string = REPORT_TYPE_CE_DETTAGLIO,
): Promise<PublishedLayoutRow[]> {
  const { data, error } = await supabase
    .from('report_layout')
    .select('row_index, report_type, year, original_label, display_label, is_hidden')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('report_type', reportType)
    .order('row_index', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    rowIndex: Number(row.row_index),
    reportType: String(row.report_type),
    year: Number(row.year),
    originalLabel: String(row.original_label),
    displayLabel: row.display_label == null ? null : String(row.display_label),
    isHidden: row.is_hidden === true,
  }));
}

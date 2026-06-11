/**
 * supabaseLoader — caricatore lato Edge Function (Deno) basato su supabase-js.
 *
 * E' l'equivalente Deno di `scripts/lib/bilanciLoader.ts` (che usa `pg`):
 * stessa semantica di load idempotente, ma tramite il client supabase-js con
 * service_role. Consuma il LoadPlan prodotto dal CORE condiviso in `shared/etl`.
 */

// deno-lint-ignore-file no-explicit-any
import type { Fact, LayoutRow, LoadPlan, ExplicitMapping, Warning, WorkbookData } from '../../../shared/etl/index.ts';
import {
  buildLedgerMappingStubs,
  toStubUpsertRows,
  type LedgerMappingStub,
} from '../../../shared/etl/ledgerMappingStubs.ts';
import { extractSourceMapping } from '../../../shared/etl/seed/extractSourceMapping.ts';
import { resolveMasterAccountId } from '../../../shared/etl/seed/ledgerMappingResolve.ts';
import { findSheetName, getSheet } from '../../../shared/etl/workbook.ts';

export interface BilancinoLedgerMapping {
  accountCode: string;
  analiticaLabel: string;
  signMultiplier: number;
  sourceSheet?: string;
}

export interface BilancinoBalanceRow {
  accountCode: string;
  accountDescription?: string | null;
  section?: 'CE' | 'SP';
  accountSide?: 'costi' | 'ricavi' | null;
  year: number;
  month: number;
  balanceRaw: number;
  balanceNormalized: number;
}

export interface BilancinoPersistInput {
  companyId: string;
  sourceFilename: string;
  fileHash: string;
  templateProfile: string;
  warnings: Warning[];
  balances: BilancinoBalanceRow[];
}

export interface BilancinoPersistCounts {
  importId: string;
  accountBalances: number;
  warnings: number;
  facts?: number;
  layout?: number;
}

export interface FinancialFactRow {
  categoryCode: string;
  year: number;
  month: number | null;
  amountProgressive: number;
}

export async function loadCodeMap(supabase: any): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('master_chart_of_accounts').select('id, code');
  if (error) throw error;
  const map = new Map<string, string>();
  for (const r of data ?? []) map.set(r.code, r.id);
  return map;
}

export async function loadCompanyMappings(supabase: any, companyId: string): Promise<ExplicitMapping[]> {
  const { data, error } = await supabase
    .from('account_mappings')
    .select('original_label, sign_multiplier, master_chart_of_accounts(code)')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    originalLabel: r.original_label,
    categoryCode: r.master_chart_of_accounts?.code,
    sign: r.sign_multiplier ? Number(r.sign_multiplier) : 1,
  })).filter((m: ExplicitMapping) => !!m.categoryCode);
}

export async function resolveCompanyId(supabase: any, opts: { companyId?: string; slug?: string }): Promise<string | null> {
  if (opts.companyId) return opts.companyId;
  if (!opts.slug) return null;
  const { data, error } = await supabase.from('companies').select('id').eq('slug', opts.slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export interface PersistCounts {
  importId: string;
  facts: number;
  warnings: number;
  layout: number;
}

/**
 * Persiste il piano in modo idempotente (upsert su chiave naturale).
 * supabase-js non offre transazioni multi-statement: si esegue una sequenza di
 * upsert/delete; la chiave naturale garantisce comunque il re-import sicuro.
 */
export async function persistPlan(
  supabase: any,
  plan: LoadPlan,
  codeMap: Map<string, string>,
): Promise<PersistCounts> {
  // imports (upsert su file_hash)
  const { data: imp, error: impErr } = await supabase
    .from('imports')
    .upsert(
      {
        company_id: plan.importMeta.companyId,
        source_filename: plan.importMeta.sourceFilename,
        file_hash: plan.importMeta.fileHash,
        template_profile: plan.importMeta.templateProfile,
        status: plan.importMeta.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'file_hash' },
    )
    .select('id')
    .single();
  if (impErr) throw impErr;
  const importId = imp.id as string;

  // fiscal_periods
  if (plan.periods.length > 0) {
    const { error } = await supabase.from('fiscal_periods').upsert(
      plan.periods.map((p) => ({ company_id: p.companyId, year: p.year, month: p.month, label: p.label })),
      { onConflict: 'company_id,year,month' },
    );
    if (error) throw error;
  }

  // financial_facts
  const factRows = plan.facts
    .map((f) => {
      const categoryId = codeMap.get(f.categoryCode);
      if (!categoryId) return null;
      return {
        company_id: plan.importMeta.companyId,
        category_id: categoryId,
        year: f.year,
        month: f.month,
        amount_progressive: f.amountProgressive,
        amount_period: f.amountPeriod,
        source_label: f.sourceLabel,
        import_id: importId,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);
  if (factRows.length > 0) {
    const { error } = await supabase
      .from('financial_facts')
      .upsert(factRows, { onConflict: 'company_id,category_id,year,month' });
    if (error) throw error;
  }

  // report_layout: delete + insert per (company, report_type, year)
  const layoutKeys = new Set(plan.layout.map((l) => `${l.companyId}|${l.reportType}|${l.year}`));
  for (const key of layoutKeys) {
    const [companyId, reportType, year] = key.split('|');
    const { error } = await supabase
      .from('report_layout')
      .delete()
      .eq('company_id', companyId)
      .eq('report_type', reportType)
      .eq('year', Number(year));
    if (error) throw error;
  }
  if (plan.layout.length > 0) {
    const { error } = await supabase.from('report_layout').insert(
      plan.layout.map((l) => ({
        company_id: l.companyId,
        import_id: importId,
        report_type: l.reportType,
        year: l.year,
        profile: plan.importMeta.templateProfile,
        row_index: l.rowIndex,
        original_label: l.originalLabel,
        indent_level: l.indentLevel,
        row_kind: l.rowKind,
        master_account_id: l.canonicalKey ? codeMap.get(l.canonicalKey) ?? null : null,
        is_mapped: l.isMapped,
        amount_progressive: l.amountProgressive,
      })),
    );
    if (error) throw error;
  }

  // import_warnings: delete + insert
  await supabase.from('import_warnings').delete().eq('import_id', importId);
  if (plan.warnings.length > 0) {
    const { error } = await supabase.from('import_warnings').insert(
      plan.warnings.map((w) => ({ import_id: importId, severity: w.severity, message: w.message })),
    );
    if (error) throw error;
  }

  return { importId, facts: factRows.length, warnings: plan.warnings.length, layout: plan.layout.length };
}

export async function loadAccountBalances(
  supabase: any,
  companyId: string,
  year: number,
  month: number,
): Promise<BilancinoBalanceRow[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('account_code, account_description, section, account_side, year, month, balance_raw, balance_normalized')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month)
    .order('account_code');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    accountCode: r.account_code,
    accountDescription: r.account_description,
    section: (r.section ?? 'CE') as 'CE' | 'SP',
    accountSide: r.account_side as 'costi' | 'ricavi' | null,
    year: Number(r.year),
    month: Number(r.month),
    balanceRaw: Number(r.balance_raw),
    balanceNormalized: Number(r.balance_normalized),
  }));
}

export async function loadLedgerMappings(supabase: any, companyId: string): Promise<BilancinoLedgerMapping[]> {
  const { data, error } = await supabase
    .from('ledger_account_mappings')
    .select('account_code, analitica_label, famiglia, sign_multiplier, source_sheet')
    .eq('company_id', companyId)
    .order('account_code');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    accountCode: r.account_code,
    analiticaLabel: r.analitica_label,
    famiglia: r.famiglia ?? null,
    signMultiplier: Number(r.sign_multiplier),
    sourceSheet: r.source_sheet ?? undefined,
  }));
}

export async function loadCompanyCeProfile(supabase: any, companyId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('ce_profile, slug')
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw error;
  return (data?.ce_profile as string | null) ?? (data?.slug as string | null) ?? null;
}

/** Upsert stub discovery per conti CE non ancora mappati (non sovrascrive mapping completi). */
export async function upsertLedgerMappingStubs(
  supabase: any,
  companyId: string,
  stubs: LedgerMappingStub[],
): Promise<number> {
  if (stubs.length === 0) return 0;

  const rows = toStubUpsertRows(companyId, stubs);
  const { error } = await supabase
    .from('ledger_account_mappings')
    .upsert(rows, { onConflict: 'company_id,account_code', ignoreDuplicates: false });
  if (error) throw error;
  return stubs.length;
}

export { buildLedgerMappingStubs, type LedgerMappingStub };

export async function loadFinancialFacts(
  supabase: any,
  companyId: string,
  year: number,
  month?: number,
): Promise<FinancialFactRow[]> {
  let query = supabase
    .from('financial_facts')
    .select('year, month, amount_progressive, master_chart_of_accounts(code)')
    .eq('company_id', companyId)
    .eq('year', year);
  if (month != null) query = query.eq('month', month);
  const { data, error } = await query.order('month', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    categoryCode: r.master_chart_of_accounts?.code as string,
    year: Number(r.year),
    month: r.month == null ? null : Number(r.month),
    amountProgressive: Number(r.amount_progressive),
  })).filter((r: FinancialFactRow) => !!r.categoryCode);
}

/**
 * Persiste import bilancino: imports + account_balances + import_warnings.
 * Non scrive financial_facts (decisione PoC).
 */
export async function persistBilancinoPlan(
  supabase: any,
  input: BilancinoPersistInput,
): Promise<BilancinoPersistCounts> {
  const { data: imp, error: impErr } = await supabase
    .from('imports')
    .upsert(
      {
        company_id: input.companyId,
        source_filename: input.sourceFilename,
        file_hash: input.fileHash,
        template_profile: input.templateProfile,
        status: 'completed',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'file_hash' },
    )
    .select('id')
    .single();
  if (impErr) throw impErr;
  const importId = imp.id as string;

  if (input.balances.length > 0) {
    const rows = input.balances.map((b) => ({
      company_id: input.companyId,
      import_id: importId,
      account_code: b.accountCode,
      account_description: b.accountDescription ?? null,
      section: b.section ?? 'CE',
      account_side: b.accountSide ?? null,
      year: b.year,
      month: b.month,
      balance_raw: b.balanceRaw,
      balance_normalized: b.balanceNormalized,
    }));
    const { error } = await supabase
      .from('account_balances')
      .upsert(rows, { onConflict: 'company_id,account_code,year,month' });
    if (error) throw error;
  }

  await supabase.from('import_warnings').delete().eq('import_id', importId);
  if (input.warnings.length > 0) {
    const { error } = await supabase.from('import_warnings').insert(
      input.warnings.map((w) => ({ import_id: importId, severity: w.severity, message: w.message })),
    );
    if (error) throw error;
  }

  return { importId, accountBalances: input.balances.length, warnings: input.warnings.length };
}

/** True se esistono financial_facts per company/anno/mese (month=null = annuale). */
export async function hasExistingFacts(
  supabase: any,
  companyId: string,
  year: number,
  month: number | null,
): Promise<boolean> {
  let query = supabase
    .from('financial_facts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('year', year);
  if (month == null) query = query.is('month', null);
  else query = query.eq('month', month);
  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Scrive financial_facts + report_layout dal bilancino (mensile + YTD annuale). */
export async function persistBilancinoFacts(
  supabase: any,
  opts: {
    companyId: string;
    importId: string;
    year: number;
    facts: Fact[];
    layout?: LayoutRow[];
    referenceMonth: number;
    codeMap: Map<string, string>;
    replaceExisting: boolean;
  },
): Promise<{ facts: number; layout: number }> {
  const { companyId, importId, year, facts, layout = [], referenceMonth, codeMap, replaceExisting } = opts;
  const monthsToCheck = [referenceMonth, null] as Array<number | null>;

  for (const m of monthsToCheck) {
    const exists = await hasExistingFacts(supabase, companyId, year, m);
    if (exists && !replaceExisting) {
      const label = m == null ? 'annuali (YTD)' : `mese ${m}`;
      throw new Error(
        `Esistono già dati CE ${label} per questo periodo. Attiva "Sostituisci dati esistenti" per sovrascrivere.`,
      );
    }
  }

  const rows: Array<Record<string, unknown>> = [];
  if (facts.length === 0) return { facts: 0, layout: 0 };

  for (const f of facts) {
    const categoryId = codeMap.get(f.categoryCode);
    if (!categoryId) continue;
    rows.push({
      company_id: companyId,
      category_id: categoryId,
      year: f.year,
      month: f.month,
      amount_progressive: f.amountProgressive,
      amount_period: f.amountPeriod,
      source_label: f.sourceLabel,
      import_id: importId,
      updated_at: new Date().toISOString(),
    });
    rows.push({
      company_id: companyId,
      category_id: categoryId,
      year: f.year,
      month: null,
      amount_progressive: f.amountProgressive,
      amount_period: null,
      source_label: f.sourceLabel,
      import_id: importId,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from('financial_facts')
      .upsert(rows, { onConflict: 'company_id,category_id,year,month' });
    if (error) throw error;
  }

  const monthLabels = [
    '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  const periodRows = [
    {
      company_id: companyId,
      year,
      month: referenceMonth,
      label: `${monthLabels[referenceMonth] ?? referenceMonth} ${year}`,
    },
    {
      company_id: companyId,
      year,
      month: null,
      label: `Anno ${year}`,
    },
  ];
  const { error: periodErr } = await supabase
    .from('fiscal_periods')
    .upsert(periodRows, { onConflict: 'company_id,year,month' });
  if (periodErr) throw periodErr;

  let layoutCount = 0;
  if (layout.length > 0) {
    const { error: delErr } = await supabase
      .from('report_layout')
      .delete()
      .eq('company_id', companyId)
      .eq('report_type', 'ce_dettaglio')
      .eq('year', year);
    if (delErr) throw delErr;

    const layoutRows = layout
      .map((l) => {
        const masterId = l.canonicalKey ? codeMap.get(l.canonicalKey) ?? null : null;
        return {
          company_id: companyId,
          import_id: importId,
          report_type: l.reportType,
          year: l.year,
          profile: 'bilancino_studio',
          row_index: l.rowIndex,
          original_label: l.originalLabel,
          indent_level: l.indentLevel,
          row_kind: l.rowKind,
          master_account_id: masterId,
          is_mapped: l.isMapped,
          amount_progressive: l.amountProgressive,
        };
      });
    const { error: layErr } = await supabase.from('report_layout').insert(layoutRows);
    if (layErr) throw layErr;
    layoutCount = layoutRows.length;
  }

  return { facts: rows.length, layout: layoutCount };
}

/** Auto-upsert ledger_account_mappings dal foglio Source (se presente). */
export async function upsertLedgerMappingsFromWorkbook(
  supabase: any,
  companyId: string,
  wb: WorkbookData,
  importId?: string,
): Promise<number> {
  const sheetName = findSheetName(wb, /^source$/i);
  if (!sheetName) return 0;

  const sourceRows = extractSourceMapping(getSheet(wb, sheetName));
  if (sourceRows.length === 0) return 0;

  const { data: amData, error: amErr } = await supabase
    .from('account_mappings')
    .select('original_label, master_account_id')
    .eq('company_id', companyId);
  if (amErr) throw amErr;

  const labelMap = new Map<string, string>();
  for (const r of amData ?? []) labelMap.set(String(r.original_label).trim(), r.master_account_id);

  const codeMap = await loadCodeMap(supabase);
  const rows = sourceRows.map((row) => {
    const resolved = resolveMasterAccountId(row, labelMap, codeMap);
    return {
      company_id: companyId,
      account_code: resolved.row.accountCode,
      account_description: resolved.row.accountDescription || null,
      famiglia: resolved.row.famiglia || null,
      analitica_label: resolved.row.analiticaLabel,
      master_account_id: resolved.masterAccountId,
      sign_multiplier: resolved.signMultiplier,
      source_sheet: 'Source',
      source_import_id: importId ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from('ledger_account_mappings')
    .upsert(rows, { onConflict: 'company_id,account_code' });
  if (error) throw error;
  return rows.length;
}

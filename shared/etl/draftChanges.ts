/**
 * draftChanges — costruzione delta bozza da griglia editabile (puro, testabile).
 */

export type DraftChangeType = 'balance_update' | 'mapping_update' | 'manual_fact' | 'layout_override';

export interface DraftChangePayload {
  changeType: DraftChangeType;
  entityTable: string;
  entityKey: Record<string, unknown>;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface PublishedBalanceRow {
  accountCode: string;
  year: number;
  month: number;
  balanceNormalized: number;
}

/** Costruisce i change balance_update rispetto ai saldi published. */
export function buildBalanceUpdateChanges(
  published: PublishedBalanceRow[],
  edited: Map<string, number>,
  year: number,
  month: number,
): DraftChangePayload[] {
  const pubMap = new Map(published.map((p) => [p.accountCode, p]));
  const changes: DraftChangePayload[] = [];

  for (const [accountCode, newBalance] of Array.from(edited.entries())) {
    const oldRow = pubMap.get(accountCode);
    const oldBalance = oldRow?.balanceNormalized ?? 0;
    if (oldBalance === newBalance) continue;

    changes.push({
      changeType: 'balance_update',
      entityTable: 'account_balances',
      entityKey: { account_code: accountCode, year, month },
      fieldName: 'balance_normalized',
      oldValue: { balance_normalized: oldBalance },
      newValue: { balance_normalized: newBalance },
    });
  }

  return changes;
}

export interface DraftMappingChange {
  accountCode: string;
  analiticaLabel: string;
  signMultiplier: number;
  famiglia?: string | null;
  sourceSheet?: string;
}

/** Merge mapping_update bozza su mapping ledger base (in memoria). */
export function mergeMappingChanges<T extends {
  accountCode: string;
  analiticaLabel: string;
  signMultiplier: number;
  famiglia?: string | null;
  sourceSheet?: string;
}>(base: T[], changes: DraftMappingChange[]): T[] {
  const byCode = new Map(base.map((m) => [m.accountCode, { ...m }]));
  for (const ch of changes) {
    const existing = byCode.get(ch.accountCode);
    if (existing) {
      existing.analiticaLabel = ch.analiticaLabel;
      existing.signMultiplier = ch.signMultiplier;
      if (ch.famiglia !== undefined) existing.famiglia = ch.famiglia;
      if (ch.sourceSheet) existing.sourceSheet = ch.sourceSheet;
    } else {
      byCode.set(ch.accountCode, {
        accountCode: ch.accountCode,
        analiticaLabel: ch.analiticaLabel,
        signMultiplier: ch.signMultiplier,
        famiglia: ch.famiglia ?? null,
        sourceSheet: ch.sourceSheet,
      } as T);
    }
  }
  return Array.from(byCode.values());
}

export interface PublishedMappingRow {
  accountCode: string;
  accountDescription?: string | null;
  famiglia?: string | null;
  analiticaLabel: string;
  masterAccountId?: string | null;
  signMultiplier: number;
  sourceSheet?: string;
}

function mappingSnapshot(row: PublishedMappingRow): Record<string, unknown> {
  return {
    account_description: row.accountDescription ?? null,
    famiglia: row.famiglia ?? null,
    analitica_label: row.analiticaLabel,
    master_account_id: row.masterAccountId ?? null,
    sign_multiplier: row.signMultiplier,
    source_sheet: row.sourceSheet ?? 'Editor',
  };
}

function mappingFieldsEqual(a: PublishedMappingRow, b: PublishedMappingRow): boolean {
  return (
    a.analiticaLabel === b.analiticaLabel
    && a.signMultiplier === b.signMultiplier
    && (a.famiglia ?? null) === (b.famiglia ?? null)
    && (a.masterAccountId ?? null) === (b.masterAccountId ?? null)
    && (a.accountDescription ?? null) === (b.accountDescription ?? null)
    && (a.sourceSheet ?? 'Editor') === (b.sourceSheet ?? 'Editor')
  );
}

/** Costruisce i change mapping_update rispetto ai mapping published. */
export function buildMappingUpdateChanges(
  published: PublishedMappingRow[],
  edited: Map<string, PublishedMappingRow>,
): DraftChangePayload[] {
  const pubMap = new Map(published.map((p) => [p.accountCode, p]));
  const changes: DraftChangePayload[] = [];

  for (const [accountCode, newRow] of Array.from(edited.entries())) {
    const oldRow = pubMap.get(accountCode);
    if (oldRow && mappingFieldsEqual(oldRow, newRow)) continue;

    changes.push({
      changeType: 'mapping_update',
      entityTable: 'ledger_account_mappings',
      entityKey: { account_code: accountCode },
      fieldName: 'mapping',
      oldValue: oldRow ? mappingSnapshot(oldRow) : null,
      newValue: mappingSnapshot(newRow),
    });
  }

  return changes;
}

/** Parse change mapping_update da draft_edit_changes (subset campi pipeline). */
export function parseDraftMappingChanges(
  rows: Array<{ entity_key: Record<string, unknown>; new_value: Record<string, unknown> }>,
): DraftMappingChange[] {
  const changes: DraftMappingChange[] = [];
  for (const row of rows) {
    const accountCode = String(row.entity_key?.account_code ?? '');
    if (!accountCode) continue;
    const nv = row.new_value ?? {};
    changes.push({
      accountCode,
      analiticaLabel: String(nv.analitica_label ?? nv.analiticaLabel ?? 'Non mappato'),
      signMultiplier: Number(nv.sign_multiplier ?? nv.signMultiplier ?? 1),
      famiglia: nv.famiglia == null ? null : String(nv.famiglia),
      sourceSheet: nv.source_sheet == null ? undefined : String(nv.source_sheet),
    });
  }
  return changes;
}

/** Applica i change balance_update su una mappa saldi (per test publish logic). */
export function applyBalanceChangesToMap(
  base: Map<string, number>,
  changes: DraftChangePayload[],
): Map<string, number> {
  const result = new Map(base);
  for (const c of changes) {
    if (c.changeType !== 'balance_update') continue;
    const code = String(c.entityKey.account_code ?? '');
    const val = (c.newValue as { balance_normalized?: number })?.balance_normalized;
    if (!code || val == null) continue;
    result.set(code, val);
  }
  return result;
}

export interface ManualFactOverride {
  categoryCode: string;
  year: number;
  month: number;
  amountProgressive: number;
  motivazione: string;
}

function manualFactKey(categoryCode: string, year: number, month: number): string {
  return `${categoryCode}|${year}|${month}`;
}

/** Costruisce un change manual_fact per override CE mirato. */
export function buildManualFactChange(
  categoryCode: string,
  year: number,
  month: number,
  oldAmount: number | null,
  newAmount: number,
  motivazione: string,
): DraftChangePayload {
  return {
    changeType: 'manual_fact',
    entityTable: 'financial_facts',
    entityKey: { category_code: categoryCode, year, month },
    fieldName: 'amount_progressive',
    oldValue: oldAmount == null
      ? null
      : { amount_progressive: oldAmount, motivazione: null },
    newValue: { amount_progressive: newAmount, motivazione: motivazione.trim() },
  };
}

/** Parse change manual_fact da draft_edit_changes. */
export function parseDraftManualFactChanges(
  rows: Array<{ entity_key: Record<string, unknown>; new_value: Record<string, unknown>; old_value?: unknown }>,
): ManualFactOverride[] {
  const overrides: ManualFactOverride[] = [];
  for (const row of rows) {
    const categoryCode = String(row.entity_key?.category_code ?? '');
    const year = Number(row.entity_key?.year);
    const month = Number(row.entity_key?.month);
    if (!categoryCode || !Number.isFinite(year) || !Number.isFinite(month)) continue;
    const nv = row.new_value ?? {};
    const amount = nv.amount_progressive ?? nv.amountProgressive;
    if (amount == null) continue;
    overrides.push({
      categoryCode,
      year,
      month,
      amountProgressive: Number(amount),
      motivazione: String(nv.motivazione ?? nv.reason ?? ''),
    });
  }
  return overrides;
}

/** Applica override manual_fact sui facts calcolati dalla pipeline. */
export function applyManualFactOverrides<T extends {
  categoryCode: string;
  year: number;
  month: number | null;
  amountProgressive: number;
  amountPeriod?: number | null;
  sourceLabel?: string;
}>(
  facts: T[],
  overrides: ManualFactOverride[],
): T[] {
  if (overrides.length === 0) return facts;
  const byKey = new Map(overrides.map((o) => [manualFactKey(o.categoryCode, o.year, o.month), o]));
  const result = facts.map((f) => {
    if (f.month == null) return f;
    const override = byKey.get(manualFactKey(f.categoryCode, f.year, f.month));
    if (!override) return f;
    return {
      ...f,
      amountProgressive: override.amountProgressive,
      sourceLabel: override.motivazione
        ? `Override: ${override.motivazione}`
        : (f.sourceLabel ?? 'Override manuale'),
    };
  });

  for (const o of overrides) {
    const exists = result.some(
      (f) => f.categoryCode === o.categoryCode && f.year === o.year && f.month === o.month,
    );
    if (!exists) {
      result.push({
        categoryCode: o.categoryCode,
        year: o.year,
        month: o.month,
        amountProgressive: o.amountProgressive,
        amountPeriod: null,
        sourceLabel: o.motivazione ? `Override: ${o.motivazione}` : 'Override manuale',
      } as T);
    }
  }

  return result;
}

export interface PublishedLayoutRow {
  rowIndex: number;
  reportType: string;
  year: number;
  originalLabel: string;
  displayLabel?: string | null;
  isHidden?: boolean;
}

export interface LayoutOverrideInput {
  rowIndex: number;
  reportType: string;
  year: number;
  displayLabel?: string | null;
  isHidden?: boolean;
}

function layoutPresentationSnapshot(row: PublishedLayoutRow): Record<string, unknown> {
  return {
    display_label: row.displayLabel ?? null,
    is_hidden: row.isHidden ?? false,
    original_label: row.originalLabel,
  };
}

function layoutPresentationEqual(a: PublishedLayoutRow, b: LayoutOverrideInput): boolean {
  const pubDisplay = a.displayLabel ?? null;
  const pubHidden = a.isHidden ?? false;
  const newDisplay = b.displayLabel ?? null;
  const newHidden = b.isHidden ?? false;
  return pubDisplay === newDisplay && pubHidden === newHidden;
}

export function layoutRowKey(reportType: string, year: number, rowIndex: number): string {
  return `${reportType}|${year}|${rowIndex}`;
}

/** Costruisce change layout_override rispetto al layout published. */
export function buildLayoutOverrideChanges(
  published: PublishedLayoutRow[],
  edited: Map<string, LayoutOverrideInput>,
): DraftChangePayload[] {
  const pubMap = new Map(published.map((p) => [layoutRowKey(p.reportType, p.year, p.rowIndex), p]));
  const changes: DraftChangePayload[] = [];

  for (const [, newRow] of Array.from(edited.entries())) {
    const key = layoutRowKey(newRow.reportType, newRow.year, newRow.rowIndex);
    const oldRow = pubMap.get(key);
    if (!oldRow) continue;
    if (layoutPresentationEqual(oldRow, newRow)) continue;

    changes.push({
      changeType: 'layout_override',
      entityTable: 'report_layout',
      entityKey: {
        row_index: newRow.rowIndex,
        report_type: newRow.reportType,
        year: newRow.year,
      },
      fieldName: 'presentation',
      oldValue: layoutPresentationSnapshot(oldRow),
      newValue: {
        display_label: newRow.displayLabel ?? null,
        is_hidden: newRow.isHidden ?? false,
        original_label: oldRow.originalLabel,
      },
    });
  }

  return changes;
}

/** Parse change layout_override da draft_edit_changes. */
export function parseDraftLayoutChanges(
  rows: Array<{ entity_key: Record<string, unknown>; new_value: Record<string, unknown> }>,
): LayoutOverrideInput[] {
  const overrides: LayoutOverrideInput[] = [];
  for (const row of rows) {
    const rowIndex = Number(row.entity_key?.row_index);
    const reportType = String(row.entity_key?.report_type ?? 'ce_dettaglio');
    const year = Number(row.entity_key?.year);
    if (!Number.isFinite(rowIndex) || !Number.isFinite(year)) continue;
    const nv = row.new_value ?? {};
    overrides.push({
      rowIndex,
      reportType,
      year,
      displayLabel: nv.display_label == null ? null : String(nv.display_label),
      isHidden: nv.is_hidden === true,
    });
  }
  return overrides;
}

/** Applica override presentazione su righe layout (in memoria). */
export function applyLayoutOverrides<T extends {
  rowIndex: number;
  reportType?: string;
  year?: number;
  originalLabel: string;
  displayLabel?: string | null;
  isHidden?: boolean;
}>(
  rows: T[],
  overrides: LayoutOverrideInput[],
  defaultReportType = 'ce_dettaglio',
): T[] {
  if (overrides.length === 0) return rows;
  const byKey = new Map(
    overrides.map((o) => [layoutRowKey(o.reportType, o.year, o.rowIndex), o]),
  );
  return rows.map((row) => {
    const reportType = row.reportType ?? defaultReportType;
    const year = row.year ?? overrides[0]?.year ?? 0;
    const override = byKey.get(layoutRowKey(reportType, year, row.rowIndex));
    if (!override) return row;
    return {
      ...row,
      displayLabel: override.displayLabel ?? null,
      isHidden: override.isHidden ?? false,
    };
  });
}

/** Etichetta effettiva per UI (display_label o original_label). */
export function effectiveLayoutLabel(row: {
  originalLabel: string;
  displayLabel?: string | null;
}): string {
  const custom = row.displayLabel?.trim();
  return custom && custom.length > 0 ? custom : row.originalLabel;
}

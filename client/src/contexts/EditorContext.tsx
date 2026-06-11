/**
 * EditorContext — stato condiviso editor periodo (Sprint 4–5).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchLedgerBalances,
  fetchLedgerMonths,
  fetchLedgerYears,
  type LedgerBalanceRow,
} from '@/data/ledgerReads';
import {
  fetchLedgerMappings,
  type LedgerMappingRow,
} from '@/data/ledgerMappings';
import {
  buildBalanceChangesFromGrid,
  buildMappingChangesFromGrid,
  buildManualFactChangesFromOverrides,
  createDraft,
  fetchDraftChanges,
  fetchDrafts,
  fetchOpenDraftForPeriod,
  fetchPeriodLockWarnings,
  publishPeriod,
  recalculatePreview,
  saveDraftChanges,
  type DraftEdit,
  type DraftMappingChangeInput,
  type EditedMappingRow,
  type ManualFactOverride,
  type PeriodLockWarning,
  type RecalculatePreviewResult,
} from '@/data/draftEdits';
import { parseDraftMappingChanges, parseDraftManualFactChanges } from '@shared/etl/draftChanges';

export const EDITOR_MONTH_LABELS = [
  '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function toEditedMappingRow(row: LedgerMappingRow): EditedMappingRow {
  return {
    accountCode: row.accountCode,
    accountDescription: row.accountDescription,
    famiglia: row.famiglia,
    analiticaLabel: row.analiticaLabel,
    masterAccountId: row.masterAccountId,
    signMultiplier: row.signMultiplier,
    sourceSheet: row.sourceSheet,
  };
}

export interface EditorContextValue {
  companyName: string;
  years: number[];
  months: number[];
  year: number | null;
  month: number | null;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  publishedRows: LedgerBalanceRow[];
  editedBalances: Map<string, number>;
  setEditedBalance: (accountCode: string, value: number) => void;
  publishedMappings: LedgerMappingRow[];
  editedMappings: Map<string, EditedMappingRow>;
  setEditedMapping: (row: EditedMappingRow) => void;
  editedManualFacts: Map<string, ManualFactOverride>;
  setManualFactOverride: (override: ManualFactOverride, publishedAmount?: number | null) => void;
  clearManualFactOverride: (categoryCode: string) => void;
  activeDraft: DraftEdit | null;
  recentDrafts: DraftEdit[];
  periodLockWarnings: PeriodLockWarning[];
  preview: RecalculatePreviewResult | null;
  hasPeriodBalances: boolean;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  recalculating: boolean;
  modifiedCount: number;
  mappingModifiedCount: number;
  manualFactModifiedCount: number;
  totalModifiedCount: number;
  handleRecalculate: () => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handlePublishPeriod: () => Promise<void>;
  loadDraftFromList: (draft: DraftEdit) => void;
  reloadPeriod: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const { selectedCompany } = useFinancialData();
  const { toast } = useToast();

  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [publishedRows, setPublishedRows] = useState<LedgerBalanceRow[]>([]);
  const [editedBalances, setEditedBalances] = useState<Map<string, number>>(new Map());
  const [publishedMappings, setPublishedMappings] = useState<LedgerMappingRow[]>([]);
  const [editedMappings, setEditedMappings] = useState<Map<string, EditedMappingRow>>(new Map());
  const [editedManualFacts, setEditedManualFacts] = useState<Map<string, ManualFactOverride>>(new Map());
  const [publishedManualAmounts, setPublishedManualAmounts] = useState<Map<string, number | null>>(new Map());
  const [activeDraft, setActiveDraft] = useState<DraftEdit | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<DraftEdit[]>([]);
  const [periodLockWarnings, setPeriodLockWarnings] = useState<PeriodLockWarning[]>([]);
  const [preview, setPreview] = useState<RecalculatePreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const loadRecentDrafts = useCallback(async () => {
    if (!selectedCompany) return;
    const drafts = await fetchDrafts(selectedCompany.id);
    setRecentDrafts(drafts);
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    fetchLedgerYears(selectedCompany.id).then((y) => {
      setYears(y);
      setYear(y[0] ?? null);
    });
    loadRecentDrafts().catch(() => {});
  }, [selectedCompany, loadRecentDrafts]);

  useEffect(() => {
    if (!selectedCompany || year == null) return;
    fetchLedgerMonths(selectedCompany.id, year).then((m) => {
      setMonths(m);
      setMonth(m[m.length - 1] ?? null);
    });
  }, [selectedCompany, year]);

  const toDraftMappingChangeInputs = useCallback(
    (published: LedgerMappingRow[], edited: Map<string, EditedMappingRow>): DraftMappingChangeInput[] => {
      const changes = buildMappingChangesFromGrid(published.map(toEditedMappingRow), edited);
      return changes.map((c) => {
        const nv = (c.newValue ?? {}) as Record<string, unknown>;
        return {
          accountCode: String(c.entityKey.account_code ?? ''),
          analiticaLabel: String(nv.analitica_label ?? ''),
          signMultiplier: Number(nv.sign_multiplier ?? 1),
          famiglia: nv.famiglia == null ? null : String(nv.famiglia),
          accountDescription: nv.account_description == null ? null : String(nv.account_description),
          masterAccountId: nv.master_account_id == null ? null : String(nv.master_account_id),
          sourceSheet: nv.source_sheet == null ? 'Editor' : String(nv.source_sheet),
        };
      });
    },
    [],
  );

  const runRecalculatePreview = useCallback(async (
    opts: {
      companyId: string;
      year: number;
      month: number;
      rows: LedgerBalanceRow[];
      mappings: LedgerMappingRow[];
      balanceMap: Map<string, number>;
      mappingMap: Map<string, EditedMappingRow>;
      manualFactOverrides?: ManualFactOverride[];
      draftEditId?: string;
      silent?: boolean;
    },
  ): Promise<RecalculatePreviewResult | null> => {
    if (opts.rows.length === 0) return null;
    try {
      const balanceChanges = Array.from(opts.balanceMap.entries())
        .filter(([code, val]) => {
          const pub = opts.rows.find((r) => r.accountCode === code);
          return pub == null || pub.balanceNormalized !== val;
        })
        .map(([accountCode, balanceNormalized]) => ({
          accountCode,
          year: opts.year,
          month: opts.month,
          balanceNormalized,
        }));
      const mappingChanges = toDraftMappingChangeInputs(opts.mappings, opts.mappingMap);
      const result = await recalculatePreview({
        companyId: opts.companyId,
        year: opts.year,
        month: opts.month,
        balanceChanges,
        mappingChanges,
        manualFactOverrides: opts.manualFactOverrides ?? [],
        draftEditId: opts.draftEditId,
      });
      setPreview(result);
      if (!opts.silent) {
        toast({ title: 'Anteprima aggiornata', description: `${result.counts.facts} voci ricalcolate.` });
      }
      return result;
    } catch (err) {
      if (!opts.silent) {
        toast({
          title: 'Errore ricalcolo',
          description: (err as Error).message,
          variant: 'destructive',
        });
      }
      return null;
    }
  }, [toDraftMappingChangeInputs, toast]);

  const loadPeriodData = useCallback(async () => {
    if (!selectedCompany || year == null || month == null) {
      setPublishedRows([]);
      setEditedBalances(new Map());
      setPublishedMappings([]);
      setEditedMappings(new Map());
      setEditedManualFacts(new Map());
      setPublishedManualAmounts(new Map());
      setActiveDraft(null);
      setPreview(null);
      setPeriodLockWarnings([]);
      return;
    }

    setLoading(true);
    try {
      const [rows, mappings, draft] = await Promise.all([
        fetchLedgerBalances(selectedCompany.id, year, month),
        fetchLedgerMappings(selectedCompany.id),
        fetchOpenDraftForPeriod(selectedCompany.id, year, month),
      ]);

      setPublishedRows(rows);
      setPublishedMappings(mappings);
      setActiveDraft(draft);
      setPeriodLockWarnings(await fetchPeriodLockWarnings(selectedCompany.id, year, month, draft?.id ?? null));

      const balanceMap = new Map(rows.map((r) => [r.accountCode, r.balanceNormalized]));
      const mappingMap = new Map(mappings.map((m) => [m.accountCode, toEditedMappingRow(m)]));
      const manualMap = new Map<string, ManualFactOverride>();

      if (draft) {
        const changes = await fetchDraftChanges(draft.id);
        for (const ch of changes) {
          if (ch.changeType === 'balance_update') {
            const code = String(ch.entityKey.account_code ?? '');
            const val = (ch.newValue as { balance_normalized?: number })?.balance_normalized;
            if (code && val != null) balanceMap.set(code, val);
          }
        }
        const mappingDraftChanges = parseDraftMappingChanges(
          changes
            .filter((c) => c.changeType === 'mapping_update')
            .map((c) => ({ entity_key: c.entityKey, new_value: (c.newValue ?? {}) as Record<string, unknown> })),
        );
        for (const mc of mappingDraftChanges) {
          const existing = mappingMap.get(mc.accountCode);
          mappingMap.set(mc.accountCode, {
            accountCode: mc.accountCode,
            accountDescription: existing?.accountDescription ?? null,
            famiglia: mc.famiglia ?? existing?.famiglia ?? null,
            analiticaLabel: mc.analiticaLabel,
            masterAccountId: existing?.masterAccountId ?? null,
            signMultiplier: mc.signMultiplier,
            sourceSheet: mc.sourceSheet ?? existing?.sourceSheet ?? 'Editor',
          });
        }
        for (const mf of parseDraftManualFactChanges(
          changes
            .filter((c) => c.changeType === 'manual_fact')
            .map((c) => ({
              entity_key: c.entityKey,
              new_value: (c.newValue ?? {}) as Record<string, unknown>,
              old_value: c.oldValue,
            })),
        )) {
          manualMap.set(mf.categoryCode, mf);
        }
        if (draft.previewSnapshot) {
          setPreview(draft.previewSnapshot as unknown as RecalculatePreviewResult);
        } else {
          setPreview(null);
        }
        setPeriodLockWarnings(await fetchPeriodLockWarnings(selectedCompany.id, year, month, draft.id));
      } else {
        setPreview(null);
        setPeriodLockWarnings(await fetchPeriodLockWarnings(selectedCompany.id, year, month, null));
      }

      setEditedBalances(balanceMap);
      setEditedMappings(mappingMap);
      setEditedManualFacts(manualMap);

      const needsBaselinePreview = !draft?.previewSnapshot && rows.length > 0;
      if (needsBaselinePreview) {
        setRecalculating(true);
        try {
          await runRecalculatePreview({
            companyId: selectedCompany.id,
            year,
            month,
            rows,
            mappings,
            balanceMap,
            mappingMap,
            manualFactOverrides: Array.from(manualMap.values()),
            draftEditId: draft?.id,
            silent: true,
          });
        } finally {
          setRecalculating(false);
        }
      }
    } catch (err) {
      toast({
        title: 'Errore caricamento',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, year, month, toast, runRecalculatePreview]);

  useEffect(() => {
    loadPeriodData();
  }, [loadPeriodData]);

  const skipEditRecalcRef = useRef(true);

  const modifiedCount = useMemo(() => {
    let n = 0;
    for (const r of publishedRows) {
      const edited = editedBalances.get(r.accountCode);
      if (edited != null && edited !== r.balanceNormalized) n += 1;
    }
    for (const [code, val] of Array.from(editedBalances.entries())) {
      if (!publishedRows.some((r) => r.accountCode === code)) n += 1;
    }
    return n;
  }, [publishedRows, editedBalances]);

  const mappingModifiedCount = useMemo(() => {
    const pubMap = new Map(publishedMappings.map((m) => [m.accountCode, toEditedMappingRow(m)]));
    let n = 0;
    for (const [code, edited] of Array.from(editedMappings.entries())) {
      const pub = pubMap.get(code);
      if (!pub) {
        n += 1;
        continue;
      }
      if (
        pub.analiticaLabel !== edited.analiticaLabel
        || pub.signMultiplier !== edited.signMultiplier
        || (pub.famiglia ?? null) !== (edited.famiglia ?? null)
        || (pub.masterAccountId ?? null) !== (edited.masterAccountId ?? null)
        || (pub.accountDescription ?? null) !== (edited.accountDescription ?? null)
      ) {
        n += 1;
      }
    }
    return n;
  }, [publishedMappings, editedMappings]);

  const manualFactModifiedCount = editedManualFacts.size;

  const totalModifiedCount = modifiedCount + mappingModifiedCount + manualFactModifiedCount;

  useEffect(() => {
    skipEditRecalcRef.current = true;
  }, [selectedCompany?.id, year, month]);

  useEffect(() => {
    if (loading || !selectedCompany || year == null || month == null) return;
    if (publishedRows.length === 0 || totalModifiedCount === 0) return;
    if (skipEditRecalcRef.current) {
      skipEditRecalcRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void runRecalculatePreview({
        companyId: selectedCompany.id,
        year,
        month,
        rows: publishedRows,
        mappings: publishedMappings,
        balanceMap: editedBalances,
        mappingMap: editedMappings,
        manualFactOverrides: Array.from(editedManualFacts.values()),
        draftEditId: activeDraft?.id,
        silent: true,
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    loading,
    selectedCompany,
    year,
    month,
    publishedRows,
    publishedMappings,
    editedBalances,
    editedMappings,
    activeDraft?.id,
    editedManualFacts,
    totalModifiedCount,
    runRecalculatePreview,
  ]);

  const setEditedBalance = useCallback((accountCode: string, value: number) => {
    setEditedBalances((prev) => {
      const next = new Map(prev);
      next.set(accountCode, value);
      return next;
    });
  }, []);

  const setEditedMapping = useCallback((row: EditedMappingRow) => {
    setEditedMappings((prev) => {
      const next = new Map(prev);
      next.set(row.accountCode, row);
      return next;
    });
  }, []);

  const setManualFactOverride = useCallback((override: ManualFactOverride, publishedAmount?: number | null) => {
    setEditedManualFacts((prev) => {
      const next = new Map(prev);
      next.set(override.categoryCode, override);
      return next;
    });
    if (publishedAmount !== undefined) {
      setPublishedManualAmounts((prev) => {
        const next = new Map(prev);
        next.set(override.categoryCode, publishedAmount);
        return next;
      });
    }
  }, []);

  const clearManualFactOverride = useCallback((categoryCode: string) => {
    setEditedManualFacts((prev) => {
      const next = new Map(prev);
      next.delete(categoryCode);
      return next;
    });
    setPublishedManualAmounts((prev) => {
      const next = new Map(prev);
      next.delete(categoryCode);
      return next;
    });
  }, []);

  const handleRecalculate = useCallback(async () => {
    if (!selectedCompany || year == null || month == null || publishedRows.length === 0) return;
    setRecalculating(true);
    try {
      await runRecalculatePreview({
        companyId: selectedCompany.id,
        year,
        month,
        rows: publishedRows,
        mappings: publishedMappings,
        balanceMap: editedBalances,
        mappingMap: editedMappings,
        manualFactOverrides: Array.from(editedManualFacts.values()),
        draftEditId: activeDraft?.id,
      });
    } finally {
      setRecalculating(false);
    }
  }, [
    selectedCompany,
    year,
    month,
    publishedRows,
    publishedMappings,
    editedBalances,
    editedMappings,
    editedManualFacts,
    activeDraft?.id,
    runRecalculatePreview,
  ]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedCompany || year == null || month == null) return;
    setSaving(true);
    try {
      let draft = activeDraft;
      if (!draft) {
        draft = await createDraft(selectedCompany.id, year, month);
        setActiveDraft(draft);
      }

      const balanceChanges = buildBalanceChangesFromGrid(
        publishedRows.map((r) => ({ accountCode: r.accountCode, balanceNormalized: r.balanceNormalized })),
        editedBalances,
        year,
        month,
      );
      const mappingChanges = buildMappingChangesFromGrid(
        publishedMappings.map(toEditedMappingRow),
        editedMappings,
      );
      const manualChanges = buildManualFactChangesFromOverrides(
        Array.from(editedManualFacts.values()),
        publishedManualAmounts,
      );
      const changes = [...balanceChanges, ...mappingChanges, ...manualChanges];

      let snapshotPreview = preview;
      if (changes.length > 0 || !snapshotPreview) {
        const refreshed = await runRecalculatePreview({
          companyId: selectedCompany.id,
          year,
          month,
          rows: publishedRows,
          mappings: publishedMappings,
          balanceMap: editedBalances,
          mappingMap: editedMappings,
          manualFactOverrides: Array.from(editedManualFacts.values()),
          draftEditId: draft.id,
          silent: true,
        });
        if (refreshed) snapshotPreview = refreshed;
      }

      const snapshot = snapshotPreview
        ? {
          kpis: snapshotPreview.kpis,
          warnings: snapshotPreview.warnings,
          counts: snapshotPreview.counts,
          publishGate: snapshotPreview.publishGate,
          facts: snapshotPreview.facts,
        }
        : undefined;

      await saveDraftChanges(draft.id, changes, snapshot);
      await loadRecentDrafts();
      setPeriodLockWarnings(await fetchPeriodLockWarnings(selectedCompany.id, year, month, draft.id));
      toast({
        title: 'Bozza salvata',
        description: `${changes.length} modifiche registrate.`,
      });
    } catch (err) {
      toast({
        title: 'Errore salvataggio bozza',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [
    selectedCompany,
    year,
    month,
    activeDraft,
    publishedRows,
    editedBalances,
    publishedMappings,
    editedMappings,
    editedManualFacts,
    publishedManualAmounts,
    preview,
    runRecalculatePreview,
    loadRecentDrafts,
    toast,
  ]);

  const handlePublishPeriod = useCallback(async () => {
    if (!selectedCompany || year == null || month == null) return;

    if (preview?.publishGate?.blocked) {
      toast({
        title: 'Pubblicazione bloccata',
        description: 'Quadratura KPI non valida. Ricalcola e correggi prima di pubblicare.',
        variant: 'destructive',
      });
      return;
    }

    if (periodLockWarnings.some((w) => w.severity === 'error')) {
      toast({
        title: 'Pubblicazione bloccata',
        description: 'Risolvi gli avvisi di lock periodo prima di pubblicare.',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);
    try {
      let draft = activeDraft;
      if (!draft && totalModifiedCount === 0) {
        toast({
          title: 'Nessuna bozza attiva',
          description: 'Salva prima una bozza con le modifiche.',
          variant: 'destructive',
        });
        return;
      }

      if (totalModifiedCount > 0 || !draft) {
        if (!draft) {
          draft = await createDraft(selectedCompany.id, year, month);
          setActiveDraft(draft);
        }
        const balanceChanges = buildBalanceChangesFromGrid(
          publishedRows.map((r) => ({ accountCode: r.accountCode, balanceNormalized: r.balanceNormalized })),
          editedBalances,
          year,
          month,
        );
        const mappingChanges = buildMappingChangesFromGrid(
          publishedMappings.map(toEditedMappingRow),
          editedMappings,
        );
        const manualChanges = buildManualFactChangesFromOverrides(
          Array.from(editedManualFacts.values()),
          publishedManualAmounts,
        );
        const changes = [...balanceChanges, ...mappingChanges, ...manualChanges];
        const snapshot = preview
          ? { kpis: preview.kpis, warnings: preview.warnings, counts: preview.counts, publishGate: preview.publishGate, facts: preview.facts }
          : undefined;
        await saveDraftChanges(draft.id, changes, snapshot);
      }

      if (!draft) return;

      const result = await publishPeriod(draft.id);
      toast({
        title: 'Periodo pubblicato',
        description: `${result.balances_applied} saldi, ${result.mappings_applied} mapping, ${result.facts_written} facts scritti.`,
      });
      setActiveDraft(null);
      setPreview(null);
      await loadPeriodData();
      await loadRecentDrafts();
    } catch (err) {
      toast({
        title: 'Errore pubblicazione',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  }, [
    selectedCompany,
    year,
    month,
    preview,
    activeDraft,
    totalModifiedCount,
    publishedRows,
    editedBalances,
    publishedMappings,
    editedMappings,
    periodLockWarnings,
    loadPeriodData,
    loadRecentDrafts,
    toast,
  ]);

  const loadDraftFromList = useCallback((draft: DraftEdit) => {
    setYear(draft.year);
    setMonth(draft.month);
  }, []);

  const hasPeriodBalances = publishedRows.length > 0;

  const value = useMemo<EditorContextValue | null>(() => {
    if (!selectedCompany) return null;
    return {
      companyName: selectedCompany.name,
      years,
      months,
      year,
      month,
      setYear,
      setMonth,
      publishedRows,
      editedBalances,
      setEditedBalance,
      publishedMappings,
      editedMappings,
      setEditedMapping,
      editedManualFacts,
      setManualFactOverride,
      clearManualFactOverride,
      activeDraft,
      recentDrafts,
      periodLockWarnings,
      preview,
      hasPeriodBalances,
      loading,
      saving,
      publishing,
      recalculating,
      modifiedCount,
      mappingModifiedCount,
      manualFactModifiedCount,
      totalModifiedCount,
      handleRecalculate,
      handleSaveDraft,
      handlePublishPeriod,
      loadDraftFromList,
      reloadPeriod: loadPeriodData,
    };
  }, [
    selectedCompany,
    years,
    months,
    year,
    month,
    publishedRows,
    editedBalances,
    setEditedBalance,
    publishedMappings,
    editedMappings,
    setEditedMapping,
    editedManualFacts,
    setManualFactOverride,
    clearManualFactOverride,
    activeDraft,
    recentDrafts,
    periodLockWarnings,
    preview,
    hasPeriodBalances,
    loading,
    saving,
    publishing,
    recalculating,
    modifiedCount,
    mappingModifiedCount,
    manualFactModifiedCount,
    totalModifiedCount,
    handleRecalculate,
    handleSaveDraft,
    handlePublishPeriod,
    loadDraftFromList,
    loadPeriodData,
  ]);

  if (!value) return null;

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

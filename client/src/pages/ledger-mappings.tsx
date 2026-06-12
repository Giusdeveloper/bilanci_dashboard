import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/PageHeader';
import LedgerMappingDialog from '@/components/LedgerMappingDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Link2, Save } from 'lucide-react';
import {
  bulkCompleteLedgerMappings,
  deleteLedgerMapping,
  fetchAnaliticaSuggestions,
  fetchCompanyFamiglie,
  fetchLedgerMappings,
  fetchMasterAccounts,
  isIncompleteMapping,
  type CompanyFamigliaOption,
  type LedgerMappingRow,
  type MasterAccountOption,
} from '@/data/ledgerMappings';

type MappingTab = 'all' | 'incomplete';

const EMPTY_FAMIGLIA = '__none__';

interface BulkDraft {
  famiglia: string;
  analiticaLabel: string;
}

function useQueryParams() {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    const onPop = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return params;
}

export default function LedgerMappings() {
  const { isEditorStaff } = useAuth();
  const { companies, selectedCompany, setSelectedCompany } = useFinancialData();
  const { toast } = useToast();
  const query = useQueryParams();

  const [rows, setRows] = useState<LedgerMappingRow[]>([]);
  const [companyFamiglie, setCompanyFamiglie] = useState<CompanyFamigliaOption[]>([]);
  const [masterAccounts, setMasterAccounts] = useState<MasterAccountOption[]>([]);
  const [analiticaSuggestions, setAnaliticaSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MappingTab>(
    query.get('filter') === 'incomplete' ? 'incomplete' : 'all',
  );
  const [bulkDrafts, setBulkDrafts] = useState<Record<string, BulkDraft>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<Partial<LedgerMappingRow> | undefined>();
  const [highlightCode, setHighlightCode] = useState<string | null>(null);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const prefilledRef = useRef(false);

  const companySlug = query.get('company');
  const accountParam = query.get('account') ?? query.get('highlight');
  const descriptionParam = query.get('description');

  useEffect(() => {
    if (!companySlug || !companies.length) return;
    const match = companies.find((c) => c.slug === companySlug);
    if (match && match.id !== selectedCompany?.id) {
      setSelectedCompany(match);
    }
  }, [companySlug, companies, selectedCompany?.id, setSelectedCompany]);

  useEffect(() => {
    if (query.get('filter') === 'incomplete') {
      setActiveTab('incomplete');
    }
  }, [query]);

  useEffect(() => {
    fetchMasterAccounts()
      .then(setMasterAccounts)
      .catch((err) => {
        toast({
          title: 'Errore piano conti',
          description: (err as Error).message,
          variant: 'destructive',
        });
      });
  }, [toast]);

  useEffect(() => {
    if (!selectedCompany) {
      setAnaliticaSuggestions([]);
      setCompanyFamiglie([]);
      return;
    }
    fetchAnaliticaSuggestions(selectedCompany.id)
      .then(setAnaliticaSuggestions)
      .catch(() => setAnaliticaSuggestions([]));
    fetchCompanyFamiglie(selectedCompany.id)
      .then(setCompanyFamiglie)
      .catch(() => setCompanyFamiglie([]));
  }, [selectedCompany]);

  const masterLabelById = useMemo(
    () => new Map(masterAccounts.map((m) => [m.id, `${m.label} (${m.code})`])),
    [masterAccounts],
  );

  const famigliaOptions = useMemo(
    () => companyFamiglie.map((f) => f.label),
    [companyFamiglie],
  );

  const incompleteRows = useMemo(() => rows.filter(isIncompleteMapping), [rows]);

  const loadMappings = useCallback(async () => {
    if (!selectedCompany) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchLedgerMappings(selectedCompany.id);
      setRows(data);
      const drafts: Record<string, BulkDraft> = {};
      for (const r of data) {
        if (isIncompleteMapping(r)) {
          drafts[r.id] = {
            famiglia: r.famiglia ?? '',
            analiticaLabel: '',
          };
        }
      }
      setBulkDrafts(drafts);
    } catch (err) {
      toast({
        title: 'Errore caricamento mapping',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, toast]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    if (!accountParam || prefilledRef.current || loading) return;
    setHighlightCode(accountParam);
    setActiveTab('incomplete');
    const existing = rows.find((r) => r.accountCode === accountParam);
    if (existing) {
      if (isIncompleteMapping(existing)) {
        prefilledRef.current = true;
      } else {
        setEditInitial(existing);
        setDialogOpen(true);
        prefilledRef.current = true;
      }
    } else if (!loading && selectedCompany) {
      setEditInitial({
        accountCode: accountParam,
        accountDescription: descriptionParam ?? null,
        analiticaLabel: '',
        signMultiplier: 1,
      });
      setDialogOpen(true);
      prefilledRef.current = true;
    }
  }, [accountParam, descriptionParam, rows, loading, selectedCompany]);

  useEffect(() => {
    if (!highlightCode || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightCode(null), 4000);
    return () => clearTimeout(t);
  }, [highlightCode, rows, activeTab]);

  const filtered = useMemo(() => {
    const base = activeTab === 'incomplete' ? incompleteRows : rows;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q)
        || (r.accountDescription?.toLowerCase().includes(q) ?? false)
        || r.analiticaLabel.toLowerCase().includes(q)
        || (r.famiglia?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, incompleteRows, search, activeTab]);

  const openCreate = () => {
    setEditInitial(undefined);
    setDialogOpen(true);
  };

  const openEdit = (row: LedgerMappingRow) => {
    setEditInitial(row);
    setDialogOpen(true);
  };

  const handleDelete = async (row: LedgerMappingRow) => {
    if (!window.confirm(`Eliminare il mapping per il conto ${row.accountCode}?`)) return;
    try {
      await deleteLedgerMapping(row.id);
      toast({ title: 'Mapping eliminato' });
      await loadMappings();
    } catch (err) {
      toast({
        title: 'Errore eliminazione',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const updateBulkDraft = (id: string, patch: Partial<BulkDraft>) => {
    setBulkDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const handleBulkSave = async () => {
    if (!selectedCompany) return;

    const updates = incompleteRows
      .map((row) => {
        const draft = bulkDrafts[row.id];
        if (!draft?.analiticaLabel.trim()) return null;
        return {
          row,
          famiglia: draft.famiglia.trim() || null,
          analiticaLabel: draft.analiticaLabel.trim(),
        };
      })
      .filter((u): u is NonNullable<typeof u> => u != null);

    const missing = incompleteRows.length - updates.length;
    if (updates.length === 0) {
      toast({
        title: 'Nessun mapping da salvare',
        description: 'Inserisci la voce analitica CE per almeno un conto.',
        variant: 'destructive',
      });
      return;
    }

    setSavingBulk(true);
    try {
      const saved = await bulkCompleteLedgerMappings(selectedCompany.id, updates, masterAccounts);
      toast({
        title: 'Mapping completati',
        description: missing > 0
          ? `Salvati ${saved} conti. ${missing} ancora senza analitica.`
          : `Salvati ${saved} conti. Tutti i stub sono completi.`,
      });
      await loadMappings();
      if (missing === 0) setActiveTab('all');
    } catch (err) {
      toast({
        title: 'Errore salvataggio bulk',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingBulk(false);
    }
  };

  if (!isEditorStaff) {
    return (
      <div className="p-6">
        <PageHeader title="Mapping conti" subtitle="Accesso riservato al personale operativo" />
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <PageHeader title="Mapping conti" subtitle="Seleziona un'azienda" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title="Mapping conti"
        subtitle={`Conto bilancino → voce analitica CE — ${selectedCompany.name}`}
      />

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[200px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Azienda</Label>
            <Select
              value={selectedCompany.id}
              onValueChange={(id) => {
                prefilledRef.current = false;
                setSelectedCompany(companies.find((c) => c.id === id) ?? null);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Cerca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-imm-blue-dark/40" />
              <Input
                className="pl-9"
                placeholder="Codice, descrizione, analitica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={openCreate}
            className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi mapping
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MappingTab)}>
        <TabsList className="bg-imm-neutral-base">
          <TabsTrigger value="all">Tutti ({rows.length})</TabsTrigger>
          <TabsTrigger value="incomplete" className="gap-2">
            Da completare
            {incompleteRows.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                {incompleteRows.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <MappingTable
            rows={filtered}
            loading={loading}
            highlightCode={highlightCode}
            highlightRef={highlightRef}
            masterLabelById={masterLabelById}
            onEdit={openEdit}
            onDelete={handleDelete}
            onCreate={openCreate}
            emptyMessage="Nessun mapping. Importa un Excel analisi o aggiungi manualmente."
          />
        </TabsContent>

        <TabsContent value="incomplete" className="mt-4 space-y-4">
          {incompleteRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{incompleteRows.length} conti</span> scoperti dal bilancino
                richiedono famiglia e voce analitica CE prima dell&apos;import.
              </p>
              <Button
                onClick={handleBulkSave}
                disabled={savingBulk}
                className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingBulk ? 'Salvataggio...' : 'Salva tutti i completati'}
              </Button>
            </div>
          )}

          <Card className="border-none shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-imm-blue-dark/60">Caricamento...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-imm-blue-dark/60 space-y-3">
                  <Link2 className="w-10 h-10 mx-auto text-imm-signal-teal/50" />
                  <p>Nessuno stub da completare. Tutti i mapping hanno analitica CE.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-imm-neutral-base">
                      <TableRow>
                        <TableHead>Conto</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Famiglia</TableHead>
                        <TableHead>Analitica CE</TableHead>
                        <TableHead className="text-center">Segno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => {
                        const highlighted = highlightCode === r.accountCode;
                        const draft = bulkDrafts[r.id] ?? { famiglia: '', analiticaLabel: '' };
                        return (
                          <TableRow
                            key={r.id}
                            ref={highlighted ? highlightRef : undefined}
                            className={highlighted ? 'bg-amber-100 ring-2 ring-amber-400' : undefined}
                          >
                            <TableCell className="font-mono text-imm-blue-dark">{r.accountCode}</TableCell>
                            <TableCell className="text-imm-blue-dark">{r.accountDescription ?? '—'}</TableCell>
                            <TableCell>
                              <Select
                                value={draft.famiglia || EMPTY_FAMIGLIA}
                                onValueChange={(v) =>
                                  updateBulkDraft(r.id, { famiglia: v === EMPTY_FAMIGLIA ? '' : v })
                                }
                              >
                                <SelectTrigger className="h-8 text-sm min-w-[160px]">
                                  <SelectValue placeholder="Famiglia" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={EMPTY_FAMIGLIA}>— Seleziona —</SelectItem>
                                  {famigliaOptions.map((f) => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                list="bulk-analitica-suggestions"
                                value={draft.analiticaLabel}
                                onChange={(e) => updateBulkDraft(r.id, { analiticaLabel: e.target.value })}
                                placeholder="Voce analitica CE *"
                                className="h-8 text-sm min-w-[200px]"
                              />
                            </TableCell>
                            <TableCell className="text-center font-mono">{r.signMultiplier}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <datalist id="bulk-analitica-suggestions">
                    {analiticaSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LedgerMappingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={selectedCompany.id}
        famigliaOptions={famigliaOptions}
        initial={editInitial}
        onSaved={() => loadMappings()}
      />
    </div>
  );
}

function MappingTable({
  rows,
  loading,
  highlightCode,
  highlightRef,
  masterLabelById,
  onEdit,
  onDelete,
  onCreate,
  emptyMessage,
}: {
  rows: LedgerMappingRow[];
  loading: boolean;
  highlightCode: string | null;
  highlightRef: RefObject<HTMLTableRowElement>;
  masterLabelById: Map<string, string>;
  onEdit: (row: LedgerMappingRow) => void;
  onDelete: (row: LedgerMappingRow) => void;
  onCreate: () => void;
  emptyMessage: string;
}) {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-imm-blue-dark/60">Caricamento...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-imm-blue-dark/60 space-y-3">
            <Link2 className="w-10 h-10 mx-auto text-imm-blue-dark/30" />
            <p>{emptyMessage}</p>
            <Button variant="outline" onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi il primo mapping
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-imm-neutral-base">
                <TableRow>
                  <TableHead>Conto</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Famiglia</TableHead>
                  <TableHead>Analitica CE</TableHead>
                  <TableHead>Voce master</TableHead>
                  <TableHead className="text-center">Segno</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const highlighted = highlightCode === r.accountCode;
                  const incomplete = isIncompleteMapping(r);
                  return (
                    <TableRow
                      key={r.id}
                      ref={highlighted ? highlightRef : undefined}
                      className={highlighted ? 'bg-amber-100 ring-2 ring-amber-400' : undefined}
                    >
                      <TableCell className="font-mono text-imm-blue-dark">
                        {r.accountCode}
                        {incomplete && (
                          <Badge variant="outline" className="ml-2 text-amber-700 border-amber-300 text-[10px]">
                            stub
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-imm-blue-dark">{r.accountDescription ?? '—'}</TableCell>
                      <TableCell className="text-imm-blue-dark/60 text-xs">{r.famiglia ?? '—'}</TableCell>
                      <TableCell className="text-imm-blue-dark">
                        {incomplete ? (
                          <span className="text-amber-700 italic">Da completare</span>
                        ) : (
                          r.analiticaLabel
                        )}
                      </TableCell>
                      <TableCell className="text-imm-blue-dark/80 text-sm">
                        {r.masterAccountId ? masterLabelById.get(r.masterAccountId) ?? '—' : '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono">{r.signMultiplier}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(r)} title="Modifica">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(r)}
                            title="Elimina"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

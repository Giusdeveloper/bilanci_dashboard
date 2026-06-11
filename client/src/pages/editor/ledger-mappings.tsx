/**
 * Editor — Mapping conti via bozza (Sprint 5.3).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import EditorShell from '@/components/EditorShell';
import LedgerMappingDialog from '@/components/LedgerMappingDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Search } from 'lucide-react';
import {
  fetchAnaliticaSuggestions,
  fetchCompanyFamiglie,
  fetchMasterAccounts,
  type LedgerMappingRow,
  type LedgerMappingInput,
  type MasterAccountOption,
} from '@/data/ledgerMappings';
import { isIncompleteStubAnalitica } from '@shared/etl/ledgerMappingStubs';
import { useEditor } from '@/contexts/EditorContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import type { EditedMappingRow } from '@/data/draftEdits';
import { buildCategoryAccountIndex } from '@/data/editorDrillDown';

const EMPTY_FAMIGLIA = '__none__';

function useEditorQueryParams() {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    const onPop = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return params;
}

function toDisplayRow(
  code: string,
  edited: EditedMappingRow,
  published?: LedgerMappingRow,
): { edited: EditedMappingRow; published?: LedgerMappingRow; isModified: boolean } {
  const isModified = !published
    || published.analiticaLabel !== edited.analiticaLabel
    || published.signMultiplier !== edited.signMultiplier
    || (published.famiglia ?? null) !== (edited.famiglia ?? null)
    || (published.masterAccountId ?? null) !== (edited.masterAccountId ?? null);
  return { edited, published, isModified };
}

export default function EditorLedgerMappingsPage() {
  const { selectedCompany } = useFinancialData();
  const {
    publishedMappings,
    editedMappings,
    setEditedMapping,
    loading,
  } = useEditor();

  const query = useEditorQueryParams();
  const accountParam = query.get('account') ?? query.get('highlight');
  const categoryParam = query.get('category');

  const [search, setSearch] = useState('');
  const [masterAccounts, setMasterAccounts] = useState<MasterAccountOption[]>([]);
  const [famigliaOptions, setFamigliaOptions] = useState<string[]>([]);
  const [analiticaSuggestions, setAnaliticaSuggestions] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<Partial<LedgerMappingRow> | undefined>();
  const [highlightCode, setHighlightCode] = useState<string | null>(null);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const prefilledRef = useRef(false);

  useEffect(() => {
    fetchMasterAccounts().then(setMasterAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    fetchCompanyFamiglie(selectedCompany.id)
      .then((f) => setFamigliaOptions(f.map((x) => x.label)))
      .catch(() => {});
    fetchAnaliticaSuggestions(selectedCompany.id)
      .then(setAnaliticaSuggestions)
      .catch(() => {});
  }, [selectedCompany]);

  const pubMap = useMemo(
    () => new Map(publishedMappings.map((m) => [m.accountCode, m])),
    [publishedMappings],
  );

  const categoryIndex = useMemo(
    () => buildCategoryAccountIndex(editedMappings.values(), masterAccounts),
    [editedMappings, masterAccounts],
  );

  const rows = useMemo(() => {
    const codes = new Set([
      ...Array.from(pubMap.keys()),
      ...Array.from(editedMappings.keys()),
    ]);
    return Array.from(codes)
      .map((code) => {
        const edited = editedMappings.get(code);
        if (!edited) return null;
        return toDisplayRow(code, edited, pubMap.get(code));
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => a.edited.accountCode.localeCompare(b.edited.accountCode));
  }, [editedMappings, pubMap]);

  const filtered = useMemo(() => {
    let base = rows;
    if (categoryParam) {
      const accountCodes = new Set(categoryIndex.get(categoryParam) ?? []);
      base = accountCodes.size > 0
        ? rows.filter((r) => accountCodes.has(r.edited.accountCode))
        : rows;
    }
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.edited.accountCode.toLowerCase().includes(q)
        || (r.edited.accountDescription?.toLowerCase().includes(q) ?? false)
        || r.edited.analiticaLabel.toLowerCase().includes(q),
    );
  }, [rows, search, categoryParam, categoryIndex]);

  useEffect(() => {
    if (prefilledRef.current || loading) return;
    if (accountParam) {
      setSearch(accountParam);
      setHighlightCode(accountParam);
      const match = rows.find((r) => r.edited.accountCode === accountParam);
      if (match) {
        setEditInitial({ ...match.edited, id: match.published?.id });
        setDialogOpen(true);
      }
      prefilledRef.current = true;
      return;
    }
    if (categoryParam) {
      prefilledRef.current = true;
    }
  }, [accountParam, categoryParam, loading, rows]);

  useEffect(() => {
    if (!highlightCode || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightCode, filtered]);

  const handleDraftPersist = (input: LedgerMappingInput) => {
    setEditedMapping({
      accountCode: input.accountCode,
      accountDescription: input.accountDescription ?? null,
      famiglia: input.famiglia ?? null,
      analiticaLabel: input.analiticaLabel,
      masterAccountId: input.masterAccountId ?? null,
      signMultiplier: input.signMultiplier ?? 1,
      sourceSheet: input.sourceSheet ?? 'Editor',
    });
  };

  const patchMapping = (edited: EditedMappingRow, patch: Partial<EditedMappingRow>) => {
    setEditedMapping({ ...edited, ...patch });
  };

  const companyId = selectedCompany?.id ?? '';

  return (
    <EditorShell
      title="Mapping conti (editor)"
      subtitle="Modifica famiglia e analitica in griglia o dialogo — salvataggio in bozza"
    >
      {categoryParam && (
        <Card className="border-none shadow-lg bg-imm-neutral-base/80">
          <CardContent className="pt-4 text-sm text-imm-blue-dark/80">
            Filtro voce CE: <span className="font-mono font-semibold">{categoryParam}</span>
            {' · '}
            <button
              type="button"
              className="underline hover:text-imm-signal-teal"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('category');
                window.history.replaceState({}, '', url.pathname + url.search);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              Mostra tutti
            </button>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <div className="text-xs font-bold text-imm-blue-dark/60 uppercase">Cerca</div>
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
            onClick={() => {
              setEditInitial(undefined);
              setDialogOpen(true);
            }}
            className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi mapping
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-imm-blue-dark/60">Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-imm-blue-dark/60">Nessun mapping per questa azienda.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-imm-neutral-base">
                    <TableHead>Conto</TableHead>
                    <TableHead>Analitica pubblicata</TableHead>
                    <TableHead>Famiglia (bozza)</TableHead>
                    <TableHead>Analitica (bozza)</TableHead>
                    <TableHead className="text-center">Segno</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(({ edited, published, isModified }) => {
                    const incomplete = isIncompleteStubAnalitica(edited.analiticaLabel);
                    const highlighted = highlightCode === edited.accountCode;
                    return (
                      <TableRow
                        key={edited.accountCode}
                        ref={highlighted ? highlightRef : undefined}
                        className={
                          highlighted
                            ? 'bg-amber-100 ring-2 ring-amber-400'
                            : isModified
                              ? 'bg-amber-50/50'
                              : undefined
                        }
                      >
                        <TableCell className="font-mono text-imm-blue-dark">
                          {edited.accountCode}
                          {incomplete && (
                            <Badge variant="outline" className="ml-2 text-[10px]">stub</Badge>
                          )}
                        </TableCell>
                        <TableCell>{published?.analiticaLabel ?? '—'}</TableCell>
                        <TableCell>
                          <Select
                            value={edited.famiglia || EMPTY_FAMIGLIA}
                            onValueChange={(v) =>
                              patchMapping(edited, { famiglia: v === EMPTY_FAMIGLIA ? null : v })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm min-w-[140px]">
                              <SelectValue placeholder="Famiglia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_FAMIGLIA}>— Nessuna —</SelectItem>
                              {(famigliaOptions.length ? famigliaOptions : analiticaSuggestions.slice(0, 8)).map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            list="editor-analitica-suggestions"
                            value={edited.analiticaLabel}
                            onChange={(e) => patchMapping(edited, { analiticaLabel: e.target.value })}
                            className="h-8 text-sm min-w-[180px]"
                            placeholder="Voce analitica CE"
                          />
                        </TableCell>
                        <TableCell className="text-center font-mono">{edited.signMultiplier}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifica avanzata"
                            onClick={() => {
                              setEditInitial({
                                ...edited,
                                id: published?.id,
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <datalist id="editor-analitica-suggestions">
                {analiticaSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          )}
        </CardContent>
      </Card>

      {companyId && (
        <LedgerMappingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={companyId}
          famigliaOptions={famigliaOptions.length ? famigliaOptions : analiticaSuggestions.slice(0, 5)}
          initial={editInitial}
          persistMode="draft"
          onDraftPersist={handleDraftPersist}
        />
      )}
    </EditorShell>
  );
}

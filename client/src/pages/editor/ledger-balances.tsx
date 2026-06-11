/**
 * Editor — Saldi contabili (bilancino mensile).
 */

import { useEffect, useMemo, useState } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import EditorShell from '@/components/EditorShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/data/financialData';
import { Link } from 'wouter';

function useEditorQueryParam(key: string): string | null {
  const [value, setValue] = useState(() => new URLSearchParams(window.location.search).get(key));

  useEffect(() => {
    const onPop = () => setValue(new URLSearchParams(window.location.search).get(key));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [key]);

  return value;
}

export default function EditorLedgerBalancesPage() {
  const accountParam = useEditorQueryParam('account');
  const searchParam = useEditorQueryParam('search');
  const [search, setSearch] = useState('');
  const {
    publishedRows,
    editedBalances,
    setEditedBalance,
    loading,
  } = useEditor();

  useEffect(() => {
    const prefill = accountParam ?? searchParam;
    if (prefill) setSearch(prefill);
  }, [accountParam, searchParam]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publishedRows;
    return publishedRows.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q)
        || (r.accountDescription?.toLowerCase().includes(q) ?? false)
        || (r.analiticaLabel?.toLowerCase().includes(q) ?? false),
    );
  }, [publishedRows, search]);

  const handleBalanceChange = (accountCode: string, raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    setEditedBalance(accountCode, parsed);
  };

  return (
    <EditorShell title="Saldi contabili" subtitle="Modifica saldi bilancino con bozza e pubblicazione periodo">
      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="space-y-1">
            <div className="text-xs font-bold text-imm-blue-dark/60 uppercase">Cerca conto</div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-imm-blue-dark/40" />
              <Input
                className="pl-9"
                placeholder="Codice, descrizione o analitica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-imm-blue-dark/60">Caricamento...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-imm-blue-dark/60">
              Nessun saldo pubblicato per il periodo selezionato.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-imm-neutral-base">
                    <TableHead>Conto</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Analitica CE</TableHead>
                    <TableHead className="text-right">Saldo pubblicato</TableHead>
                    <TableHead className="text-right w-40">Saldo bozza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const draftVal = editedBalances.get(r.accountCode) ?? r.balanceNormalized;
                    const isModified = draftVal !== r.balanceNormalized;
                    const highlighted = accountParam === r.accountCode;
                    return (
                      <TableRow
                        key={r.accountCode}
                        className={
                          highlighted
                            ? 'bg-amber-100 ring-2 ring-amber-400'
                            : isModified
                              ? 'bg-amber-50/50'
                              : undefined
                        }
                      >
                        <TableCell className="font-mono text-imm-blue-dark">{r.accountCode}</TableCell>
                        <TableCell>{r.accountDescription ?? '—'}</TableCell>
                        <TableCell className="text-imm-blue-dark/80">{r.analiticaLabel ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.balanceNormalized)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            className="text-right font-mono h-9"
                            value={draftVal}
                            onChange={(e) => handleBalanceChange(r.accountCode, e.target.value)}
                          />
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

      <div className="text-sm text-imm-blue-dark/60">
        <Link href="/editor/bozze" className="text-imm-blue-dark underline hover:text-imm-signal-teal">
          Gestisci tutte le bozze →
        </Link>
      </div>
    </EditorShell>
  );
}

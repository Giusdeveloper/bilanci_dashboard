/**
 * Editor — CE Dettaglio Mensile con diff published vs anteprima (Sprint 5.2).
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import EditorShell from '@/components/EditorShell';
import { Card } from '@/components/ui/card';
import { fetchCEDettaglio } from '@/data/financialReads';
import { formatCurrency } from '@/data/financialData';
import { buildEditorMonthlyDiffRows } from '@/data/editorPreviewShaping';
import { monthLabels } from '@/data/financialShaping';
import type { CEDettaglioModel } from '@shared/queries';
import { useEditor } from '@/contexts/EditorContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';

type ViewMode = 'progressive' | 'period';

export default function EditorCEDettaglioMensilePage() {
  const { selectedCompany } = useFinancialData();
  const { year, month, months, preview, loading: editorLoading } = useEditor();
  const [model, setModel] = useState<CEDettaglioModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('progressive');

  useEffect(() => {
    if (!selectedCompany || year == null) {
      setModel(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCEDettaglio(selectedCompany.id, year)
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch(() => {
        if (!cancelled) setModel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCompany, year]);

  const displayMonths = months.length > 0 ? months : (month != null ? [month] : []);
  const labels = monthLabels(displayMonths);

  const diffRows = useMemo(() => {
    if (!model || !preview?.facts?.length || displayMonths.length === 0) return [];
    return buildEditorMonthlyDiffRows(model, preview.facts, displayMonths, viewMode);
  }, [model, preview, displayMonths, viewMode]);

  const showDiff = preview?.facts?.length && diffRows.length > 0;

  return (
    <EditorShell
      title="CE Dettaglio Mensile (editor)"
      subtitle="Serie mensile — pubblicato vs anteprima bozza"
    >
      <Card className="border-none shadow-lg bg-white/60 p-4 text-sm text-imm-blue-dark/80">
        Vista di confronto sola lettura. Per modificare i valori usa{' '}
        <Link href="/editor/ledger-balances" className="underline hover:text-imm-signal-teal">Saldi</Link>
        {' '}o{' '}
        <Link href="/editor/ledger-mappings" className="underline hover:text-imm-signal-teal">Mapping</Link>.
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['progressive', 'period'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === mode
                ? 'bg-imm-yellow text-imm-blue-dark font-bold shadow-sm border border-imm-yellow-dark hover:bg-imm-yellow-dark'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {mode === 'progressive' ? 'Progressivo' : 'Puntuale'}
          </button>
        ))}
      </div>

      {loading || editorLoading ? (
        <Card className="p-8 text-center">Caricamento...</Card>
      ) : !showDiff ? (
        <Card className="p-6 text-sm text-amber-900 bg-amber-50/80">
          Ricalcola l&apos;anteprima per confrontare la serie mensile con i dati pubblicati.
        </Card>
      ) : (
        <Card className="p-6 overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-max text-sm">
              <thead>
                <tr>
                  <th className="bg-muted px-3 py-3 font-semibold text-left sticky left-0 z-20">Voce</th>
                  {labels.map((label, i) => (
                    <th key={label} colSpan={2} className="bg-muted px-2 py-3 font-semibold text-center border-l">
                      {label}
                      {displayMonths[i] === month && (
                        <span className="block text-[10px] font-normal text-imm-signal-teal">periodo editor</span>
                      )}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="bg-muted/80 sticky left-0 z-20" />
                  {displayMonths.map((m) => (
                    <Fragment key={m}>
                      <th className="bg-muted/80 px-2 py-1 text-xs text-right border-l">Pub.</th>
                      <th className="bg-muted/80 px-2 py-1 text-xs text-right">Ant.</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diffRows.map((row, idx) => (
                  <tr key={idx} className={row.hasDiff ? 'bg-amber-50/60' : ''}>
                    <td className="px-3 py-2 border-b sticky left-0 bg-card z-10">{row.voce}</td>
                    {row.publishedValues.map((pub, i) => {
                      const prev = row.previewValues[i];
                      return (
                        <Fragment key={i}>
                          <td className="px-2 py-2 border-b text-right border-l font-mono text-xs">
                            {pub != null ? formatCurrency(pub) : '—'}
                          </td>
                          <td className="px-2 py-2 border-b text-right font-mono text-xs">
                            {prev != null ? formatCurrency(prev) : '—'}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </EditorShell>
  );
}

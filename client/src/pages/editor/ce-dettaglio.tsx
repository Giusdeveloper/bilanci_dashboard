/**

 * Editor — CE Dettaglio con diff published vs anteprima (Sprint 5.2).

 */



import { useEffect, useMemo, useState } from 'react';

import EditorShell from '@/components/EditorShell';
import LayoutPresentationSection from '@/components/LayoutPresentationSection';
import ManualFactDialog, { type ManualFactDialogTarget } from '@/components/ManualFactDialog';

import { Card, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { fetchCEDettaglio } from '@/data/financialReads';

import { fetchMasterAccounts } from '@/data/ledgerMappings';

import { formatCurrency } from '@/data/financialData';

import {

  buildEditorCEDiffRows,

  buildPreviewAmountMaps,

} from '@/data/editorPreviewShaping';

import { buildCategoryAccountIndex, primaryAccountForCategory } from '@/data/editorDrillDown';

import type { CEDettaglioModel } from '@shared/queries';

import { useEditor } from '@/contexts/EditorContext';

import { useFinancialData } from '@/contexts/FinancialDataContext';

import { Link } from 'wouter';



export default function EditorCEDettaglioPage() {

  const { selectedCompany } = useFinancialData();

  const { year, month, preview, loading: editorLoading, editedMappings, editedManualFacts, setManualFactOverride, clearManualFactOverride } = useEditor();

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualTarget, setManualTarget] = useState<ManualFactDialogTarget | null>(null);

  const [model, setModel] = useState<CEDettaglioModel | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [masterAccounts, setMasterAccounts] = useState<Awaited<ReturnType<typeof fetchMasterAccounts>>>([]);



  useEffect(() => {

    fetchMasterAccounts().then(setMasterAccounts).catch(() => {});

  }, []);



  useEffect(() => {

    if (!selectedCompany || year == null) {

      setModel(null);

      return;

    }

    let cancelled = false;

    setLoading(true);

    setError(null);

    fetchCEDettaglio(selectedCompany.id, year)

      .then((m) => {

        if (!cancelled) setModel(m);

      })

      .catch((e) => {

        if (!cancelled) {

          setError((e as Error).message);

          setModel(null);

        }

      })

      .finally(() => {

        if (!cancelled) setLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [selectedCompany, year]);



  const categoryIndex = useMemo(

    () => buildCategoryAccountIndex(editedMappings.values(), masterAccounts),

    [editedMappings, masterAccounts],

  );



  const diffRows = useMemo(() => {

    if (!model || month == null || !preview?.facts?.length) return [];

    const maps = buildPreviewAmountMaps(preview.facts, year ?? model.year, month);

    return buildEditorCEDiffRows(model, maps, month)

      .filter((r) => r.published != null || r.preview != null);

  }, [model, month, preview, year]);



  const showDiff = preview?.facts?.length && month != null;



  return (

    <EditorShell

      title="CE Dettaglio (editor)"

      subtitle="Confronto pubblicato vs anteprima — drill-down a saldi e mapping"

    >

      <Card className="border-none shadow-lg bg-white/60">

        <CardContent className="pt-4 text-sm text-imm-blue-dark/80">

          Le voci CE foglia possono ricevere un <strong>override manuale</strong> (con motivazione) oppure
          usare i link <strong>Saldi</strong> / <strong>Mapping</strong> per modifiche strutturate.

        </CardContent>

      </Card>



      {loading || editorLoading ? (

        <Card><CardContent className="p-8 text-center text-imm-blue-dark/60">Caricamento...</CardContent></Card>

      ) : error ? (

        <Card><CardContent className="p-8 text-center text-destructive">{error}</CardContent></Card>

      ) : !model ? (

        <Card><CardContent className="p-8 text-center text-imm-blue-dark/60">Nessun dato CE pubblicato per l&apos;anno selezionato.</CardContent></Card>

      ) : !showDiff ? (

        <Card className="border-none shadow-lg bg-amber-50/80">

          <CardContent className="pt-6 text-sm text-amber-900">

            Ricalcola l&apos;anteprima dalla barra editor per vedere il confronto con i dati pubblicati.

          </CardContent>

        </Card>

      ) : (

        <Card className="border-none shadow-lg overflow-hidden">

          <CardContent className="p-0 overflow-x-auto">

            <table className="w-full border-collapse text-sm min-w-max">

              <thead>

                <tr className="bg-imm-blue-dark text-white">

                  <th className="px-4 py-3 text-left font-bold uppercase text-xs">Voce</th>

                  <th className="px-4 py-3 text-right font-bold uppercase text-xs">Pubblicato</th>

                  <th className="px-4 py-3 text-right font-bold uppercase text-xs">Anteprima</th>

                  <th className="px-4 py-3 text-right font-bold uppercase text-xs">Delta</th>

                  <th className="px-4 py-3 text-center font-bold uppercase text-xs">Modifica</th>

                </tr>

              </thead>

              <tbody>

                {diffRows.map((row) => {

                  const isLeaf = row.code != null && row.className !== 'result' && row.className !== 'margine';

                  const accountCode = primaryAccountForCategory(row.code, categoryIndex);

                  const mappingHref = accountCode

                    ? `/editor/ledger-mappings?account=${encodeURIComponent(accountCode)}`

                    : row.code

                      ? `/editor/ledger-mappings?category=${encodeURIComponent(row.code)}`

                      : null;

                  const saldiHref = accountCode

                    ? `/editor/ledger-balances?account=${encodeURIComponent(accountCode)}`

                    : null;



                  const hasManualOverride = row.code != null && editedManualFacts.has(row.code);

                  return (

                    <tr

                      key={`${row.voce}-${row.code ?? 'x'}`}

                      className={row.hasDiff ? 'bg-amber-50/60' : 'odd:bg-white even:bg-imm-neutral/20'}

                    >

                      <td className="px-4 py-2 font-medium whitespace-nowrap">{row.voce}</td>

                      <td className="px-4 py-2 text-right font-mono">

                        {row.published != null ? formatCurrency(row.published) : '—'}

                      </td>

                      <td className="px-4 py-2 text-right font-mono">

                        {row.preview != null ? formatCurrency(row.preview) : '—'}

                      </td>

                      <td className="px-4 py-2 text-right font-mono">

                        {row.delta != null ? formatCurrency(row.delta) : '—'}

                      </td>

                      <td className="px-4 py-2 text-center whitespace-nowrap">

                        {isLeaf && row.code ? (

                          <div className="flex flex-wrap justify-center gap-1">

                            <Button
                              variant={hasManualOverride ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setManualTarget({
                                  categoryCode: row.code!,
                                  voce: row.voce,
                                  publishedAmount: row.published,
                                  currentAmount: row.preview,
                                });
                                setManualDialogOpen(true);
                              }}
                            >
                              Override
                            </Button>

                            {saldiHref && (

                              <Link href={saldiHref}>

                                <Button variant="outline" size="sm" className="h-7 text-xs">

                                  Saldi

                                </Button>

                              </Link>

                            )}

                            {mappingHref && (

                              <Link href={mappingHref}>

                                <Button variant="outline" size="sm" className="h-7 text-xs">

                                  Mapping

                                </Button>

                              </Link>

                            )}

                          </div>

                        ) : (

                          <span className="text-imm-blue-dark/30">—</span>

                        )}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </CardContent>

        </Card>

      )}

      <LayoutPresentationSection />

      <ManualFactDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        target={manualTarget}
        onSave={(value, motivazione) => {
          if (!manualTarget || year == null || month == null) return;
          setManualFactOverride(
            {
              categoryCode: manualTarget.categoryCode,
              year,
              month,
              amountProgressive: value,
              motivazione,
            },
            manualTarget.publishedAmount,
          );
        }}
        onClear={
          manualTarget
            ? () => clearManualFactOverride(manualTarget.categoryCode)
            : undefined
        }
      />

    </EditorShell>

  );

}



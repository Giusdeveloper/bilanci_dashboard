/**
 * LayoutPresentationSection — override etichetta/nascondi righe CE (Sprint 7.2).
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { effectiveLayoutLabel, layoutRowKey } from '@shared/etl/draftChanges';
import { useEditor } from '@/contexts/EditorContext';

export default function LayoutPresentationSection() {
  const {
    year,
    publishedLayoutRows,
    editedLayoutOverrides,
    setLayoutOverride,
    clearLayoutOverride,
  } = useEditor();

  const rows = useMemo(() => {
    if (year == null) return [];
    return publishedLayoutRows
      .filter((r) => r.reportType === 'ce_dettaglio' && r.year === year)
      .slice(0, 80);
  }, [publishedLayoutRows, year]);

  if (rows.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-white/60">
        <CardContent className="pt-6 text-sm text-imm-blue-dark/60">
          Nessun layout CE pubblicato per l&apos;anno selezionato. Pubblica un periodo per abilitare le override di presentazione.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="font-heading text-imm-blue-dark text-lg">Presentazione righe CE</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <p className="px-4 pb-3 text-sm text-imm-blue-dark/70">
          Personalizza l&apos;etichetta visualizzata o nascondi righe nel CE dettaglio. Le modifiche vengono salvate in bozza e applicate alla pubblicazione.
        </p>
        <table className="w-full border-collapse text-sm min-w-max">
          <thead>
            <tr className="bg-imm-neutral-base">
              <th className="px-4 py-2 text-left text-xs font-bold uppercase">#</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase">Etichetta originale</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase">Etichetta visualizzata</th>
              <th className="px-4 py-2 text-center text-xs font-bold uppercase">Nascosta</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase">Anteprima</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = layoutRowKey(row.reportType, row.year, row.rowIndex);
              const override = editedLayoutOverrides.get(key);
              const displayLabel = override?.displayLabel ?? row.displayLabel ?? '';
              const isHidden = override?.isHidden ?? row.isHidden ?? false;
              const previewLabel = effectiveLayoutLabel({
                originalLabel: row.originalLabel,
                displayLabel: displayLabel.trim() ? displayLabel : null,
              });

              return (
                <tr key={key} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{row.rowIndex}</td>
                  <td className="px-4 py-2 max-w-[220px] truncate" title={row.originalLabel}>{row.originalLabel}</td>
                  <td className="px-4 py-2">
                    <Input
                      className="h-8 max-w-xs"
                      placeholder={row.originalLabel}
                      value={displayLabel}
                      onChange={(e) => {
                        setLayoutOverride({
                          rowIndex: row.rowIndex,
                          reportType: row.reportType,
                          year: row.year,
                          displayLabel: e.target.value.trim() ? e.target.value : null,
                          isHidden,
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Checkbox
                      checked={isHidden}
                      onCheckedChange={(checked) => {
                        setLayoutOverride({
                          rowIndex: row.rowIndex,
                          reportType: row.reportType,
                          year: row.year,
                          displayLabel: displayLabel.trim() ? displayLabel : null,
                          isHidden: checked === true,
                        });
                      }}
                    />
                  </td>
                  <td className={`px-4 py-2 ${isHidden ? 'line-through text-muted-foreground' : ''}`}>
                    {previewLabel}
                  </td>
                  <td className="px-4 py-2">
                    {(override || row.displayLabel || row.isHidden) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearLayoutOverride(row.rowIndex)}
                      >
                        Reset
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

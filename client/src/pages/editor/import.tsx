/**
 * Editor — import wizard nel hub periodo (Sprint 6).
 */

import EditorShell from '@/components/EditorShell';
import ImportData from '@/pages/import-data';
import { useEditor, EDITOR_MONTH_LABELS } from '@/contexts/EditorContext';
import { Card, CardContent } from '@/components/ui/card';

export default function EditorImportPage() {
  const { companyName, year, month } = useEditor();

  return (
    <EditorShell
      title="Import dati"
      subtitle={`Carica bilancino o analisi CE — ${companyName}`}
    >
      <Card className="border-none shadow-lg bg-imm-signal-teal/10 mb-4">
        <CardContent className="pt-4 text-sm text-imm-blue-dark">
          Periodo editor selezionato:{' '}
          <strong>
            {month != null ? `${EDITOR_MONTH_LABELS[month]} ${year}` : year ?? '—'}
          </strong>
          . L&apos;import userà l&apos;azienda già selezionata nella barra superiore.
        </CardContent>
      </Card>
      <ImportData embedded editorMode />
    </EditorShell>
  );
}

/**
 * Editor — mirror read-only partitari (Sprint 7.1).
 */

import { useCallback } from 'react';
import EditorShell from '@/components/EditorShell';
import PartitariView from '@/components/PartitariView';
import { useEditor } from '@/contexts/EditorContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';

export default function EditorPartitariPage() {
  const { selectedCompany, loadFinancialData } = useFinancialData();
  const { year, month, companyName } = useEditor();

  const loadPartitari = useCallback(
    async (companyId: string, y: number, m: number) => {
      const data = await loadFinancialData(companyId, 'partitari', y, m);
      if (data && data.length > 0 && data[0].data) {
        const partitari = data[0].data as { headers: string[]; data: Record<string, unknown>[] };
        return { headers: partitari.headers ?? [], data: partitari.data ?? [] };
      }
      return null;
    },
    [loadFinancialData],
  );

  return (
    <EditorShell
      title="Partitari (editor)"
      subtitle="Consultazione partitari — le modifiche strutturali avvengono via saldi e mapping"
    >
      <PartitariView
        companyId={selectedCompany?.id ?? null}
        companyName={companyName}
        fixedYear={year}
        fixedMonth={month}
        loadPartitari={loadPartitari}
        testId="page-editor-partitari"
        readOnlyHint="Vista specchio in sola lettura. Per correggere i dati contabili usa Saldi o Mapping nell'editor."
      />
    </EditorShell>
  );
}

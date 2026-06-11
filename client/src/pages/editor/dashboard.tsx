/**
 * Editor — Dashboard KPI da anteprima bozza (Sprint 5.1).
 */

import { Link } from 'wouter';
import EditorShell from '@/components/EditorShell';
import KPICard from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/data/financialData';
import { DRAFT_PREVIEW_KPIS } from '@/data/draftEdits';
import { useEditor } from '@/contexts/EditorContext';
import { BookOpen, Calculator } from 'lucide-react';

export default function EditorDashboardPage() {
  const {
    preview,
    loading,
    hasPeriodBalances,
    handleRecalculate,
    recalculating,
    year,
    month,
  } = useEditor();

  return (
    <EditorShell
      title="Dashboard editor"
      subtitle="KPI da anteprima bozza — confronto prima della pubblicazione"
    >
      {!preview && !loading && !recalculating && (
        <Card className="border-none shadow-lg bg-amber-50/80">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-amber-900">
              {hasPeriodBalances
                ? 'Nessuna anteprima disponibile. Usa «Ricalcola» per generare i KPI dal periodo pubblicato.'
                : 'Nessun saldo contabile per questo periodo. Importa o pubblica i dati prima di modificare.'}
            </p>
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculating || !hasPeriodBalances}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Ricalcola anteprima
            </Button>
          </CardContent>
        </Card>
      )}

      {preview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DRAFT_PREVIEW_KPIS.map(({ label, key }) => (
            <KPICard
              key={key}
              label={label}
              value={preview.kpis[key] != null ? formatCurrency(preview.kpis[key]) : '—'}
              description={
                year != null && month != null
                  ? `Anteprima ${month}/${year}`
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">Drill-down</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/editor/ledger-balances">
            <Button variant="outline">
              <BookOpen className="w-4 h-4 mr-2" />
              Vai ai saldi contabili
            </Button>
          </Link>
          <Link href="/editor/ce-dettaglio">
            <Button variant="outline">CE Dettaglio (diff)</Button>
          </Link>
          <Link href="/editor/ledger-mappings">
            <Button variant="outline">Mapping conti</Button>
          </Link>
        </CardContent>
      </Card>
    </EditorShell>
  );
}

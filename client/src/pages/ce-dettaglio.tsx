import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { formatCurrency, formatPercentage } from "@/data/financialData";
import { buildCEDettaglioTableRows } from "@/data/financialShaping";
import { fetchCEDettaglio } from "@/data/financialReads";
import type { CEDettaglioModel } from "@shared/queries";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCompanyPeriods } from "@/hooks/useCompanyPeriods";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CEDettaglio() {
  const { selectedCompany } = useFinancialData();
  const companyId = selectedCompany?.id ?? null;
  const { periods, loading: periodsLoading } = useCompanyPeriods(companyId);

  const [model, setModel] = useState<CEDettaglioModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    setModel(null);
    setSelectedYear("");
    setError(null);
  }, [companyId]);

  useEffect(() => {
    if (periods && periods.years.length > 0) {
      setSelectedYear((prev) => (prev ? prev : periods.years[0].toString()));
    }
  }, [periods]);

  const yearNum = selectedYear ? parseInt(selectedYear) : null;

  useEffect(() => {
    if (!companyId || yearNum === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCEDettaglio(companyId, yearNum)
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("CE Dettaglio Load Error:", e);
          setError("Impossibile caricare il Conto Economico di dettaglio.");
          setModel(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, yearNum]);

  if (!selectedCompany) {
    return <div className="p-8 text-center text-muted-foreground font-sans italic">Seleziona un'azienda per visualizzare i dati.</div>;
  }
  if (periodsLoading || (loading && !model)) {
    return <div className="p-8 text-center font-heading text-imm-blue-dark">Caricamento dati di dettaglio in corso...</div>;
  }
  if (periods && periods.years.length === 0) {
    return <div className="p-8 text-center text-muted-foreground font-sans">Nessun dato disponibile per questa azienda.</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-destructive font-sans">{error}</div>;
  }
  if (!model || model.rows.length === 0) {
    return <div className="p-8 text-center text-muted-foreground font-sans">Nessun dato analitico disponibile per l'anno selezionato.</div>;
  }

  const year = model.year;
  const availableYears = periods?.years.map((y) => y.toString()) ?? [];
  const tableRows = buildCEDettaglioTableRows(model, formatCurrency, formatPercentage);

  return (
    <div data-testid="page-ce-dettaglio" className="space-y-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title="CE Dettaglio"
        subtitle={`Conto Economico Analitico - Fedele all'Excel (${year})`}
      />

      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3 rounded-xl border mb-6 w-fit animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Anno</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
        <DataTable
          title="Dettaglio Voci (Dati da Excel)"
          columns={[
            { key: "voce", label: "Voce", align: "left" as const, className: "font-bold" },
            { key: `val${year}`, label: `${year}`, align: "right" as const },
            { key: "percentage", label: "% Ricavi", align: "right" as const },
          ]}
          data={tableRows}
        />
      </div>
    </div>
  );
}

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/data/financialData";
import { fetchCEDettaglio } from "@/data/financialReads";
import { buildMonthlyDetailRows, monthDetailHref, monthLabels, type MonthlyTableRow } from "@/data/financialShaping";
import type { CEDettaglioModel } from "@shared/queries";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCompanyPeriods } from "@/hooks/useCompanyPeriods";
import { useEffect, useState } from "react";
import { Link } from "wouter";

type ViewMode = "progressive" | "period";

const getRowStyle = (className: string) => {
  switch (className) {
    case "result": return { row: "bg-yellow-100 dark:bg-yellow-900/40 font-bold", sticky: "bg-[#fefce8] dark:bg-[#1a1600]" };
    case "key-metric": return { row: "bg-blue-50 dark:bg-blue-950/20 font-bold", sticky: "bg-[#f0f9ff] dark:bg-[#082f49]" };
    case "total-dark": return { row: "bg-blue-900/10 dark:bg-blue-900/30 font-bold", sticky: "bg-[#f1f5f9] dark:bg-[#1e293b]" };
    case "highlight": return { row: "font-semibold", sticky: "bg-[#f8fafc] dark:bg-[#0f172a]" };
    default: return { row: "hover:bg-muted/50", sticky: "bg-card" };
  }
};

export default function CEDettaglioMensile() {
  const { selectedCompany } = useFinancialData();
  const companyId = selectedCompany?.id ?? null;
  const { periods, loading: periodsLoading, monthsForYear } = useCompanyPeriods(companyId);

  const [model, setModel] = useState<CEDettaglioModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("progressive");

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
  const months = yearNum !== null ? monthsForYear(yearNum) : [];
  const hasMonthly = months.length > 0;

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
          console.error("CE Dettaglio Mensile Load Error:", e);
          setError("Impossibile caricare i dati mensili.");
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
    return (
      <div className="p-8">
        <PageHeader title="CE Dettaglio Mensile" subtitle="Conto Economico Dettagliato" />
        <div className="p-8 bg-muted rounded-lg text-center mt-6">
          <p className="text-lg text-muted-foreground">Seleziona un'azienda per visualizzare i dati.</p>
        </div>
      </div>
    );
  }
  if (periodsLoading || (loading && !model)) return <div className="p-8 text-center">Caricamento...</div>;
  if (periods && periods.years.length === 0) {
    return (
      <div className="p-8">
        <PageHeader title="CE Dettaglio Mensile" subtitle="Dati non disponibili" />
        <div className="mt-8 text-center text-muted-foreground">Nessun dato disponibile per questa azienda.</div>
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;

  const availableYears = periods?.years.map((y) => y.toString()) ?? [];
  const labels = monthLabels(months);
  const rows: MonthlyTableRow[] = model && hasMonthly
    ? buildMonthlyDetailRows(model, viewMode, months, formatCurrency)
    : [];

  return (
    <div data-testid="page-ce-dettaglio-mensile" className="space-y-6">
      <div className="bg-primary rounded-lg p-6 text-primary-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2">CE Dettaglio Mensile</h1>
        <p className="opacity-90">Conto Economico Dettagliato - Serie mensile {viewMode === "progressive" ? "Progressiva" : "Puntuale"}.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Anno</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {([["progressive", "Progressivo"], ["period", "Puntuale"]] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              disabled={!hasMonthly}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"} ${!hasMonthly ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasMonthly ? (
        <Card className="p-8 text-center text-muted-foreground">
          Per l'anno {selectedYear} sono presenti solo dati annuali: la serie mensile non è disponibile.
        </Card>
      ) : (
        <Card className="p-6 overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Voce</th>
                  {labels.map((m, i) => (
                    <th key={`${m}-${i}`} className="bg-muted px-3 py-3 text-sm font-semibold border-b-2 border-border text-right whitespace-nowrap">
                      {yearNum !== null ? (
                        <Link
                          href={monthDetailHref(months[i], yearNum)}
                          className="text-primary hover:underline"
                          title={`Apri ${m} ${selectedYear}`}
                        >
                          {m}
                        </Link>
                      ) : (
                        m
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const styles = getRowStyle(row.className);
                  return (
                    <tr key={idx} className={styles.row}>
                      <td className={`px-3 py-3 text-sm border-b border-border sticky left-0 z-20 ${styles.sticky} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>{row.voce}</td>
                      {row.values.map((v, i) => <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">{v}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

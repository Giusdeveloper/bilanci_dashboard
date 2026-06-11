import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { formatCurrency, formatPercentage } from "@/data/financialData";
import { buildMacroTableRows } from "@/data/financialShaping";
import { fetchCESintetico } from "@/data/financialReads";
import { resolveCompanyCeProfileId } from "@/data/companyCeProfile";
import type { CESinteticoModel, DashboardPeriod } from "@shared/queries";
import { DASHBOARD_PERIOD_OPTIONS, normalizeDashboardPeriod } from "@shared/domain/periodMath";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCompanyPeriods } from "@/hooks/useCompanyPeriods";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const monthNames = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default function CESintetico() {
  const { selectedCompany } = useFinancialData();
  const companyId = selectedCompany?.id ?? null;
  const ceProfileId = resolveCompanyCeProfileId(selectedCompany);
  const { periods, loading: periodsLoading, monthsAvailableForYear, monthsForYear } = useCompanyPeriods(companyId);

  const [model, setModel] = useState<CESinteticoModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("YTD");

  useEffect(() => {
    setModel(null);
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedPeriod("YTD");
    setError(null);
  }, [companyId]);

  useEffect(() => {
    if (periods && periods.years.length > 0) {
      setSelectedYear((prev) => (prev ? prev : periods.years[0].toString()));
    }
  }, [periods]);

  const yearNum = selectedYear ? parseInt(selectedYear) : null;
  const monthsAvailable = yearNum !== null ? monthsAvailableForYear(yearNum) : 0;
  const hasMonthly = monthsAvailable > 0;

  useEffect(() => {
    if (yearNum === null) return;
    const months = monthsForYear(yearNum);
    const lastMonth = months.length > 0 ? months[months.length - 1] : 12;
    setSelectedMonth(lastMonth.toString());
    if (months.length === 0) setSelectedPeriod("YTD");
  }, [yearNum, periods]);

  useEffect(() => {
    if (!companyId || yearNum === null || !selectedMonth) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCESintetico(companyId, yearNum, {
      period: selectedPeriod,
      month: parseInt(selectedMonth),
      ceProfileId,
    })
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("CE Sintetico Load Error:", e);
          setError("Impossibile caricare il Conto Economico sintetico.");
          setModel(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, yearNum, selectedMonth, selectedPeriod, ceProfileId]);

  if (!selectedCompany) {
    return <div className="p-8 text-center text-muted-foreground">Seleziona un'azienda per visualizzare i dati.</div>;
  }
  if (periodsLoading || (loading && !model)) {
    return <div className="p-8 text-center">Analisi Sintetica in corso...</div>;
  }
  if (periods && periods.years.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nessun dato disponibile per questa azienda.</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }
  if (!model) {
    return <div className="p-8 text-center text-muted-foreground">Dati non disponibili per questa selezione.</div>;
  }

  const { years } = model;
  const [t0, t1, t2] = years;
  const monthName = monthNames[model.monthReference]?.substring(0, 3) ?? "";
  const periodLabel = selectedPeriod === 'YTD' ? `(Gen-${monthName})` : `(${selectedPeriod})`;

  const availableYears = periods?.years.map((y) => y.toString()) ?? [];
  const tableRows = buildMacroTableRows(model.rows, years, formatCurrency, formatPercentage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="CE Sintetico" subtitle={`Conto Economico Sintetico - Analisi Multi-Anno ${periodLabel}`} />

      {/* FILTRI */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3 rounded-xl border mb-6 w-fit animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Anno</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fino a</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!hasMonthly}>
            <SelectTrigger className="w-[110px] h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{monthNames.slice(1).map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Periodo</Label>
          <Select
            value={normalizeDashboardPeriod(selectedPeriod)}
            onValueChange={(v) => setSelectedPeriod(v as DashboardPeriod)}
            disabled={!hasMonthly}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DASHBOARD_PERIOD_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!hasMonthly && (
          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">
            Dati solo annuali
          </span>
        )}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
        <DataTable
          title="Riepilogo Macro-Aggregati"
          columns={[
            { key: "voce", label: "Voce", align: "left" as const, className: "font-bold" },
            { key: `val${t0}`, label: `${t0}`, align: "right" as const },
            { key: "percentage", label: `% Ricavi ${t0}`, align: "right" as const },
            { key: `val${t1}`, label: `${t1}`, align: "right" as const },
            { key: `val${t2}`, label: `${t2}`, align: "right" as const },
            { key: "variance", label: `Var % (${t0}/${t1})`, align: "right" as const },
          ]}
          data={tableRows}
        />
      </div>
    </div>
  );
}

import PageHeader from "@/components/PageHeader";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";
import { buildMacroTableRows } from "@/data/financialShaping";
import { fetchDashboardModel } from "@/data/financialReads";
import { resolveCompanyCeProfileId } from "@/data/companyCeProfile";
import type { DashboardModel, DashboardPeriod } from "@shared/queries";
import { DASHBOARD_PERIOD_OPTIONS, normalizeDashboardPeriod } from "@shared/domain/periodMath";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCompanyPeriods } from "@/hooks/useCompanyPeriods";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const monthNames = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default function Dashboard() {
  const { selectedCompany } = useFinancialData();
  const companyId = selectedCompany?.id ?? null;
  const ceProfileId = resolveCompanyCeProfileId(selectedCompany);
  const { periods, loading: periodsLoading, monthsAvailableForYear, monthsForYear } = useCompanyPeriods(companyId);

  const [model, setModel] = useState<DashboardModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("YTD");

  // Reset alla selezione di una nuova azienda.
  useEffect(() => {
    setModel(null);
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedPeriod("YTD");
    setError(null);
  }, [companyId]);

  // Quando arrivano gli anni disponibili, seleziona il più recente.
  useEffect(() => {
    if (periods && periods.years.length > 0) {
      setSelectedYear((prev) => (prev ? prev : periods.years[0].toString()));
    }
  }, [periods]);

  const yearNum = selectedYear ? parseInt(selectedYear) : null;
  const monthsAvailable = yearNum !== null ? monthsAvailableForYear(yearNum) : 0;
  const hasMonthly = monthsAvailable > 0;

  // Imposta un mese di default coerente coi dati (ultimo disponibile o 12).
  useEffect(() => {
    if (yearNum === null) return;
    const months = monthsForYear(yearNum);
    const lastMonth = months.length > 0 ? months[months.length - 1] : 12;
    setSelectedMonth(lastMonth.toString());
    if (months.length === 0) setSelectedPeriod("YTD");
  }, [yearNum, periods]);

  // Carica il modello della dashboard quando cambiano i filtri.
  useEffect(() => {
    if (!companyId || yearNum === null || !selectedMonth) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardModel(companyId, yearNum, {
      period: selectedPeriod,
      month: parseInt(selectedMonth),
      ceProfileId,
    })
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("Dashboard Load Error:", e);
          setError("Impossibile caricare i dati della dashboard.");
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
    return <div className="p-8 text-center">Caricamento Analisi Strategica...</div>;
  }
  if (periods && periods.years.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-2">
        <p>Nessun dato disponibile per questa azienda.</p>
        <p className="text-sm">Importa un bilancio CE o pubblica i facts dal bilancino (opzione «Pubblica su dashboard»).</p>
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }
  if (!model) {
    const hint =
      yearNum !== null && periods?.byYear[yearNum]
        ? ` Prova a cambiare anno o mese (es. ${yearNum}).`
        : '';
    return (
      <div className="p-8 text-center text-muted-foreground">
        Dati non disponibili per questa selezione.{hint}
      </div>
    );
  }

  const { kpisByYear, summary, years } = model;
  const [t0, t1, t2] = years;
  const kpi0 = kpisByYear[t0];
  const kpi1 = kpisByYear[t1];
  const kpi2 = kpisByYear[t2];

  const ricaviVar = calculateVariance(kpi0.ricavi, kpi1.ricavi);

  const availableYears = periods?.years.map((y) => y.toString()) ?? [];

  const trendData = {
    labels: model.trendMonths,
    datasets: [
      { label: `Ricavi ${t0}`, data: kpi0.ricaviMonthlyProgressive, borderColor: "#335C96", tension: 0.4 },
      { label: `EBITDA ${t0}`, data: kpi0.ebitdaMonthlyProgressive, borderColor: "#4A82BF", tension: 0.4 },
    ],
  };

  const comparisonData = {
    labels: ["Ricavi", "EBITDA", "Risultato"],
    datasets: [
      { label: `${t2}`, data: [kpi2.ricavi, kpi2.ebitda, kpi2.risultato], backgroundColor: "#e2e8f0" },
      { label: `${t1}`, data: [kpi1.ricavi, kpi1.ebitda, kpi1.risultato], backgroundColor: "#9cbfe0" },
      { label: `${t0}`, data: [kpi0.ricavi, kpi0.ebitda, kpi0.risultato], backgroundColor: "#335C96" },
    ],
  };

  const tableRows = buildMacroTableRows(summary, years, formatCurrency, formatPercentage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Dashboard Generale" subtitle="Analisi Strategica Triennale" />

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
        <KPICard label={`Ricavi ${t0}`} value={formatCurrency(kpi0.ricavi)} change={`${ricaviVar >= 0 ? '+' : ''}${formatPercentage(ricaviVar, 0)} vs ${t1}`} changeType={ricaviVar >= 0 ? "positive" : "negative"} />
        <KPICard label={`Costi ${t0}`} value={formatCurrency(kpi0.costi)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
        <KPICard label={`EBITDA ${t0}`} value={formatCurrency(kpi0.ebitda)} changeType={kpi0.ebitda >= 0 ? "positive" : "negative"} />
        <KPICard label={`Risultato ${t0}`} value={formatCurrency(kpi0.risultato)} changeType={kpi0.risultato >= 0 ? "positive" : "negative"} />
        <KPICard label={`Margine EBITDA ${t0}`} value={formatPercentage(kpi0.margineEbitda)} changeType={kpi0.margineEbitda >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
        {hasMonthly ? (
          <ChartCard title={`Trend Mensile ${t0}`}><Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} /></ChartCard>
        ) : (
          <ChartCard title={`Trend Mensile ${t0}`}>
            <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground px-6">
              Trend mensile non disponibile: per questo anno sono presenti solo dati annuali.
            </div>
          </ChartCard>
        )}
        <ChartCard title="Confronto Triennale"><Bar data={comparisonData} options={{ responsive: true, maintainAspectRatio: false }} /></ChartCard>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
        <DataTable
          title="Dettaglio Economico"
          columns={[
            { key: "voce", label: "Voce", align: "left" as const, className: "font-bold" },
            { key: `val${t0}`, label: `${t0}`, align: "right" as const },
            { key: "percentage", label: "% Ricavi", align: "right" as const },
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

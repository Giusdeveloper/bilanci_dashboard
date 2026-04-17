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
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";

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

interface DashboardData {
  kpis: {
    ricavi2025: number;
    ricavi2024: number;
    costi2025: number;
    costi2024: number;
    ebitda2025: number;
    ebitda2024: number;
    risultato2025: number;
    risultato2024: number;
    margineEbitda2025: number;
    margineEbitda2024: number;
    costLabel?: string;
    costDescription?: string;
  };
  monthlyTrend: {
    labels: string[];
    ricavi: number[];
    ebitda: number[];
  };
  monthReference?: number;
  summary?: any[];
  ceDettaglio?: { // New property to hold detailed data
    progressivo2025: any;
    progressivo2024: any;
  }
}

export default function Dashboard() {
  const { selectedCompany, getDashboardData, getCEDettaglioData } = useFinancialData(); // Need getCEDettaglioData
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      setDashboardData(null);
    }
  }, [selectedCompany?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany) {
        setDashboardData(null);
        return;
      }

      setLoading(true);
      try {
        // Fetch Standard Dashboard Data
        const dashDataRaw = await getDashboardData(selectedCompany.id);

        // Fetch CE Dettaglio Data specifically for the table view
        const ceDataRaw = await getCEDettaglioData(selectedCompany.id);


        if (!dashDataRaw || dashDataRaw.length === 0 || !dashDataRaw[0] || !dashDataRaw[0].data) {
          console.warn("Nessun dato dashboard trovato nel DB.");
          setDashboardData(null);
          return;
        }

        const dbData = dashDataRaw[0].data as any;
        
        let validKpis = dbData.kpis || {};
        let validMonthlyTrend = dbData.monthlyTrend || { labels: [], ricavi: [], ebitda: [] };
        let validSummary = dbData.summary || [];

        // Supporto per struttura alternativa (Sherpa42 vecchia)
        if (!dbData.kpis && (dbData.trends || dbData.table)) {
          console.log("Rilevata struttura alternativa (vecchio formato/Sherpa). Tento conversione...");
          
          if (dbData.trends) {
            if (dbData.trends.monthlyTrend) {
              validMonthlyTrend = dbData.trends.monthlyTrend;
            } else if (dbData.trends.labels) {
              validMonthlyTrend = {
                labels: dbData.trends.labels,
                ricavi: dbData.trends.ricavi || [],
                ebitda: dbData.trends.ebitda || []
              };
            }
          }

          if (dbData.table) {
            validSummary = dbData.table;
          }

          validKpis = dbData.kpis || {
            ricavi2025: 0, ricavi2024: 0,
            costi2025: 0, costi2024: 0,
            ebitda2025: 0, ebitda2024: 0,
            risultato2025: 0, risultato2024: 0,
            margineEbitda2025: 0, margineEbitda2024: 0
          };
        }

        // Extract CE Dettaglio
        let validCEDettaglio = null;
        if (ceDataRaw && ceDataRaw.length > 0 && ceDataRaw[0].data) {
          validCEDettaglio = ceDataRaw[0].data;
        }

        const finalData: DashboardData = {
          kpis: validKpis,
          monthlyTrend: validMonthlyTrend,
          summary: validSummary,
          monthReference: dashDataRaw[0].month,
          ceDettaglio: validCEDettaglio as any
        };

        setDashboardData(finalData);

      } catch (err) {
        console.error("Error loading dashboard data", err);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getDashboardData, getCEDettaglioData]);

  if (!selectedCompany) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader title="Dashboard Generale" subtitle="Analisi Bilanci" />
        <div className="p-8 bg-muted rounded-lg text-center">
          <p className="text-lg text-muted-foreground">Seleziona un'azienda per visualizzare i dati della dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader title="Dashboard Generale" subtitle="Analisi Bilanci" />
        <div className="p-8 bg-muted rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader title="Dashboard Generale" subtitle="Analisi Bilanci" />
        <div className="p-8 bg-muted rounded-lg text-center"><p className="text-lg text-muted-foreground">Dati non disponibili</p></div>
      </div>
    );
  }

  const { kpis, monthlyTrend, ceDettaglio, monthReference } = dashboardData;
  const monthName = monthReference ? new Date(0, monthReference - 1).toLocaleString('it-IT', { month: 'short' }) : "";
  const periodLabel = monthReference ? `(Gen-${monthName.charAt(0).toUpperCase() + monthName.slice(1)})` : "";

  // KPIs Logic - Derived Totals from CE Dettaglio (if available) for maximum accuracy
  const p25_raw = ceDettaglio?.progressivo2025;
  const p24_raw = ceDettaglio?.progressivo2024;
  
  // Total Expenses = Operating Costs + Ammortamenti + Financials + Taxes
  const derivedTotalCosts2025 = p25_raw ? (p25_raw.totaleCostiOperativi + (p25_raw.totaleAmmortamenti || 0) + (p25_raw.gestioneFinanziaria || 0) + (p25_raw.imposteDirette || 0)) : null;
  const derivedTotalCosts2024 = p24_raw ? (p24_raw.totaleCostiOperativi + (p24_raw.totaleAmmortamenti || 0) + (p24_raw.gestioneFinanziaria || 0) + (p24_raw.imposteDirette || 0)) : null;

  const safeKpis = {
    ricavi2025: kpis?.ricavi2025 || 0,
    costi2025: kpis?.costi2025 || (derivedTotalCosts2025 || 0),
    ebitda2025: kpis?.ebitda2025 || 0,
    risultato2025: kpis?.risultato2025 || 0,
    margineEbitda2025: kpis?.margineEbitda2025 || 0,
    ricavi2024: kpis?.ricavi2024 || 0,
    costi2024: kpis?.costi2024 || (derivedTotalCosts2024 || 0),
    ebitda2024: kpis?.ebitda2024 || 0,
    risultato2024: kpis?.risultato2024 || 0,
    margineEbitda2024: kpis?.margineEbitda2024 || 0,
  };

  const ricaviVariance = calculateVariance(safeKpis.ricavi2025, safeKpis.ricavi2024);
  const costsVariance = calculateVariance(safeKpis.costi2025, safeKpis.costi2024);
  const ebitdaVariance = calculateVariance(safeKpis.ebitda2025, safeKpis.ebitda2024);
  const resultVariance = calculateVariance(safeKpis.risultato2025, safeKpis.risultato2024);
  const marginVariance = safeKpis.margineEbitda2025 - safeKpis.margineEbitda2024;


  // CHART DATA
  const trendData = {
    labels: monthlyTrend?.labels || [],
    datasets: [
      {
        label: "Ricavi",
        data: monthlyTrend?.ricavi || [],
        borderColor: "#335C96",
        backgroundColor: "rgba(51, 92, 150, 0.1)",
        tension: 0.4,
      },
      {
        label: "EBITDA",
        data: monthlyTrend?.ebitda || [],
        borderColor: (monthlyTrend?.ebitda || []).some(v => v < 0) ? "#9e005c" : "#4A82BF",
        backgroundColor: (monthlyTrend?.ebitda || []).some(v => v < 0) ? "rgba(158, 0, 92, 0.1)" : "rgba(74, 130, 191, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const comparisonData = {
    labels: ["Ricavi", "EBITDA", "Risultato Esercizio"],
    datasets: [
      {
        label: `2024 ${periodLabel}`,
        data: [safeKpis.ricavi2024, safeKpis.ebitda2024, safeKpis.risultato2024],
        backgroundColor: "#9cbfe0",
      },
      {
        label: `2025 ${periodLabel}`,
        data: [safeKpis.ricavi2025, safeKpis.ebitda2025, safeKpis.risultato2025],
        backgroundColor: "#335C96",
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" as const } } };

  // TABLE DATA Construction (Based on CE Dettaglio structure + TOTALE COSTI)
  const columns = [
    { key: "voce", label: "Voce", align: "left" as const, className: "font-bold" },
    { key: "value2025", label: `2025 ${periodLabel}`, align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: `2024 ${periodLabel}`, align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  let tableData: any[] = [];
  
  if (dashboardData.summary && dashboardData.summary.length > 0) {
    // PRIORITÀ 1: RENDERING DINAMICO (Macro-aggregati concordati)
    const dynamicRows: any[] = [];
    const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", variance: "" };

    dashboardData.summary.forEach((row, idx) => {
        const variance = calculateVariance(row.value2025, row.value2024);
        const labelUpper = row.voce.toUpperCase();
        
        // Aggiungiamo spazio prima di EBITDA, EBIT e TOTALE COSTI
        if (labelUpper === 'EBITDA' || labelUpper === 'EBIT' || labelUpper.includes('TOTALE COSTI') || labelUpper.includes('RISULTATO')) {
          dynamicRows.push(emptyRow);
        }

        let className = "";
        if (row.type === 'result') className = "result";
        else if (row.type === 'key-metric') className = "key-metric";
        else if (row.type === 'total') className = "total-dark";
        else if (row.type === 'subtotal') className = "highlight";

        dynamicRows.push({
          voce: row.voce,
          value2025: formatCurrency(row.value2025),
          percentage: formatPercentage(row.percentage, 1),
          value2024: formatCurrency(row.value2024),
          variance: `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
          className
        });
      });
    tableData = dynamicRows;
  } else if (ceDettaglio && ceDettaglio.progressivo2025) {
    // PRIORITÀ 2: STRUTTURA HARDCODED (Modello Awentia)
    const p25 = ceDettaglio.progressivo2025;
    const p24 = ceDettaglio.progressivo2024;

    const createRow = (label: string, val25: number, val24: number, isBold = false, className = "") => {
      const perc = (val25 / p25.totaleRicavi) * 100;
      const variance = calculateVariance(val25, val24);
      return {
        voce: label,
        value2025: formatCurrency(val25),
        percentage: formatPercentage(perc, 1),
        value2024: formatCurrency(val24),
        variance: `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
        className: className || (isBold ? "font-bold" : "")
      };
    };

    const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", variance: "" };

    tableData = [
      createRow("TOTALE RICAVI", p25.totaleRicavi, p24.totaleRicavi, true, "total-dark"),
      emptyRow,
      createRow("Costi Diretti", p25.costiDiretti, p24.costiDiretti),
      createRow("Costi Indiretti", p25.costiIndiretti, p24.costiIndiretti),
      createRow("TOTALE COSTI DIRETTI E INDIRETTI", p25.totaleCostiDirettiIndiretti, p24.totaleCostiDirettiIndiretti, true, "total-dark"),
      createRow("GROSS PROFIT", p25.grossProfit, p24.grossProfit, true, "key-metric"),
      emptyRow,
      createRow("Altri Ricavi non Tipici", p25.ricaviNonTipici, p24.ricaviNonTipici),
      createRow("Spese Commerciali", p25.speseCommerciali, p24.speseCommerciali),
      createRow("Spese di Struttura", p25.speseStruttura, p24.speseStruttura),
      createRow("TOTALE GESTIONE STRUTTURA E NON TIPICA", p25.totaleGestioneStruttura, p24.totaleGestioneStruttura, true, "total-dark"),
      createRow("EBITDA", p25.ebitda, p24.ebitda, true, "key-metric"),
      emptyRow,
      createRow("Ammortamenti, Accantonamenti e Svalutazioni", p25.totaleAmmortamenti, p24.totaleAmmortamenti),
      createRow("Gestione Straordinaria", p25.gestioneStraordinaria, p24.gestioneStraordinaria),
      createRow("EBIT", p25.ebit, p24.ebit, true, "key-metric"),
      emptyRow,
      createRow("Gestione Finanziaria", p25.gestioneFinanziaria, p24.gestioneFinanziaria),
      createRow("EBT", p25.ebt, p24.ebt, true, "key-metric"),
      createRow("TOTALE COSTI", derivedTotalCosts2025 || 0, derivedTotalCosts2024 || 0, true, "total-dark"),
      createRow("RISULTATO DI ESERCIZIO", p25.risultatoEsercizio, p24.risultatoEsercizio, true, "result"),
    ];
  }


  return (
    <div data-testid="page-dashboard">
      <PageHeader title="Dashboard Generale" subtitle={`Analisi Bilanci ${periodLabel}`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <KPICard label="Ricavi 2025" description="Fatturato" value={formatCurrency(safeKpis.ricavi2025)} change={`${ricaviVariance >= 0 ? '+' : ''}${formatPercentage(ricaviVariance, 0)} vs 2024`} changeType={ricaviVariance >= 0 ? "positive" : "negative"} />
        <KPICard label="Costi 2025" description="Totale Costi" value={formatCurrency(safeKpis.costi2025)} change={`${costsVariance >= 0 ? '+' : ''}${formatPercentage(costsVariance, 0)} vs 2024`} changeType={costsVariance >= 0 ? "negative" : "positive"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard label="EBITDA 2025" description="MOL" value={formatCurrency(safeKpis.ebitda2025)} change={`${ebitdaVariance >= 0 ? '+' : ''}${formatPercentage(ebitdaVariance, 0)} vs 2024`} changeType={ebitdaVariance >= 0 ? "positive" : "negative"} />
        <KPICard label="Risultato 2025" description="Utile/Perdita" value={formatCurrency(safeKpis.risultato2025)} change={`${resultVariance >= 0 ? '+' : ''}${formatPercentage(resultVariance, 0)} vs 2024`} changeType={resultVariance >= 0 ? "positive" : "negative"} />
        <KPICard label="Margine EBITDA" description="% sui Ricavi" value={formatPercentage(safeKpis.margineEbitda2025)} change={`${marginVariance >= 0 ? '+' : ''}${formatPercentage(marginVariance, 1)} punti`} changeType={marginVariance >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Trend Ricavi vs EBITDA"><Line data={trendData} options={chartOptions} /></ChartCard>
        <ChartCard title="Confronto 2024 vs 2025"><Bar data={comparisonData} options={chartOptions} /></ChartCard>
      </div>

      <DataTable title="Dettaglio Economico" columns={columns} data={tableData} />
    </div>
  );
}

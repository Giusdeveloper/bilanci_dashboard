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
  monthReference?: number; // Added to carry the month info
  summary: Array<{
    voce: string;
    value2025: number;
    percentage: number;
    value2024: number;
  }>;
}

export default function Dashboard() {
  const { selectedCompany, getDashboardData } = useFinancialData();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset dashboardData quando selectedCompany cambia
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
        const data = await getDashboardData(selectedCompany.id);

        if (!data || data.length === 0 || !data[0] || !data[0].data) {
          console.warn("Nessun dato dashboard trovato nel DB o struttura vuota.");
          setDashboardData(null);
          return;
        }

        const dbData = data[0].data as any;
        console.log("Dati grezzi ricevuti dal DB (record data):", dbData);

        // Verifica e adatta la struttura dei dati
        // Struttura standard: kpis, monthlyTrend, summary
        if (dbData.kpis) {
          console.log("Trovata proprietà 'kpis'. Validazione...");

          // Accettiamo i dati anche se mancano monthlyTrend o summary, fornendo default
          const validKpis = dbData.kpis;
          const validMonthlyTrend = dbData.monthlyTrend || { labels: [], ricavi: [], ebitda: [] };
          const validSummary = dbData.summary || [];
          console.log("Dati Summary (Standard) estratti:", validSummary);

          // Costruiamo forzatamente l'oggetto corretto
          const finalData: DashboardData = {
            kpis: validKpis,
            monthlyTrend: validMonthlyTrend,
            summary: validSummary,
            monthReference: dbData.month // Extract month from the nested data object if stored there, OR
          };

          // Se il mese non è dentro "data", lo prendiamo dal record principale (data[0].month)
          // Nota: getDashboardData restituisce un array di record. dbData è data[0].data. 
          // Il mese è in data[0].month.
          const recordMonth = data[0].month;
          if (recordMonth) {
            finalData.monthReference = recordMonth;
          }

          console.log("Imposto dashboard data:", finalData);
          setDashboardData(finalData);
        } else if (dbData.trends || dbData.table) {
          console.log("Rilevata struttura alternativa (vecchio formato/Sherpa). Tento conversione...");

          // Conversione Trends -> MonthlyTrend
          let validMonthlyTrend = { labels: [], ricavi: [], ebitda: [] };
          if (dbData.trends) {
            // Caso 1: trends ha monthlyTrend annidato
            if (dbData.trends.monthlyTrend) {
              validMonthlyTrend = dbData.trends.monthlyTrend;
            }
            // Caso 2: trends ha direttamente le array
            else if (dbData.trends.labels) {
              validMonthlyTrend = {
                labels: dbData.trends.labels,
                ricavi: dbData.trends.ricavi || [],
                ebitda: dbData.trends.ebitda || []
              };
            }
          }

          // Conversione Table -> Summary
          let validSummary = dbData.table || [];

          // KPIs
          const validKpis = dbData.kpis || {
            ricavi2025: 0, ricavi2024: 0,
            costi2025: 0, costi2024: 0,
            ebitda2025: 0, ebitda2024: 0,
            risultato2025: 0, risultato2024: 0,
            margineEbitda2025: 0, margineEbitda2024: 0
          };

          const finalData: DashboardData = {
            kpis: validKpis,
            monthlyTrend: validMonthlyTrend as any,
            summary: validSummary,
            monthReference: dbData.month
          };

          const recordMonth = data[0].month;
          if (recordMonth) {
            finalData.monthReference = recordMonth;
          }

          console.log("Dati Sherpa42 convertiti:", finalData);
          setDashboardData(finalData);
        } else {
          console.warn("Formato dati sconosciuto:", dbData);
          setDashboardData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getDashboardData]);

  // Se nessuna azienda è selezionata, mostra un messaggio
  if (!selectedCompany) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader
          title="Dashboard Generale"
          subtitle="Analisi Bilanci al 31 Agosto 2025"
        />
        <div className="p-8 bg-muted rounded-lg text-center">
          <p className="text-lg text-muted-foreground">
            Seleziona un'azienda per visualizzare i dati della dashboard
          </p>
        </div>
      </div>
    );
  }

  // Se sta caricando, mostra loading
  if (loading) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader
          title="Dashboard Generale"
          subtitle="Analisi Bilanci al 31 Agosto 2025"
        />
        <div className="p-8 bg-muted rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  // Se non ci sono dati, mostra messaggio
  if (!dashboardData) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader
          title="Dashboard Generale"
          subtitle="Analisi Bilanci al 31 Agosto 2025"
        />
        <div className="p-8 bg-muted rounded-lg text-center">
          <p className="text-lg text-muted-foreground">Dati non disponibili</p>
          <p className="text-sm text-muted-foreground mt-2">
            {selectedCompany ? `Azienda selezionata: ${selectedCompany.name}` : 'Nessuna azienda selezionata'}
          </p>
        </div>
      </div>
    );
  }

  // Determine current month from stored reference or fallback to trend
  const monthRef = dashboardData?.monthReference;
  const monthName = monthRef ? new Date(0, monthRef - 1).toLocaleString('it-IT', { month: 'short' }) : "";

  // Helper variables for fallback
  const labels = dashboardData?.monthlyTrend?.labels || [];
  const lastMonthLabel = labels.length > 0 ? labels[labels.length - 1] : "Mese Corrente";

  // Se abbiamo un mese di riferimento esplicito (dal DB), usiamo quello.
  // Altrimenti fallback sulla logica delle label, ma con cautela.
  const periodLabel = monthRef
    ? `(Gen-${monthName.charAt(0).toUpperCase() + monthName.slice(1)})`
    : (labels.length > 0 ? `(Gen-${lastMonthLabel})` : "");

  const { kpis, monthlyTrend, summary } = dashboardData;

  // Override Costi if available in summary for specific request
  const costsRow = summary?.find(s => s.voce === "Totale Costi Diretti e Indiretti");

  // Assicurati che kpis esista e abbia le proprietà necessarie
  const safeKpis = {
    ricavi2025: kpis?.ricavi2025 ?? 0,
    ricavi2024: kpis?.ricavi2024 ?? 0,
    costi2025: costsRow ? costsRow.value2025 : (kpis?.costi2025 ?? 0),
    costi2024: costsRow ? costsRow.value2024 : (kpis?.costi2024 ?? 0),
    ebitda2025: kpis?.ebitda2025 ?? 0,
    ebitda2024: kpis?.ebitda2024 ?? 0,
    risultato2025: kpis?.risultato2025 ?? 0,
    risultato2024: kpis?.risultato2024 ?? 0,
    margineEbitda2025: kpis?.margineEbitda2025 ?? 0,
    margineEbitda2024: kpis?.margineEbitda2024 ?? 0,
  };

  const ricaviVariance = calculateVariance(safeKpis.ricavi2025, safeKpis.ricavi2024);
  const costiVariance = calculateVariance(safeKpis.costi2025, safeKpis.costi2024);
  const ebitdaVariance = calculateVariance(safeKpis.ebitda2025, safeKpis.ebitda2024);
  const risultatoVariance = calculateVariance(safeKpis.risultato2025, safeKpis.risultato2024);
  const margineVariance = safeKpis.margineEbitda2025 - safeKpis.margineEbitda2024;

  // Assicurati che monthlyTrend esista e abbia le proprietà necessarie
  const safeMonthlyTrend = monthlyTrend || {
    labels: [],
    ricavi: [],
    ebitda: []
  };

  const trendData = {
    labels: safeMonthlyTrend.labels || [],
    datasets: [
      {
        label: "Ricavi",
        data: safeMonthlyTrend.ricavi || [],
        borderColor: "#335C96", // Imment Blu medio vibrante
        backgroundColor: "rgba(51, 92, 150, 0.1)", // Versione trasparente
        tension: 0.4,
      },
      {
        label: "EBITDA",
        data: safeMonthlyTrend.ebitda || [],
        borderColor: (safeMonthlyTrend.ebitda || []).some(v => v < 0) ? "#9e005c" : "#4A82BF", // Magenta se negativo, blu chiaro se positivo
        backgroundColor: (safeMonthlyTrend.ebitda || []).some(v => v < 0) ? "rgba(158, 0, 92, 0.1)" : "rgba(74, 130, 191, 0.1)",
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
        backgroundColor: "#9cbfe0", // Imment Blu pastello per dati storici
      },
      {
        label: `2025 ${periodLabel}`,
        data: [safeKpis.ricavi2025, safeKpis.ebitda2025, safeKpis.risultato2025],
        backgroundColor: "#335C96", // Imment Blu medio vibrante per dati attuali
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const tableColumns = [
    { key: "voce", label: "Voce", align: "left" as const, className: "font-bold" },
    { key: "value2025", label: `2025 ${periodLabel}`, align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: `2024 ${periodLabel}`, align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  const safeSummary = summary || [];
  const tableData = safeSummary.map((row) => {
    const variance = calculateVariance(row.value2025, row.value2024);
    return {
      voce: row.voce,
      value2025: formatCurrency(row.value2025),
      percentage: formatPercentage(row.percentage),
      value2024: formatCurrency(row.value2024),
      variance: `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
    };
  });

  // Se nessuna azienda è selezionata, mostra un messaggio
  if (!selectedCompany) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader
          title="Dashboard Generale"
          subtitle={`Analisi Bilanci ${periodLabel}`}
        />
        <div className="p-8 bg-muted rounded-lg text-center">
          <p className="text-lg text-muted-foreground">
            Seleziona un'azienda per visualizzare i dati della dashboard
          </p>
        </div>
      </div>
    );
  }

  console.log("Dati finali tabella (TableData):", tableData);

  return (
    <div data-testid="page-dashboard">
      <PageHeader
        title="Dashboard Generale"
        subtitle={`Analisi Bilanci ${periodLabel}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <KPICard
          label="Ricavi 2025"
          description="Fatturato complessivo cumulato"
          value={formatCurrency(safeKpis.ricavi2025)}
          change={`${ricaviVariance >= 0 ? '+' : ''}${formatPercentage(ricaviVariance, 0)} vs 2024`}
          changeType={ricaviVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard
          label="Costi 2025"
          value={formatCurrency(safeKpis.costi2025)}
          change={`${costiVariance >= 0 ? '+' : ''}${formatPercentage(costiVariance, 0)} vs 2024`}
          changeType={costiVariance >= 0 ? "negative" : "positive"}
          description="Totale Costi 2025"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard
          label="EBITDA 2025"
          description="Margine operativo lordo"
          value={formatCurrency(safeKpis.ebitda2025)}
          change={`${ebitdaVariance >= 0 ? '+' : ''}${formatPercentage(ebitdaVariance, 0)} vs 2024`}
          changeType={ebitdaVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard
          label="Risultato esercizio 2025"
          description="Utile o Perdita netta"
          value={formatCurrency(safeKpis.risultato2025)}
          change={`${risultatoVariance >= 0 ? '+' : ''}${formatPercentage(risultatoVariance, 0)} vs 2024`}
          changeType={risultatoVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard
          label="Margine EBITDA"
          description="EBITDA in % sui Ricavi"
          value={formatPercentage(safeKpis.margineEbitda2025)}
          change={`${margineVariance >= 0 ? '+' : ''}${formatPercentage(margineVariance, 1)} punti`}
          changeType={margineVariance >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Trend Ricavi vs EBITDA">
          <Line data={trendData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Confronto 2024 vs 2025">
          <Bar data={comparisonData} options={chartOptions} />
        </ChartCard>
      </div>

      <DataTable
        title="Riepilogo Economico"
        columns={tableColumns}
        data={tableData.map(row => {
          // Dynamic styling based on content
          const isTotal = row.voce.toLowerCase().includes('totale') || row.voce.includes('COSTI');
          const isKeyMetric = ['EBITDA', 'EBIT', 'Gross Profit'].some(k => row.voce.includes(k));
          const isResult = row.voce.toLowerCase().includes('risultato') || row.voce.toLowerCase().includes('utile');

          let className = "";
          if (isResult) className = "result";
          else if (isKeyMetric) className = "key-metric";
          else if (isTotal) className = "total-dark";

          return { ...row, className };
        })}
      />
    </div>
  );
}

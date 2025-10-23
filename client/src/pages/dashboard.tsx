import React, { useState, useEffect } from "react";
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
import { fallbackData } from "@/data/csvData";
import { Building2 } from "lucide-react";

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

export default function Dashboard() {
  const [allMonthsData, setAllMonthsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Carica i dati di fallback al mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Usa direttamente i dati di fallback per evitare problemi con file CSV
        setAllMonthsData(fallbackData);
      } catch (error) {
        console.error('Errore nel caricamento dati:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calcola i KPIs dai dati
  const calculateKPIs = () => {
    if (!allMonthsData) return null;
    
    const agosto2025 = allMonthsData.agosto?.progressivo2025;
    const agosto2024 = allMonthsData.agosto?.progressivo2024;
    
    if (!agosto2025 || !agosto2024) return null;

    return {
      ricavi2025: agosto2025.totaleRicavi,
      ricavi2024: agosto2024.totaleRicavi,
      costi2025: agosto2025.totaleCostiDirettiIndiretti,
      costi2024: agosto2024.totaleCostiDirettiIndiretti,
      ebitda2025: agosto2025.ebitda,
      ebitda2024: agosto2024.ebitda,
      risultato2025: agosto2025.risultatoEsercizio,
      risultato2024: agosto2024.risultatoEsercizio,
      margineEbitda2025: agosto2025.totaleRicavi > 0 ? (agosto2025.ebitda / agosto2025.totaleRicavi) * 100 : 0,
      margineEbitda2024: agosto2024.totaleRicavi > 0 ? (agosto2024.ebitda / agosto2024.totaleRicavi) * 100 : 0,
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader 
          title="Dashboard" 
          subtitle="Caricamento dati in corso..."
        />
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div data-testid="page-dashboard">
        <PageHeader 
          title="Dashboard" 
          subtitle="Errore nel caricamento dati"
        />
        <div className="text-center p-8">
          <p className="text-red-600">Errore nel caricamento dei dati della dashboard</p>
        </div>
      </div>
    );
  }

  const ricaviVariance = calculateVariance(kpis.ricavi2025, kpis.ricavi2024);
  const costiVariance = calculateVariance(kpis.costi2025, kpis.costi2024);
  const ebitdaVariance = calculateVariance(kpis.ebitda2025, kpis.ebitda2024);
  const risultatoVariance = calculateVariance(kpis.risultato2025, kpis.risultato2024);
  const margineVariance = kpis.margineEbitda2025 - kpis.margineEbitda2024;

  // Calcola i dati del trend dai dati dinamici
  const calculateTrendData = () => {
    if (!allMonthsData) return { labels: [], ricavi: [], ebitda: [] };
    
    const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"];
    const monthKeys = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto"];
    
    const ricavi = monthKeys.map(monthKey => {
      const monthData = allMonthsData[monthKey]?.progressivo2025;
      return monthData?.totaleRicavi || 0;
    });
    
    const ebitda = monthKeys.map(monthKey => {
      const monthData = allMonthsData[monthKey]?.progressivo2025;
      return monthData?.ebitda || 0;
    });
    
    return { labels: months, ricavi, ebitda };
  };

  const trendData = calculateTrendData();

  const chartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: "Ricavi",
        data: trendData.ricavi,
        borderColor: "hsl(243, 75%, 59%)",
        backgroundColor: "hsl(243, 75%, 59%, 0.1)",
        tension: 0.4,
      },
      {
        label: "EBITDA",
        data: trendData.ebitda,
        borderColor: "hsl(142, 76%, 36%)",
        backgroundColor: "hsl(142, 76%, 36%, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const comparisonData = {
    labels: ["Ricavi", "EBITDA", "Risultato Esercizio"],
    datasets: [
      {
        label: "2024 (Gen-Ago)",
        data: [kpis.ricavi2024, kpis.ebitda2024, kpis.risultato2024],
        backgroundColor: "hsl(220, 9%, 46%)",
      },
      {
        label: "2025 (Gen-Ago)",
        data: [kpis.ricavi2025, kpis.ebitda2025, kpis.risultato2025],
        backgroundColor: "hsl(243, 75%, 59%)",
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
    { key: "value2025", label: "2025 (Gen-Ago)", align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: "2024 (Gen-Ago)", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  // Calcola i dati della tabella dai dati dinamici
  const calculateTableData = () => {
    if (!allMonthsData) return [];
    
    const agosto2025 = allMonthsData.agosto?.progressivo2025;
    const agosto2024 = allMonthsData.agosto?.progressivo2024;
    if (!agosto2025 || !agosto2024) return [];
    
    const summary = [
      {
        voce: "Totale Ricavi",
        value2025: agosto2025.totaleRicavi,
        value2024: agosto2024.totaleRicavi,
        percentage: 100,
      },
      {
        voce: "Costi Diretti",
        value2025: agosto2025.costiDiretti,
        value2024: agosto2024.costiDiretti,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.costiDiretti / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Costi Indiretti",
        value2025: agosto2025.costiIndiretti,
        value2024: agosto2024.costiIndiretti,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.costiIndiretti / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Totale Costi Diretti e Indiretti",
        value2025: agosto2025.totaleCostiDirettiIndiretti,
        value2024: agosto2024.totaleCostiDirettiIndiretti,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.totaleCostiDirettiIndiretti / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Gross Profit",
        value2025: agosto2025.grossProfit,
        value2024: agosto2024.grossProfit,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.grossProfit / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Spese Commerciali",
        value2025: agosto2025.speseCommerciali,
        value2024: agosto2024.speseCommerciali,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.speseCommerciali / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Personale",
        value2025: agosto2025.personale,
        value2024: agosto2024.personale,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.personale / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Compensi Amministratore",
        value2025: agosto2025.compensiAmministratore,
        value2024: agosto2024.compensiAmministratore,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.compensiAmministratore / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "EBITDA",
        value2025: agosto2025.ebitda,
        value2024: agosto2024.ebitda,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.ebitda / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Ammortamenti",
        value2025: agosto2025.totaleAmmortamenti,
        value2024: agosto2024.totaleAmmortamenti,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.totaleAmmortamenti / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "EBIT",
        value2025: agosto2025.ebit,
        value2024: agosto2024.ebit,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.ebit / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Gestione Finanziaria",
        value2025: agosto2025.gestioneFinanziaria,
        value2024: agosto2024.gestioneFinanziaria,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.gestioneFinanziaria / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Risultato ante Imposte",
        value2025: agosto2025.ebt,
        value2024: agosto2024.ebt,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.ebt / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Imposte",
        value2025: agosto2025.imposteDirette,
        value2024: agosto2024.imposteDirette,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.imposteDirette / agosto2025.totaleRicavi) * 100 : 0,
      },
      {
        voce: "Risultato dell'Esercizio",
        value2025: agosto2025.risultatoEsercizio,
        value2024: agosto2024.risultatoEsercizio,
        percentage: agosto2025.totaleRicavi > 0 ? (agosto2025.risultatoEsercizio / agosto2025.totaleRicavi) * 100 : 0,
      },
    ];
    
    return summary.map((row) => {
      const variance = calculateVariance(row.value2025, row.value2024);
      return {
        voce: row.voce,
        value2025: formatCurrency(row.value2025),
        percentage: formatPercentage(row.percentage),
        value2024: formatCurrency(row.value2024),
        variance: `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
      };
    });
  };

  const tableData = calculateTableData();

  return (
    <div data-testid="page-dashboard">
      <PageHeader 
        title="Dashboard Generale" 
        subtitle="Analisi Bilanci al 31 Agosto 2025"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <KPICard 
          label="Ricavi 2025" 
          value={formatCurrency(kpis.ricavi2025)}
          change={`${ricaviVariance >= 0 ? '+' : ''}${formatPercentage(ricaviVariance, 0)} vs 2024`}
          changeType={ricaviVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="Costi 2025" 
          value={formatCurrency(kpis.costi2025)}
          change={`${costiVariance >= 0 ? '+' : ''}${formatPercentage(costiVariance, 0)} vs 2024`}
          changeType={costiVariance >= 0 ? "negative" : "positive"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard 
          label="EBITDA 2025" 
          value={formatCurrency(kpis.ebitda2025)}
          change={`${ebitdaVariance >= 0 ? '+' : ''}${formatPercentage(ebitdaVariance, 0)} vs 2024`}
          changeType={ebitdaVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="Risultato esercizio 2025" 
          value={formatCurrency(kpis.risultato2025)}
          change={`${risultatoVariance >= 0 ? '+' : ''}${formatPercentage(risultatoVariance, 0)} vs 2024`}
          changeType={risultatoVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="Margine EBITDA" 
          value={formatPercentage(kpis.margineEbitda2025)}
          change={`${margineVariance >= 0 ? '+' : ''}${formatPercentage(margineVariance, 1)} punti`}
          changeType={margineVariance >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Trend Ricavi vs EBITDA">
          <Line data={chartData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Confronto 2024 vs 2025">
          <Bar data={comparisonData} options={chartOptions} />
        </ChartCard>
      </div>

      <DataTable 
        title="Riepilogo Economico" 
        columns={tableColumns} 
        data={tableData}
        totalRows={[0, 3, 8, 10, 12, 14]}
      />
    </div>
  );
}

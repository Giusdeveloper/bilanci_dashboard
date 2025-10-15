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
import { financialData, formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";

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
  const { kpis, monthlyTrend, summary } = financialData.dashboard;

  const ricaviVariance = calculateVariance(kpis.ricavi2025, kpis.ricavi2024);
  const ebitdaVariance = calculateVariance(kpis.ebitda2025, kpis.ebitda2024);
  const risultatoVariance = calculateVariance(kpis.risultato2025, kpis.risultato2024);
  const margineVariance = kpis.margineEbitda2025 - kpis.margineEbitda2024;

  const trendData = {
    labels: monthlyTrend.labels,
    datasets: [
      {
        label: "Ricavi",
        data: monthlyTrend.ricavi,
        borderColor: "hsl(243, 75%, 59%)",
        backgroundColor: "hsl(243, 75%, 59%, 0.1)",
        tension: 0.4,
      },
      {
        label: "EBITDA",
        data: monthlyTrend.ebitda,
        borderColor: "hsl(142, 76%, 36%)",
        backgroundColor: "hsl(142, 76%, 36%, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const comparisonData = {
    labels: ["Ricavi", "EBITDA", "Risultato"],
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

  const tableData = summary.map((row) => {
    const variance = calculateVariance(row.value2025, row.value2024);
    return {
      voce: row.voce,
      value2025: formatCurrency(row.value2025),
      percentage: formatPercentage(row.percentage),
      value2024: formatCurrency(row.value2024),
      variance: `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
    };
  });

  return (
    <div data-testid="page-dashboard">
      <PageHeader 
        title="Dashboard Generale" 
        subtitle="Analisi Bilanci al 31 Agosto 2025"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          label="Ricavi 2025" 
          value={formatCurrency(kpis.ricavi2025)}
          change={`${ricaviVariance >= 0 ? '+' : ''}${formatPercentage(ricaviVariance, 0)} vs 2024`}
          changeType={ricaviVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="EBITDA 2025" 
          value={formatCurrency(kpis.ebitda2025)}
          change={`${ebitdaVariance >= 0 ? '+' : ''}${formatPercentage(ebitdaVariance, 0)} vs 2024`}
          changeType={ebitdaVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="Risultato 2025" 
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
          <Line data={trendData} options={chartOptions} />
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

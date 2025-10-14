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
  //todo: remove mock functionality
  const trendData = {
    labels: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"],
    datasets: [
      {
        label: "Ricavi",
        data: [5200, 6800, 7100, 8900, 9200, 7100, 5800, 6400],
        borderColor: "hsl(243, 75%, 59%)",
        backgroundColor: "hsl(243, 75%, 59%, 0.1)",
        tension: 0.4,
      },
      {
        label: "EBITDA",
        data: [4100, 5500, 5800, 7300, 7500, 5900, 4800, 5271],
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
        data: [8733, 9293, 8893],
        backgroundColor: "hsl(220, 9%, 46%)",
      },
      {
        label: "2025 (Gen-Ago)",
        data: [56600, 45971, 41439],
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
        beginAtZero: true,
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

  const tableData = [
    {
      voce: "Ricavi",
      value2025: "€ 56.600,36",
      percentage: "100,0%",
      value2024: "€ 8.733,00",
      variance: "+548,3%",
    },
    {
      voce: "Costi Servizi",
      value2025: "€ 9.092,05",
      percentage: "16,1%",
      value2024: "€ 19.535,00",
      variance: "-53,5%",
    },
    {
      voce: "Costi Personale",
      value2025: "€ 1.537,20",
      percentage: "2,7%",
      value2024: "€ 0,00",
      variance: "+100,0%",
    },
    {
      voce: "EBITDA",
      value2025: "€ 45.971,11",
      percentage: "81,2%",
      value2024: "€ 9.293,00",
      variance: "+395,0%",
    },
    {
      voce: "Ammortamenti",
      value2025: "€ 4.532,00",
      percentage: "8,0%",
      value2024: "€ 400,00",
      variance: "+1033,0%",
    },
    {
      voce: "Risultato Operativo",
      value2025: "€ 41.439,11",
      percentage: "73,2%",
      value2024: "€ 8.893,00",
      variance: "+366,0%",
    },
  ];

  return (
    <div data-testid="page-dashboard">
      <PageHeader 
        title="Dashboard Generale" 
        subtitle="Analisi Bilanci al 31 Agosto 2025"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          label="Ricavi 2025" 
          value="€ 56.600" 
          change="+548% vs 2024"
          changeType="positive"
        />
        <KPICard 
          label="EBITDA 2025" 
          value="€ 45.971" 
          change="+395% vs 2024"
          changeType="positive"
        />
        <KPICard 
          label="Risultato 2025" 
          value="€ 41.439" 
          change="+366% vs 2024"
          changeType="positive"
        />
        <KPICard 
          label="Margine EBITDA" 
          value="81,2%" 
          change="+60,5 punti"
          changeType="positive"
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
        totalRows={[3, 5]}
      />
    </div>
  );
}

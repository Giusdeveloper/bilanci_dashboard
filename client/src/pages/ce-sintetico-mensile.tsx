import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import ChartCard from "@/components/ChartCard";
import { Line } from "react-chartjs-2";

export default function CESinteticoMensile() {
  //todo: remove mock functionality
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"];
  
  const data = [
    {
      voce: "Ricavi",
      gen: "5.200",
      feb: "6.800",
      mar: "7.100",
      apr: "8.900",
      mag: "9.200",
      giu: "7.100",
      lug: "5.800",
      ago: "6.400",
      total: "56.600",
    },
    {
      voce: "Costi Totali",
      gen: "1.516",
      feb: "1.666",
      mar: "1.616",
      apr: "2.278",
      mag: "2.428",
      giu: "1.837",
      lug: "1.687",
      ago: "2.133",
      total: "15.161",
    },
    {
      voce: "EBITDA",
      gen: "4.250",
      feb: "5.700",
      mar: "6.050",
      apr: "7.188",
      mag: "7.338",
      giu: "5.829",
      lug: "4.679",
      ago: "4.837",
      total: "45.971",
    },
    {
      voce: "Margine %",
      gen: "81,7%",
      feb: "83,8%",
      mar: "85,2%",
      apr: "80,8%",
      mag: "79,8%",
      giu: "82,1%",
      lug: "80,7%",
      ago: "75,6%",
      total: "81,2%",
    },
  ];

  const trendData = {
    labels: months,
    datasets: [
      {
        label: "Margine EBITDA %",
        data: [81.7, 83.8, 85.2, 80.8, 79.8, 82.1, 80.7, 75.6],
        borderColor: "hsl(243, 75%, 59%)",
        backgroundColor: "hsl(243, 75%, 59%, 0.1)",
        tension: 0.4,
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
        min: 70,
        max: 90,
        ticks: {
          callback: (value: any) => value + "%",
        },
      },
    },
  };

  return (
    <div data-testid="page-ce-sintetico-mensile">
      <PageHeader 
        title="CE Sintetico Mensile" 
        subtitle="Andamento mensile degli aggregati economici principali"
      />

      <div className="mb-8">
        <ChartCard title="Trend Margine EBITDA Mensile">
          <Line data={trendData} options={chartOptions} />
        </ChartCard>
      </div>

      <Card className="p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-5">Riepilogo Mensile Sintetico</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 bg-muted z-10">
                  Voce
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-right whitespace-nowrap"
                  >
                    {month}
                  </th>
                ))}
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-right font-bold">
                  Totale/Media
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const isTotal = idx === 2;
                const isPercentage = idx === 3;
                const rowClassName = isTotal 
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                  : "hover:bg-muted/50";

                return (
                  <tr key={idx} className={rowClassName}>
                    <td className="px-3 py-3 text-sm border-b border-border font-semibold sticky left-0 bg-card">
                      {row.voce}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.gen : `€ ${row.gen}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.feb : `€ ${row.feb}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.mar : `€ ${row.mar}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.apr : `€ ${row.apr}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.mag : `€ ${row.mag}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.giu : `€ ${row.giu}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.lug : `€ ${row.lug}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">
                      {isPercentage ? row.ago : `€ ${row.ago}`}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right font-bold bg-blue-50 dark:bg-blue-950/20">
                      {isPercentage ? row.total : `€ ${row.total}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

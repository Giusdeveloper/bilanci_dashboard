import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import ChartCard from "@/components/ChartCard";
import { Line } from "react-chartjs-2";
import { financialData, formatCurrency } from "@/data/financialData";

export default function CESinteticoMensile() {
  const { progressivo2025 } = financialData.ceSinteticoMensile;
  const months = progressivo2025.months;

  const createRowData = (label: string, values: number[], isPercentage = false, isBold = false, isHighlight = false) => ({
    voce: label,
    values: isPercentage 
      ? values.map((v) => `${((v / values[values.length - 1]) * 100).toFixed(1)}%`) 
      : values.map((v) => formatCurrency(v).replace("€", "").trim()),
    total: isPercentage 
      ? "n/a" 
      : formatCurrency(values[values.length - 1]).replace("€", "").trim(),
    isPercentage,
    isBold,
    isHighlight,
  });

  const marginValues = progressivo2025.grossProfit.map((gp, i) => 
    (gp / progressivo2025.totaleRicavi[i]) * 100
  );

  const data = [
    createRowData("Ricavi caratteristici", progressivo2025.ricaviCaratteristici),
    createRowData("Altri ricavi", progressivo2025.altriRicavi),
    createRowData("TOTALE RICAVI", progressivo2025.totaleRicavi, false, true, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false, isHighlight: false },
    createRowData("Costi diretti", progressivo2025.costiDiretti),
    createRowData("Costi indiretti", progressivo2025.costiIndiretti),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", progressivo2025.totaleCostiDirettiIndiretti, false, true, true),
    createRowData("GROSS PROFIT", progressivo2025.grossProfit, false, true, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false, isHighlight: false },
    createRowData("Costi commerciali", progressivo2025.costiCommerciali),
    createRowData("Personale", progressivo2025.personale),
    createRowData("Compensi amministratore", progressivo2025.compensiAmministratore),
    createRowData("Rimborsi amministratore", progressivo2025.rimborsiAmministratore),
    createRowData("Servizi contabili e paghe", progressivo2025.serviziContabiliPaghe),
    createRowData("Consulenze legali", progressivo2025.consulenzeLegali),
    createRowData("Consulenze tecniche", progressivo2025.consulenzeTecniche),
    createRowData("Altre spese di funzionamento", progressivo2025.altreSpeseFunzionamento),
    createRowData("TOTALE STRUTTURA", progressivo2025.totaleStruttura, false, true, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false, isHighlight: false },
    createRowData("EBITDA", progressivo2025.ebitda, false, true, true),
    createRowData("Ammortamenti e svalutazioni", progressivo2025.ammortamentiSvalutazioni),
    createRowData("Gestione finanziaria", progressivo2025.gestioneFinanziaria),
    createRowData("RISULTATO ANTE IMPOSTE", progressivo2025.risultatoAnteImposte, false, true, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false, isHighlight: false },
    { 
      voce: "Margine Gross Profit %", 
      values: marginValues.map(v => v.toFixed(1) + '%'),
      total: ((progressivo2025.grossProfit[7] / progressivo2025.totaleRicavi[7]) * 100).toFixed(1) + '%',
      isPercentage: true, 
      isBold: true, 
      isHighlight: true 
    },
  ];

  const trendData = {
    labels: months,
    datasets: [
      {
        label: "Margine Gross Profit %",
        data: marginValues,
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
        subtitle="Andamento mensile degli aggregati economici principali (Progressivi)"
      />

      <div className="mb-8">
        <ChartCard title="Trend Margine Gross Profit Mensile">
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
                  Ago (Finale)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                if (row.voce === "") {
                  return (
                    <tr key={idx}>
                      <td colSpan={10} className="py-1"></td>
                    </tr>
                  );
                }

                const rowClassName = row.isHighlight
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                  : row.isBold
                  ? "font-bold"
                  : "hover:bg-muted/50";

                return (
                  <tr key={idx} className={rowClassName}>
                    <td className="px-3 py-3 text-sm border-b border-border font-semibold sticky left-0 bg-card">
                      {row.voce}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">
                        {row.isPercentage ? value : `€ ${value}`}
                      </td>
                    ))}
                    <td className={`px-3 py-3 text-sm border-b border-border text-right font-bold whitespace-nowrap ${row.isHighlight ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted/30'}`}>
                      {row.isPercentage ? row.total : `€ ${row.total}`}
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

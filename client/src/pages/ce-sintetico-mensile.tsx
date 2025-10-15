import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import ChartCard from "@/components/ChartCard";
import { Line } from "react-chartjs-2";
import { financialData, formatCurrency } from "@/data/financialData";

export default function CESinteticoMensile() {
  const { progressivo2025 } = financialData.ceSinteticoMensile;
  const months = progressivo2025.months;

  const createRowData = (label: string, values: number[], isPercentage = false, isBold = false) => ({
    voce: label,
    values: isPercentage 
      ? values.map((v) => `${((v / values[values.length - 1]) * 100).toFixed(1)}%`) 
      : values.map((v) => formatCurrency(v).replace("€", "").trim()),
    total: isPercentage 
      ? "n/a" 
      : formatCurrency(values[values.length - 1]).replace("€", "").trim(),
    isPercentage,
    isBold,
  });

  const marginValues = progressivo2025.grossProfit.map((gp, i) => 
    (gp / progressivo2025.totaleRicavi[i]) * 100
  );

  const data = [
    createRowData("Ricavi caratteristici", progressivo2025.ricaviCaratteristici),
    createRowData("Altri ricavi", progressivo2025.altriRicavi),
    createRowData("TOTALE RICAVI", progressivo2025.totaleRicavi, false, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false },
    createRowData("Servizi diretti", progressivo2025.serviziDiretti),
    createRowData("Consulenze dirette", progressivo2025.consulenzeDirette),
    createRowData("Servizi informatici web", progressivo2025.serviziInformaticiWeb),
    createRowData("Servizi cloud", progressivo2025.serviziCloud),
    createRowData("COSTI DIRETTI", progressivo2025.costiDiretti, false, true),
    createRowData("Beni strumentali", progressivo2025.beniStrumentali),
    createRowData("Spese per manutenzione", progressivo2025.speseManutenzione),
    createRowData("Altri servizi e prestazioni", progressivo2025.altriServiziPrestazioni),
    createRowData("COSTI INDIRETTI", progressivo2025.costiIndiretti, false, true),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", progressivo2025.totaleCostiDirettiIndiretti, false, true),
    createRowData("GROSS PROFIT", progressivo2025.grossProfit, false, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false },
    createRowData("Ricavi non tipici", progressivo2025.ricaviNonTipici),
    createRowData("Costi commerciali", progressivo2025.costiCommerciali),
    createRowData("Personale", progressivo2025.personale),
    createRowData("Compensi amministratore", progressivo2025.compensiAmministratore),
    createRowData("Rimborsi amministratore", progressivo2025.rimborsiAmministratore),
    createRowData("Servizi contabili e paghe", progressivo2025.serviziContabiliPaghe),
    createRowData("Consulenze legali", progressivo2025.consulenzeLegali),
    createRowData("Consulenze tecniche", progressivo2025.consulenzeTecniche),
    createRowData("Altre spese di funzionamento", progressivo2025.altreSpeseFunzionamento),
    createRowData("TOTALE STRUTTURA", progressivo2025.totaleStruttura, false, true),
    createRowData("EBITDA", progressivo2025.ebitda, false, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false },
    createRowData("Ammortamenti e svalutazioni", progressivo2025.ammortamentiSvalutazioni),
    createRowData("Gestione straordinaria", progressivo2025.gestioneStraordinaria),
    createRowData("Gestione finanziaria", progressivo2025.gestioneFinanziaria),
    createRowData("TOTALE ALTRE VOCI NON TIPICHE", progressivo2025.totaleAltreVociNonTipiche, false, true),
    createRowData("RISULTATO ANTE IMPOSTE", progressivo2025.risultatoAnteImposte, false, true),
    createRowData("Imposte", progressivo2025.imposte),
    createRowData("RISULTATO DELL'ESERCIZIO", progressivo2025.risultatoEsercizio, false, true),
    { voce: "", values: [], total: "", isPercentage: false, isBold: false },
    { 
      voce: "Margine Gross Profit %", 
      values: marginValues.map(v => v.toFixed(1) + '%'),
      total: ((progressivo2025.grossProfit[7] / progressivo2025.totaleRicavi[7]) * 100).toFixed(1) + '%',
      isPercentage: true, 
      isBold: true
    },
  ];

  const totalRows = [2, 8, 12, 13, 25, 31];
  const keyMetricRows = [14, 26, 32];
  const resultRow = [34];

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
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 bg-muted z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
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

                const isTotal = totalRows.includes(idx);
                const isKeyMetric = keyMetricRows.includes(idx);
                const isResult = resultRow.includes(idx);

                const rowClassName = isResult
                  ? "bg-yellow-50 dark:bg-yellow-950/20 font-bold"
                  : isKeyMetric
                  ? "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  : isTotal
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold"
                  : row.isBold
                  ? "font-bold"
                  : "hover:bg-muted/50";

                const cellBg = isResult
                  ? "bg-yellow-50 dark:bg-yellow-950/20"
                  : isKeyMetric
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : isTotal
                  ? "bg-blue-50 dark:bg-blue-950/20"
                  : "bg-card";

                return (
                  <tr key={idx} className={rowClassName}>
                    <td className={`px-3 py-3 text-sm border-b border-border ${row.isBold ? 'font-semibold' : ''} sticky left-0 z-20 ${cellBg} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>
                      {row.voce}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">
                        {row.isPercentage ? value : `€ ${value}`}
                      </td>
                    ))}
                    <td className={`px-3 py-3 text-sm border-b border-border text-right font-bold whitespace-nowrap ${isResult ? 'bg-yellow-100 dark:bg-yellow-900/30' : isKeyMetric ? 'bg-blue-150 dark:bg-blue-800/40' : isTotal ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted/30'}`}>
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

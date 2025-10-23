import React from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import ChartCard from "@/components/ChartCard";
import { Line } from "react-chartjs-2";
import { formatCurrency } from "@/data/financialData";
import { getAllMonthsData } from "@/data/csvData";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function CESinteticoMensilePuntuale() {
  const [allMonthsData, setAllMonthsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getAllMonthsData();
        setAllMonthsData(data);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const monthKeys = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  const createRowData = (label: string, field: string, isPercentage = false, isBold = false) => {
    if (!allMonthsData) return { voce: label, values: [], isPercentage, isBold };
    
    const values = monthKeys.map(monthKey => {
      const monthData = allMonthsData[monthKey]?.puntuale2025;
      return monthData ? monthData[field] || 0 : 0;
    });

    return {
      voce: label,
      values: isPercentage 
        ? values.map((v) => `${((v / values[values.length - 1]) * 100).toFixed(1)}%`) 
        : values.map((v) => formatCurrency(v).replace("€", "").trim()),
      isPercentage,
      isBold,
    };
  };

  const marginValues = allMonthsData ? monthKeys.map(monthKey => {
    const monthData = allMonthsData[monthKey]?.puntuale2025;
    const grossProfit = monthData?.grossProfit || 0;
    const totaleRicavi = monthData?.totaleRicavi || 1;
    return (grossProfit / totaleRicavi) * 100;
  }) : [];

  const data = [
    createRowData("Ricavi caratteristici", "ricaviCaratteristici"),
    createRowData("Altri ricavi", "altriRicavi"),
    createRowData("TOTALE RICAVI", "totaleRicavi", false, true),
    { voce: "", values: [], isPercentage: false, isBold: false },
    createRowData("Servizi diretti", "serviziDiretti"),
    createRowData("Consulenze dirette", "consulenzeDirette"),
    createRowData("Servizi informatici web", "serviziInformatici"),
    createRowData("Servizi cloud", "serviziCloud"),
    createRowData("COSTI DIRETTI", "costiDiretti", false, true),
    createRowData("Altri servizi e prestazioni", "altriServizi"),
    createRowData("COSTI INDIRETTI", "costiIndiretti", false, true),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", "totaleCostiDirettiIndiretti", false, true),
    createRowData("GROSS PROFIT", "grossProfit", false, true),
    { voce: "", values: [], isPercentage: false, isBold: false },
    createRowData("Ricavi non tipici", "ricaviNonTipici"),
    createRowData("Spese commerciali", "speseCommerciali"),
    createRowData("Personale", "personale"),
    createRowData("Compensi amministratore", "compensiAmministratore"),
    createRowData("Rimborsi amministratore", "rimborsiAmministratore"),
    createRowData("Servizi amministrativi contabilità", "serviziAmministrativi"),
    createRowData("Consulenze legali", "consulenzeLegali"),
    createRowData("Consulenze tecniche", "consulenzeTecniche"),
    createRowData("Altre spese di funzionamento", "speseStruttura"),
    createRowData("TOTALE STRUTTURA", "totaleGestioneStruttura", false, true),
    createRowData("EBITDA", "ebitda", false, true),
    { voce: "", values: [], isPercentage: false, isBold: false },
    createRowData("Ammortamenti e svalutazioni", "totaleAmmortamenti"),
    createRowData("Gestione straordinaria", "gestioneStraordinaria"),
    createRowData("Gestione finanziaria", "gestioneFinanziaria"),
    createRowData("TOTALE ALTRE VOCI NON TIPICHE", "totaleGestioneStruttura", false, true),
    createRowData("RISULTATO ANTE IMPOSTE", "ebt", false, true),
    createRowData("Imposte", "imposteDirette"),
    createRowData("RISULTATO DELL'ESERCIZIO", "risultatoEsercizio", false, true),
    { voce: "", values: [], isPercentage: false, isBold: false },
    { 
      voce: "Margine Gross Profit %", 
      values: marginValues.map(v => v.toFixed(1) + '%'),
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

  if (loading) {
    return (
      <div data-testid="page-ce-sintetico-mensile-puntuale">
        <PageHeader 
          title="CE Sintetico Mensile - Puntuale" 
          subtitle="Caricamento dati in corso..."
        />
        <Card className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento dati sintetici mensili puntuali...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="page-ce-sintetico-mensile-puntuale">
      <PageHeader 
        title="CE Sintetico Mensile - Puntuale" 
        subtitle="Andamento mensile degli aggregati economici principali (Puntuali)"
      />

      <div className="mb-6 flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/ce-sintetico-mensile")}
        >
          ← Torna al Progressivo
        </Button>
      </div>

      <div className="mb-8">
        <ChartCard title="Trend Margine Gross Profit Mensile (Puntuale)">
          <Line data={trendData} options={chartOptions} />
        </ChartCard>
      </div>

      <Card className="p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-5">Riepilogo Mensile Sintetico - Puntuale</h3>
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
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                if (row.voce === "") {
                  return (
                    <tr key={idx}>
                      <td colSpan={12} className="py-1"></td>
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

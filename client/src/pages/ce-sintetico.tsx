import React from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import KPICard from "@/components/KPICard";
import { formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";
import { getAllMonthsData } from "@/data/csvData";

export default function CESintetico() {
  const [allMonthsData, setAllMonthsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

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

  if (loading || !allMonthsData) {
    return (
      <div data-testid="page-ce-sintetico">
        <PageHeader 
          title="CE Sintetico" 
          subtitle="Caricamento dati in corso..."
        />
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  const progressivo2025 = allMonthsData.agosto?.progressivo2025;
  const progressivo2024 = allMonthsData.agosto?.progressivo2024;

  if (!progressivo2025 || !progressivo2024) {
    return (
      <div data-testid="page-ce-sintetico">
        <PageHeader 
          title="CE Sintetico" 
          subtitle="Dati non disponibili"
        />
        <div className="text-center p-8">
          <p className="text-muted-foreground">Dati non disponibili per il confronto</p>
        </div>
      </div>
    );
  }

  const columns = [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "value2025", label: "2025 (Gen-Ago)", align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: "2024 (Gen-Ago)", align: "right" as const },
    { key: "varianceEuro", label: "Var €", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  const createRow = (label: string, value2025: number, value2024: number, isBold = false) => {
    const percentage = progressivo2025.totaleRicavi > 0 ? (value2025 / progressivo2025.totaleRicavi) * 100 : 0;
    const variance = calculateVariance(value2025, value2024);
    const varianceEuroValue = value2025 - value2024;
    return {
      voce: label,
      value2025: formatCurrency(value2025),
      percentage: formatPercentage(percentage, 1),
      value2024: formatCurrency(value2024),
      varianceEuro: value2024 === 0 && value2025 === 0 ? "n/a" : formatCurrency(varianceEuroValue),
      variance: value2024 === 0 && value2025 === 0 ? "n/a" : `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
      ...(isBold && { className: "font-bold" }),
    };
  };

  const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", varianceEuro: "", variance: "" };

  const data = [
    createRow("Ricavi caratteristici", progressivo2025.ricaviCaratteristici, progressivo2024.ricaviCaratteristici),
    createRow("Altri ricavi", progressivo2025.altriRicavi, progressivo2024.altriRicavi),
    createRow("TOTALE RICAVI", progressivo2025.totaleRicavi, progressivo2024.totaleRicavi, true),
    emptyRow,
    createRow("Servizi diretti", progressivo2025.serviziDiretti, progressivo2024.serviziDiretti),
    createRow("Consulenze dirette", progressivo2025.consulenzeDirette, progressivo2024.consulenzeDirette),
    createRow("Servizi informatici web", progressivo2025.serviziInformatici, progressivo2024.serviziInformatici),
    createRow("Servizi cloud", progressivo2025.serviziCloud, progressivo2024.serviziCloud),
    createRow("COSTI DIRETTI", progressivo2025.costiDiretti, progressivo2024.costiDiretti, true),
    createRow("Altri servizi e prestazioni", progressivo2025.altriServizi, progressivo2024.altriServizi),
    createRow("COSTI INDIRETTI", progressivo2025.costiIndiretti, progressivo2024.costiIndiretti, true),
    createRow("TOTALE COSTI DIRETTI E INDIRETTI", progressivo2025.totaleCostiDirettiIndiretti, progressivo2024.totaleCostiDirettiIndiretti, true),
    createRow("GROSS PROFIT", progressivo2025.grossProfit, progressivo2024.grossProfit, true),
    emptyRow,
    createRow("Spese commerciali", progressivo2025.speseCommerciali, progressivo2024.speseCommerciali),
    createRow("Personale", progressivo2025.personale, progressivo2024.personale),
    createRow("Compensi amministratore", progressivo2025.compensiAmministratore, progressivo2024.compensiAmministratore),
    createRow("Rimborsi amministratore", progressivo2025.rimborsiAmministratore, progressivo2024.rimborsiAmministratore),
    createRow("Servizi amministrativi", progressivo2025.serviziAmministrativi, progressivo2024.serviziAmministrativi),
    createRow("Consulenze legali", progressivo2025.consulenzeLegali, progressivo2024.consulenzeLegali),
    createRow("Consulenze tecniche", progressivo2025.consulenzeTecniche, progressivo2024.consulenzeTecniche),
    createRow("Locazioni e noleggi", progressivo2025.locazioniNoleggi, progressivo2024.locazioniNoleggi),
    createRow("TOTALE GESTIONE STRUTTURA", progressivo2025.totaleGestioneStruttura, progressivo2024.totaleGestioneStruttura, true),
    createRow("EBITDA", progressivo2025.ebitda, progressivo2024.ebitda, true),
    emptyRow,
    createRow("Ammortamenti", progressivo2025.totaleAmmortamenti, progressivo2024.totaleAmmortamenti),
    createRow("Gestione straordinaria", progressivo2025.gestioneStraordinaria, progressivo2024.gestioneStraordinaria),
    createRow("Gestione finanziaria", progressivo2025.gestioneFinanziaria, progressivo2024.gestioneFinanziaria),
    createRow("EBT", progressivo2025.ebt, progressivo2024.ebt, true),
    createRow("Imposte", progressivo2025.imposteDirette, progressivo2024.imposteDirette),
    createRow("RISULTATO DELL'ESERCIZIO", progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio, true),
  ];

  const margineVariance = calculateVariance(progressivo2025.grossProfit, progressivo2024.grossProfit);
  const ebitdaVariance = calculateVariance(progressivo2025.ebitda, progressivo2024.ebitda);
  const risultatoVariance = calculateVariance(progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio);

  const margine2025Perc = progressivo2025.totaleRicavi > 0 ? (progressivo2025.grossProfit / progressivo2025.totaleRicavi) * 100 : 0;
  const ebitda2025Perc = progressivo2025.totaleRicavi > 0 ? (progressivo2025.ebitda / progressivo2025.totaleRicavi) * 100 : 0;
  const risultato2025Perc = progressivo2025.totaleRicavi > 0 ? (progressivo2025.risultatoEsercizio / progressivo2025.totaleRicavi) * 100 : 0;

  return (
    <div data-testid="page-ce-sintetico">
      <PageHeader 
        title="CE Sintetico" 
        subtitle="Conto Economico Sintetico - Principali aggregati economici"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard 
          label="Gross Profit" 
          value={formatCurrency(progressivo2025.grossProfit)}
          change={`${margineVariance >= 0 ? '+' : ''}${formatPercentage(margineVariance, 0)} vs 2024`}
          changeType={margineVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="EBITDA" 
          value={formatCurrency(progressivo2025.ebitda)}
          change={`${ebitdaVariance >= 0 ? '+' : ''}${formatPercentage(ebitdaVariance, 0)} vs 2024`}
          changeType={ebitdaVariance >= 0 ? "positive" : "negative"}
        />
        <KPICard 
          label="Risultato Esercizio" 
          value={formatCurrency(progressivo2025.risultatoEsercizio)}
          change={`${risultatoVariance >= 0 ? '+' : ''}${formatPercentage(risultatoVariance, 0)} vs 2024`}
          changeType={risultatoVariance >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-5">Conto Economico Sintetico</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-${col.align || "left"} whitespace-nowrap`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const isTotal = [2, 8, 10, 11, 12, 22, 23, 28, 30].includes(idx);
                const isKeyMetric = [12, 22, 23, 28, 30].includes(idx);
                const isResult = [30].includes(idx);

                const rowClassName = isResult
                  ? "bg-yellow-50 dark:bg-yellow-950/20 font-bold"
                  : isKeyMetric
                  ? "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  : isTotal
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold"
                  : "hover:bg-muted/50";

                return (
                  <tr key={idx} className={rowClassName}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3 text-sm border-b border-border text-${col.align || "left"} ${col.align === 'right' ? 'whitespace-nowrap' : ''}`}
                      >
                        {row[col.key as keyof typeof row]}
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

import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import KPICard from "@/components/KPICard";
import { financialData, formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";

export default function CESintetico() {
  const { progressivo2025, progressivo2024 } = financialData.ceSintetico;

  const columns = [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "value2025", label: "2025 (Gen-Ago)", align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: "2024 (Gen-Ago)", align: "right" as const },
    { key: "varianceEuro", label: "Var €", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  const createRow = (label: string, value2025: number, value2024: number, isBold = false) => {
    const percentage = (value2025 / progressivo2025.totaleRicavi) * 100;
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
    createRow("MARGINE", progressivo2025.margine, progressivo2024.margine, true),
    emptyRow,
    createRow("Ricavi non tipici", progressivo2025.ricaviNonTipici, progressivo2024.ricaviNonTipici),
    createRow("Costi commerciali", progressivo2025.costiCommerciali, progressivo2024.costiCommerciali),
    createRow("Personale", progressivo2025.personale, progressivo2024.personale),
    createRow("Compensi amministratore", progressivo2025.compensiAmministratore, progressivo2024.compensiAmministratore),
    createRow("Rimborsi amministratore", progressivo2025.rimborsiAmministratore, progressivo2024.rimborsiAmministratore),
    createRow("Servizi contabili e paghe", progressivo2025.serviziContabiliPaghe, progressivo2024.serviziContabiliPaghe),
    createRow("Consulenze legali", progressivo2025.consulenzeLegali, progressivo2024.consulenzeLegali),
    createRow("Consulenze tecniche", progressivo2025.consulenzeTecniche, progressivo2024.consulenzeTecniche),
    createRow("Altre spese di funzionamento", progressivo2025.altreSpeseFunzionamento, progressivo2024.altreSpeseFunzionamento),
    createRow("TOTALE STRUTTURA ALTRE VOCI NON TIPICHE", progressivo2025.totaleStrutturaAltreVociNonTipiche, progressivo2024.totaleStrutturaAltreVociNonTipiche, true),
    createRow("EBITDA", progressivo2025.ebitda, progressivo2024.ebitda, true),
    emptyRow,
    createRow("Ammortamenti e svalutazioni", progressivo2025.ammortamentiSvalutazioni, progressivo2024.ammortamentiSvalutazioni),
    createRow("Gestione straordinaria", progressivo2025.gestioneStraordinaria, progressivo2024.gestioneStraordinaria),
    createRow("Gestione finanziaria", progressivo2025.gestioneFinanziaria, progressivo2024.gestioneFinanziaria),
    createRow("TOTALE ALTRE VOCI NON TIPICHE", progressivo2025.totaleAltreVociNonTipiche, progressivo2024.totaleAltreVociNonTipiche, true),
    createRow("RISULTATO ANTE IMPOSTE", progressivo2025.risultatoAnteImposte, progressivo2024.risultatoAnteImposte, true),
    createRow("Imposte", progressivo2025.imposte, progressivo2024.imposte),
    createRow("RISULTATO DELL'ESERCIZIO", progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio, true),
  ];

  const margineVariance = calculateVariance(progressivo2025.margine, progressivo2024.margine);
  const ebitdaVariance = calculateVariance(progressivo2025.ebitda, progressivo2024.ebitda);
  const risultatoVariance = calculateVariance(progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio);

  const margine2025Perc = (progressivo2025.margine / progressivo2025.totaleRicavi) * 100;
  const ebitda2025Perc = (progressivo2025.ebitda / progressivo2025.totaleRicavi) * 100;
  const risultato2025Perc = (progressivo2025.risultatoEsercizio / progressivo2025.totaleRicavi) * 100;

  return (
    <div data-testid="page-ce-sintetico">
      <PageHeader 
        title="CE Sintetico" 
        subtitle="Conto Economico Sintetico - Principali aggregati economici"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard 
          label="Margine Lordo" 
          value={formatPercentage(margine2025Perc)}
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

      <DataTable 
        columns={columns} 
        data={data}
        totalRows={[2, 8, 10, 11]}
        keyMetricRows={[12, 24, 30]}
        resultRow={[32]}
      />
    </div>
  );
}

import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { financialData, formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";

export default function CEDettaglio() {
  const { progressivo2025, progressivo2024 } = financialData.ceDettaglio;

  const columns = [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "value2025", label: "2025 (Gen-Ago)", align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: "2024 (Gen-Ago)", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  const createRow = (label: string, value2025: number, value2024: number, isBold = false) => {
    const percentage = (value2025 / progressivo2025.totaleRicavi) * 100;
    const variance = calculateVariance(value2025, value2024);
    return {
      voce: label,
      value2025: formatCurrency(value2025),
      percentage: formatPercentage(percentage, 1),
      value2024: formatCurrency(value2024),
      variance: value2024 === 0 && value2025 === 0 ? "n/a" : `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
      ...(isBold && { className: "font-bold" }),
    };
  };

  const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", variance: "" };

  const data = [
    createRow("Ricavi caratteristici", progressivo2025.ricaviCaratteristici, progressivo2024.ricaviCaratteristici, true),
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
    createRow("Autofatture", progressivo2025.autofatture, progressivo2024.autofatture),
    createRow("Rimborsi spese", progressivo2025.rimborsiSpese, progressivo2024.rimborsiSpese),
    createRow("Altri proventi", progressivo2025.altriProventi, progressivo2024.altriProventi),
    createRow("ALTRI RICAVI NON TIPICI", progressivo2025.ricaviNonTipici, progressivo2024.ricaviNonTipici, true),
    emptyRow,
    { voce: "SPESE COMMERCIALI", value2025: "", percentage: "", value2024: "", variance: "", className: "font-bold bg-muted/30" },
    createRow("Spese viaggio", progressivo2025.speseViaggio, progressivo2024.speseViaggio),
    createRow("Pedaggi autostradali", progressivo2025.pedaggi, progressivo2024.pedaggi),
    createRow("Pubblicità", progressivo2025.pubblicita, progressivo2024.pubblicita),
    createRow("Materiale pubblicitario", progressivo2025.materialePubblicitario, progressivo2024.materialePubblicitario),
    createRow("Omaggi", progressivo2025.omaggi, progressivo2024.omaggi),
    createRow("Spese di rappresentanza", progressivo2025.speseRappresentanza, progressivo2024.speseRappresentanza),
    createRow("Mostre e fiere", progressivo2025.mostreFiere, progressivo2024.mostreFiere),
    createRow("Servizi commerciali", progressivo2025.serviziCommerciali, progressivo2024.serviziCommerciali),
    createRow("Carburante", progressivo2025.carburante, progressivo2024.carburante),
    createRow("SPESE COMMERCIALI", progressivo2025.speseCommerciali, progressivo2024.speseCommerciali, true),
    emptyRow,
    { voce: "SPESE DI STRUTTURA", value2025: "", percentage: "", value2024: "", variance: "", className: "font-bold bg-muted/30" },
    createRow("Beni indeducibili", progressivo2025.beniIndeducibili, progressivo2024.beniIndeducibili),
    createRow("Spese generali", progressivo2025.speseGenerali, progressivo2024.speseGenerali),
    createRow("Materiale vario e di consumo", progressivo2025.materialeConsumo, progressivo2024.materialeConsumo),
    createRow("Spese di pulizia", progressivo2025.spesePulizia, progressivo2024.spesePulizia),
    createRow("Utenze", progressivo2025.utenze, progressivo2024.utenze),
    createRow("Assicurazioni", progressivo2025.assicurazioni, progressivo2024.assicurazioni),
    createRow("Rimanenze", progressivo2025.rimanenze, progressivo2024.rimanenze),
    createRow("Tasse e valori bollati", progressivo2025.tasseValori, progressivo2024.tasseValori),
    createRow("Sanzioni e multe", progressivo2025.sanzioniMulte, progressivo2024.sanzioniMulte),
    createRow("Compensi amministratore", progressivo2025.compensiAmministratore, progressivo2024.compensiAmministratore),
    createRow("Rimborsi amministratore", progressivo2025.rimborsiAmministratore, progressivo2024.rimborsiAmministratore),
    createRow("Personale", progressivo2025.personale, progressivo2024.personale),
    createRow("Servizi amministrativi contabilità", progressivo2025.serviziAmministrativi, progressivo2024.serviziAmministrativi),
    createRow("Servizi amministrativi paghe", progressivo2025.serviziAmministrativiPaghe, progressivo2024.serviziAmministrativiPaghe),
    createRow("Consulenze tecniche", progressivo2025.consulenzeTecniche, progressivo2024.consulenzeTecniche),
    createRow("Consulenze legali", progressivo2025.consulenzeLegali, progressivo2024.consulenzeLegali),
    createRow("Locazioni e noleggi", progressivo2025.locazioniNoleggi, progressivo2024.locazioniNoleggi),
    createRow("Servizi indeducibili", progressivo2025.serviziIndeducibili, progressivo2024.serviziIndeducibili),
    createRow("Utili e perdite su cambi", progressivo2025.utiliPerditeCambi, progressivo2024.utiliPerditeCambi),
    createRow("Perdite su crediti", progressivo2025.perditeSuCrediti, progressivo2024.perditeSuCrediti),
    createRow("Licenze d'uso", progressivo2025.licenzeUso, progressivo2024.licenzeUso),
    createRow("Utenze telefoniche e cellulari", progressivo2025.utenzeTelefoniche, progressivo2024.utenzeTelefoniche),
    createRow("Altri oneri", progressivo2025.altriOneri, progressivo2024.altriOneri),
    createRow("Abbuoni e arrotondamenti", progressivo2025.abbuoniArrotondamenti, progressivo2024.abbuoniArrotondamenti),
    createRow("SPESE DI STRUTTURA", progressivo2025.speseStruttura, progressivo2024.speseStruttura, true),
    emptyRow,
    createRow("TOTALE GESTIONE STRUTTURA", progressivo2025.totaleGestioneStruttura, progressivo2024.totaleGestioneStruttura, true),
    createRow("EBITDA", progressivo2025.ebitda, progressivo2024.ebitda, true),
    emptyRow,
    createRow("Ammortamenti immateriali", progressivo2025.ammortamentiImmateriali, progressivo2024.ammortamentiImmateriali),
    createRow("Ammortamenti materiali", progressivo2025.ammortamentiMateriali, progressivo2024.ammortamentiMateriali),
    createRow("Svalutazioni e accantonamenti", progressivo2025.svalutazioni, progressivo2024.svalutazioni),
    createRow("AMMORTAMENTI, ACCANT. SVALUTAZIONI", progressivo2025.totaleAmmortamenti, progressivo2024.totaleAmmortamenti, true),
    emptyRow,
    createRow("Gestione straordinaria", progressivo2025.gestioneStraordinaria, progressivo2024.gestioneStraordinaria),
    createRow("EBIT", progressivo2025.ebit, progressivo2024.ebit, true),
    emptyRow,
    createRow("Spese e commissioni bancarie", progressivo2025.speseCommissioniBancarie, progressivo2024.speseCommissioniBancarie),
    createRow("Interessi passivi su mutui", progressivo2025.interessiPassiviMutui, progressivo2024.interessiPassiviMutui),
    createRow("Altri interessi", progressivo2025.altriInteressi, progressivo2024.altriInteressi),
    createRow("GESTIONE FINANZIARIA", progressivo2025.gestioneFinanziaria, progressivo2024.gestioneFinanziaria, true),
    emptyRow,
    createRow("EBT", progressivo2025.ebt, progressivo2024.ebt, true),
    createRow("Imposte dirette", progressivo2025.imposteDirette, progressivo2024.imposteDirette),
    createRow("RISULTATO DELL'ESERCIZIO", progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio, true),
  ];

  return (
    <div data-testid="page-ce-dettaglio">
      <PageHeader 
        title="CE Dettaglio" 
        subtitle="Conto Economico Dettagliato - Analisi completa per voce (Progressivo Gen-Ago)"
      />

      <DataTable 
        columns={columns} 
        data={data}
        highlightRows={[2, 8, 10, 11, 12, 16, 26, 53, 54, 55, 61, 63, 69, 71, 73]}
        totalRows={[2, 8, 11, 12, 16, 26, 53, 54, 55, 61, 63, 69, 71, 73]}
      />
    </div>
  );
}

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { financialData, formatCurrency } from "@/data/financialData";

export default function CEDettaglioMensile() {
  const { progressivo2025 } = financialData.ceDettaglioMensile;
  const months = progressivo2025.months;

  const createRowData = (label: string, values: number[], className: string = "") => ({
    voce: label,
    values: values.map((v) => formatCurrency(v).replace("€", "").trim()),
    className,
  });

  const emptyRow = { voce: "", values: [], className: "" };

  const data = [
    createRowData("Ricavi caratteristici", progressivo2025.ricaviCaratteristici),
    createRowData("Altri ricavi", progressivo2025.altriRicavi),
    createRowData("TOTALE RICAVI", progressivo2025.totaleRicavi, "total-dark"),
    emptyRow,
    createRowData("Servizi diretti", progressivo2025.serviziDiretti),
    createRowData("Consulenze dirette", progressivo2025.consulenzeDirette),
    createRowData("Servizi informatici web", progressivo2025.serviziInformatici),
    createRowData("Servizi cloud", progressivo2025.serviziCloud),
    createRowData("COSTI DIRETTI", progressivo2025.costiDiretti, "highlight"),
    createRowData("Altri servizi e prestazioni", progressivo2025.altriServizi),
    createRowData("COSTI INDIRETTI", progressivo2025.costiIndiretti, "highlight"),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", progressivo2025.totaleCostiDirettiIndiretti, "total-dark"),
    createRowData("GROSS PROFIT", progressivo2025.grossProfit, "key-metric"),
    emptyRow,
    createRowData("Autofatture", progressivo2025.autofatture),
    createRowData("Rimborsi spese", progressivo2025.rimborsiSpese),
    createRowData("Altri proventi", progressivo2025.altriProventi),
    createRowData("ALTRI RICAVI NON TIPICI", progressivo2025.ricaviNonTipici, "highlight"),
    emptyRow,
    createRowData("Spese viaggio", progressivo2025.speseViaggio),
    createRowData("Pedaggi autostradali", progressivo2025.pedaggi),
    createRowData("Pubblicità", progressivo2025.pubblicita),
    createRowData("Materiale pubblicitario", progressivo2025.materialePubblicitario),
    createRowData("Omaggi", progressivo2025.omaggi),
    createRowData("Spese di rappresentanza", progressivo2025.speseRappresentanza),
    createRowData("Mostre e fiere", progressivo2025.mostreFiere),
    createRowData("Servizi commerciali", progressivo2025.serviziCommerciali),
    createRowData("Carburante", progressivo2025.carburante),
    createRowData("SPESE COMMERCIALI", progressivo2025.speseCommerciali, "total-dark"),
    emptyRow,
    createRowData("Beni indeducibili", progressivo2025.beniIndeducibili),
    createRowData("Spese generali", progressivo2025.speseGenerali),
    createRowData("Materiale vario e di consumo", progressivo2025.materialeConsumo),
    createRowData("Spese di pulizia", progressivo2025.spesePulizia),
    createRowData("Utenze", progressivo2025.utenze),
    createRowData("Assicurazioni", progressivo2025.assicurazioni),
    createRowData("Rimanenze", progressivo2025.rimanenze),
    createRowData("Tasse e valori bollati", progressivo2025.tasseValori),
    createRowData("Sanzioni e multe", progressivo2025.sanzioniMulte),
    createRowData("Compensi amministratore", progressivo2025.compensiAmministratore),
    createRowData("Rimborsi amministratore", progressivo2025.rimborsiAmministratore),
    createRowData("Personale", progressivo2025.personale),
    createRowData("Servizi amministrativi contabilità", progressivo2025.serviziAmministrativi),
    createRowData("Servizi amministrativi paghe", progressivo2025.serviziAmministrativiPaghe),
    createRowData("Consulenze tecniche", progressivo2025.consulenzeTecniche),
    createRowData("Consulenze legali", progressivo2025.consulenzeLegali),
    createRowData("Locazioni e noleggi", progressivo2025.locazioniNoleggi),
    createRowData("Servizi indeducibili", progressivo2025.serviziIndeducibili),
    createRowData("Utili e perdite su cambi", progressivo2025.utiliPerditeCambi),
    createRowData("Perdite su crediti", progressivo2025.perditeSuCrediti),
    createRowData("Licenze d'uso", progressivo2025.licenzeUso),
    createRowData("Utenze telefoniche e cellulari", progressivo2025.utenzeTelefoniche),
    createRowData("Altri oneri", progressivo2025.altriOneri),
    createRowData("Abbuoni e arrotondamenti", progressivo2025.abbuoniArrotondamenti),
    createRowData("SPESE DI STRUTTURA", progressivo2025.speseStruttura, "total-dark"),
    emptyRow,
    createRowData("TOTALE GESTIONE STRUTTURA", progressivo2025.totaleStruttura, "total-dark"),
    createRowData("EBITDA", progressivo2025.ebitda, "key-metric"),
    emptyRow,
    createRowData("Ammortamenti immateriali", progressivo2025.ammortamentiImmateriali),
    createRowData("Ammortamenti materiali", progressivo2025.ammortamentiMateriali),
    createRowData("Svalutazioni e accantonamenti", progressivo2025.svalutazioni),
    createRowData("AMMORTAMENTI, ACCANT. SVALUTAZIONI", progressivo2025.ammortamenti, "total-dark"),
    emptyRow,
    createRowData("Gestione straordinaria", progressivo2025.gestioneStraordinaria),
    createRowData("EBIT", progressivo2025.ebit, "key-metric"),
    emptyRow,
    createRowData("Spese e commissioni bancarie", progressivo2025.speseCommissioniBancarie),
    createRowData("Interessi passivi su mutui", progressivo2025.interessiPassiviMutui),
    createRowData("Altri interessi", progressivo2025.altriInteressi),
    createRowData("GESTIONE FINANZIARIA", progressivo2025.gestioneFinanziaria, "total-dark"),
    emptyRow,
    createRowData("EBT (Risultato ante imposte)", progressivo2025.ebt, "key-metric"),
    createRowData("Imposte dirette", progressivo2025.imposteDirette),
    createRowData("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", progressivo2025.risultato, "result"),
  ];

  const getRowClassName = (className: string) => {
    switch (className) {
      case "result":
        return "bg-yellow-100 dark:bg-yellow-900/40 font-bold";
      case "key-metric":
        return "bg-blue-50 dark:bg-blue-950/20 font-bold";
      case "total-dark":
        return "bg-blue-900/10 dark:bg-blue-900/30 font-bold";
      case "highlight":
        return "font-semibold";
      default:
        return "hover:bg-muted/50";
    }
  };

  return (
    <div data-testid="page-ce-dettaglio-mensile">
      <PageHeader 
        title="CE Dettaglio Mensile" 
        subtitle="Conto Economico Dettagliato - Analisi mensile progressiva (Gen-Ago 2025)"
      />

      <Card className="p-6 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max" data-testid="table-mensile">
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
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                if (row.voce === "") {
                  return (
                    <tr key={idx}>
                      <td colSpan={9} className="py-1"></td>
                    </tr>
                  );
                }

                const rowClassName = getRowClassName(row.className);

                return (
                  <tr key={idx} className={rowClassName} data-testid={`row-${idx}`}>
                    <td className={`px-3 py-3 text-sm border-b border-border font-semibold sticky left-0 z-10 ${rowClassName}`}>
                      {row.voce}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap" data-testid={`cell-${idx}-${i}`}>
                        € {value}
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

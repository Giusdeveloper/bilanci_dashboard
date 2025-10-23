import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllMonthsData } from "@/data/csvData";

export default function CEDettaglioMensileProgressivo2024() {
  const [allMonthsData, setAllMonthsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllMonthsData();
        setAllMonthsData(data);
      } catch (error) {
        console.error('Errore caricamento dati:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!allMonthsData) {
    return (
      <div className="p-6">
        <PageHeader 
          title="CE Dettaglio Mensile - Progressivo 2024" 
          subtitle="Dati non disponibili"
        />
      </div>
    );
  }

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  // Mapping mesi per URL
  const monthUrlMap: { [key: string]: string } = {
    "Gen": "gennaio",
    "Feb": "febbraio",
    "Mar": "marzo",
    "Apr": "aprile",
    "Mag": "maggio",
    "Giu": "giugno",
    "Lug": "luglio",
    "Ago": "agosto",
    "Set": "settembre",
    "Ott": "ottobre",
    "Nov": "novembre",
    "Dic": "dicembre",
  };

  const createRowData = (label: string, field: string, className: string = "") => {
    if (!allMonthsData) return { voce: label, values: [], className };
    
    const values = months.map(month => {
      const monthKey = monthUrlMap[month];
      const monthData = allMonthsData[monthKey]?.progressivo2024;
      return monthData ? monthData[field] || 0 : 0;
    });

    return {
      voce: label,
      values: values.map((v) => v.toLocaleString()),
      className,
    };
  };

  const emptyRow = { voce: "", values: [], className: "" };

  const data = [
    createRowData("Ricavi caratteristici", "ricaviCaratteristici"),
    createRowData("Altri ricavi", "altriRicavi"),
    createRowData("TOTALE RICAVI", "totaleRicavi", "total-dark"),
    emptyRow,
    createRowData("Servizi diretti", "serviziDiretti"),
    createRowData("Consulenze dirette", "consulenzeDirette"),
    createRowData("Servizi informatici web", "serviziInformatici"),
    createRowData("Servizi cloud", "serviziCloud"),
    createRowData("COSTI DIRETTI", "costiDiretti", "highlight"),
    createRowData("Altri servizi e prestazioni", "altriServizi"),
    createRowData("COSTI INDIRETTI", "costiIndiretti", "highlight"),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", "totaleCostiDirettiIndiretti", "total-dark"),
    createRowData("GROSS PROFIT", "grossProfit", "key-metric"),
    emptyRow,
    createRowData("Autofatture", "autofatture"),
    createRowData("Rimborsi spese", "rimborsiSpese"),
    createRowData("Altri proventi", "altriProventi"),
    createRowData("ALTRI RICAVI NON TIPICI", "ricaviNonTipici", "highlight"),
    emptyRow,
    createRowData("Spese viaggio", "speseViaggio"),
    createRowData("Pedaggi autostradali", "pedaggi"),
    createRowData("Pubblicità", "pubblicita"),
    createRowData("Materiale pubblicitario", "materialePubblicitario"),
    createRowData("Omaggi", "omaggi"),
    createRowData("Spese di rappresentanza", "speseRappresentanza"),
    createRowData("Mostre e fiere", "mostreFiere"),
    createRowData("Servizi commerciali", "serviziCommerciali"),
    createRowData("Carburante", "carburante"),
    createRowData("SPESE COMMERCIALI", "speseCommerciali", "total-dark"),
    emptyRow,
    createRowData("Beni indeducibili", "beniIndeducibili"),
    createRowData("Spese generali", "speseGenerali"),
    createRowData("Materiale vario e di consumo", "materialeConsumo"),
    createRowData("Spese di pulizia", "spesePulizia"),
    createRowData("Utenze", "utenze"),
    createRowData("Assicurazioni", "assicurazioni"),
    createRowData("Rimanenze", "rimanenze"),
    createRowData("Tasse e valori bollati", "tasseValori"),
    createRowData("Sanzioni e multe", "sanzioniMulte"),
    createRowData("Compensi amministratore", "compensiAmministratore"),
    createRowData("Rimborsi amministratore", "rimborsiAmministratore"),
    createRowData("Personale", "personale"),
    createRowData("Servizi amministrativi contabilità", "serviziAmministrativi"),
    createRowData("Servizi amministrativi paghe", "serviziAmministrativiPaghe"),
    createRowData("Consulenze tecniche", "consulenzeTecniche"),
    createRowData("Consulenze legali", "consulenzeLegali"),
    createRowData("Locazioni e noleggi", "locazioniNoleggi"),
    createRowData("Servizi indeducibili", "serviziIndeducibili"),
    createRowData("Utili e perdite su cambi", "utiliPerditeCambi"),
    createRowData("Perdite su crediti", "perditeSuCrediti"),
    createRowData("Licenze d'uso", "licenzeUso"),
    createRowData("Utenze telefoniche e cellulari", "utenzeTelefoniche"),
    createRowData("Altri oneri", "altriOneri"),
    createRowData("Abbuoni e arrotondamenti", "abbuoniArrotondamenti"),
    createRowData("SPESE DI STRUTTURA", "speseStruttura", "total-dark"),
    emptyRow,
    createRowData("TOTALE GESTIONE STRUTTURA", "totaleGestioneStruttura", "total-dark"),
    createRowData("EBITDA", "ebitda", "key-metric"),
    emptyRow,
    createRowData("Ammortamenti immateriali", "ammortamentiImmateriali"),
    createRowData("Ammortamenti materiali", "ammortamentiMateriali"),
    createRowData("Svalutazioni e accantonamenti", "svalutazioni"),
    createRowData("AMMORTAMENTI, ACCANT. SVALUTAZIONI", "totaleAmmortamenti", "total-dark"),
    emptyRow,
    createRowData("Gestione straordinaria", "gestioneStraordinaria"),
    createRowData("EBIT", "ebit", "key-metric"),
    emptyRow,
    createRowData("Spese e commissioni bancarie", "speseCommissioniBancarie"),
    createRowData("Interessi passivi su mutui", "interessiPassiviMutui"),
    createRowData("Altri interessi", "altriInteressi"),
    createRowData("GESTIONE FINANZIARIA", "gestioneFinanziaria", "total-dark"),
    emptyRow,
    createRowData("EBT (Risultato ante imposte)", "ebt", "key-metric"),
    createRowData("Imposte dirette", "imposteDirette"),
    createRowData("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", "risultatoEsercizio", "result"),
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
    <div data-testid="page-ce-dettaglio-mensile-progressivo-2024" className="p-6">
      <PageHeader 
        title="CE Dettaglio Mensile - Progressivo 2024" 
        subtitle="Conto Economico Dettagliato - Analisi mensile progressiva 2024"
      />
      
      <div className="mb-6">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Torna alla pagina principale
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="relative">
          <div className="overflow-x-auto overflow-y-auto [scrollbar-width:thin] [scrollbar-gutter:stable] [scrollbar-color:#cbd5e1_#f1f5f9] [height:70vh] [max-height:70vh]">
          <table className="w-full border-collapse min-w-max" data-testid="table-mensile">
            <thead>
              <tr>
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 bg-muted z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  Voce
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    className="bg-muted px-3 py-3 text-sm font-semibold border-b-2 border-border text-right whitespace-nowrap"
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
                      <td colSpan={13} className="py-1"></td>
                    </tr>
                  );
                }

                const rowClassName = getRowClassName(row.className);
                const isSpecialRow = row.className !== "";

                return (
                  <tr key={idx} className={rowClassName} data-testid={`row-${idx}`}>
                    <td className={`px-3 py-3 text-sm border-b border-border ${isSpecialRow ? 'font-semibold' : ''} sticky left-0 z-20 ${rowClassName} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>
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
        </div>
      </Card>
    </div>
  );
}

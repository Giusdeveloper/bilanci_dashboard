import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/data/financialData";
import { Link } from "wouter";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";

interface MonthlyData {
  months: string[];
  [key: string]: any;
}

interface CEDettaglioMensileData {
  progressivo2025?: MonthlyData;
  puntuale2025?: MonthlyData;
  progressivo2024?: MonthlyData;
  puntuale2024?: MonthlyData;
}

type ViewMode = 'progressivo2025' | 'puntuale2025' | 'progressivo2024' | 'puntuale2024';

export default function CEDettaglioMensile() {
  const { selectedCompany, getCEDettaglioMensileData } = useFinancialData();
  const [ceData, setCeData] = useState<CEDettaglioMensileData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('progressivo2025');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany) {
        setCeData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await getCEDettaglioMensileData(selectedCompany.id);
        if (data && data.length > 0 && data[0].data) {
          setCeData(data[0].data as CEDettaglioMensileData);
        } else {
          setCeData(null);
        }
      } catch (error) {
        console.error('Errore caricamento dati:', error);
        setCeData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getCEDettaglioMensileData]);

  const handleTabChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const currentData = ceData ? ceData[viewMode] : null;

  // Se nessuna azienda è selezionata
  if (!selectedCompany) {
    return (
      <div className="p-8">
        <PageHeader title="CE Dettaglio Mensile" subtitle="Conto Economico Dettagliato" />
        <div className="p-8 bg-muted rounded-lg text-center mt-6">
          <p className="text-lg text-muted-foreground">Seleziona un'azienda per visualizzare i dati.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Caricamento...</div>;
  }

  if (!ceData || !currentData) {
    return (
      <div className="p-8">
        <PageHeader title="CE Dettaglio Mensile" subtitle="Dati non disponibili" />
        <div className="mt-8 text-center text-muted-foreground">
          Nessun dato disponibile per questa vista ({viewMode}).
          <br />Prova a importare nuovamente il file Excel aggiornato.
        </div>
      </div>
    );
  }

  const { months } = currentData;

  // URL Mapping (solo per 2025 progressivo ha senso l'URL specifico se vogliamo, o lo teniamo generico)
  // Per ora manteniamo il link solo se siamo nel 2025, o lo mettiamo sempre adattandolo?
  // Nei screenshot non vedo link evidente sui mesi puntuali, ma manteniamo la UX.
  const monthUrlMap: { [key: string]: string } = {
    "Gen": "gennaio", "Feb": "febbraio", "Mar": "marzo", "Apr": "aprile",
    "Mag": "maggio", "Giu": "giugno", "Lug": "luglio", "Ago": "agosto",
    "Set": "settembre", "Ott": "ottobre", "Nov": "novembre", "Dic": "dicembre"
  };

  const createRowData = (label: string, values: number[] | undefined, className: string = "") => {
    const safeValues = values || new Array(months?.length || 0).fill(0);
    return {
      voce: label,
      values: safeValues.map((v) => formatCurrency(v).replace("€", "").trim()),
      className,
    };
  };

  const emptyRow = { voce: "", values: [], className: "" };

  const tableRows = [
    createRowData("Ricavi caratteristici", currentData.ricaviCaratteristici),
    createRowData("Altri ricavi", currentData.altriRicavi),
    createRowData("TOTALE RICAVI", currentData.totaleRicavi, "total-dark"),
    emptyRow,
    createRowData("Servizi diretti", currentData.serviziDiretti),
    createRowData("Consulenze dirette", currentData.consulenzeDirette),
    createRowData("Servizi informatici web", currentData.serviziInformatici),
    createRowData("Servizi cloud", currentData.serviziCloud),
    createRowData("COSTI DIRETTI", currentData.costiDiretti, "highlight"),
    createRowData("Altri servizi e prestazioni", currentData.altriServizi),
    createRowData("COSTI INDIRETTI", currentData.costiIndiretti, "highlight"),
    createRowData("TOTALE COSTI DIRETTI E INDIRETTI", currentData.totaleCostiDirettiIndiretti, "total-dark"),
    createRowData("GROSS PROFIT", currentData.grossProfit, "key-metric"),
    emptyRow,
    createRowData("Autofatture", currentData.autofatture),
    createRowData("Rimborsi spese", currentData.rimborsiSpese),
    createRowData("Altri proventi", currentData.altriProventi),
    createRowData("ALTRI RICAVI NON TIPICI", currentData.ricaviNonTipici, "highlight"),
    emptyRow,
    createRowData("Spese viaggio", currentData.speseViaggio),
    createRowData("Pedaggi autostradali", currentData.pedaggi),
    createRowData("Pubblicità", currentData.pubblicita),
    createRowData("Materiale pubblicitario", currentData.materialePubblicitario),
    createRowData("Omaggi", currentData.omaggi),
    createRowData("Spese di rappresentanza", currentData.speseRappresentanza),
    createRowData("Mostre e fiere", currentData.mostreFiere),
    createRowData("Servizi commerciali", currentData.serviziCommerciali),
    createRowData("Carburante", currentData.carburante),
    createRowData("SPESE COMMERCIALI", currentData.speseCommerciali, "total-dark"),
    emptyRow,
    createRowData("Beni indeducibili", currentData.beniIndeducibili),
    createRowData("Spese generali", currentData.speseGenerali),
    createRowData("Materiale vario e di consumo", currentData.materialeConsumo),
    createRowData("Spese di pulizia", currentData.spesePulizia),
    createRowData("Utenze", currentData.utenze),
    createRowData("Assicurazioni", currentData.assicurazioni),
    createRowData("Rimanenze", currentData.rimanenze),
    createRowData("Tasse e valori bollati", currentData.tasseValori),
    createRowData("Sanzioni e multe", currentData.sanzioniMulte),
    createRowData("Compensi amministratore", currentData.compensiAmministratore),
    createRowData("Rimborsi amministratore", currentData.rimborsiAmministratore),
    createRowData("Personale", currentData.personale),
    createRowData("Servizi amministrativi contabilità", currentData.serviziAmministrativi),
    createRowData("Servizi amministrativi paghe", currentData.serviziAmministrativiPaghe),
    createRowData("Consulenze tecniche", currentData.consulenzeTecniche),
    createRowData("Consulenze legali", currentData.consulenzeLegali),
    createRowData("Locazioni e noleggi", currentData.locazioniNoleggi),
    createRowData("Servizi indeducibili", currentData.serviziIndeducibili),
    createRowData("Utili e perdite su cambi", currentData.utiliPerditeCambi),
    createRowData("Perdite su crediti", currentData.perditeSuCrediti),
    createRowData("Licenze d'uso", currentData.licenzeUso),
    createRowData("Utenze telefoniche e cellulari", currentData.utenzeTelefoniche),
    createRowData("Altri oneri", currentData.altriOneri),
    createRowData("Abbuoni e arrotondamenti", currentData.abbuoniArrotondamenti),
    createRowData("SPESE DI STRUTTURA", currentData.speseStruttura, "total-dark"),
    emptyRow,
    createRowData("TOTALE GESTIONE STRUTTURA", currentData.totaleStruttura, "total-dark"),
    createRowData("EBITDA", currentData.ebitda, "key-metric"),
    emptyRow,
    createRowData("Ammortamenti immateriali", currentData.ammortamentiImmateriali),
    createRowData("Ammortamenti materiali", currentData.ammortamentiMateriali),
    createRowData("Svalutazioni e accantonamenti", currentData.svalutazioni),
    createRowData("AMMORTAMENTI, ACCANT. SVALUTAZIONI", currentData.totaleAmmortamenti || currentData.ammortamenti, "total-dark"),
    emptyRow,
    createRowData("Gestione straordinaria", currentData.gestioneStraordinaria),
    createRowData("EBIT", currentData.ebit, "key-metric"),
    emptyRow,
    createRowData("Spese e commissioni bancarie", currentData.speseCommissioniBancarie),
    createRowData("Interessi passivi su mutui", currentData.interessiPassiviMutui),
    createRowData("Altri interessi", currentData.altriInteressi),
    createRowData("GESTIONE FINANZIARIA", currentData.gestioneFinanziaria, "total-dark"),
    emptyRow,
    createRowData("EBT (Risultato ante imposte)", currentData.ebt, "key-metric"),
    createRowData("Imposte dirette", currentData.imposteDirette),
    createRowData("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", currentData.risultato, "result"),
  ];

  const getRowClassName = (className: string) => {
    switch (className) {
      case "result": return "bg-yellow-100 dark:bg-yellow-900/40 font-bold";
      case "key-metric": return "bg-blue-50 dark:bg-blue-950/20 font-bold";
      case "total-dark": return "bg-blue-900/10 dark:bg-blue-900/30 font-bold";
      case "highlight": return "font-semibold";
      default: return "hover:bg-muted/50";
    }
  };

  const getTabClass = (mode: ViewMode) => {
    const base = "px-4 py-2 text-sm font-medium rounded-md transition-colors";
    return viewMode === mode
      ? "bg-primary text-primary-foreground shadow"
      : "bg-muted text-muted-foreground hover:bg-muted/80";
  };

  return (
    <div data-testid="page-ce-dettaglio-mensile" className="space-y-6">
      <div className="bg-primary rounded-lg p-6 text-primary-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2">CE Dettaglio Mensile</h1>
        <p className="opacity-90">Conto Economico Dettagliato - Analisi mensile {viewMode.replace('progressivo', 'Progressivo ').replace('puntuale', 'Puntuale ')}. Clicca su un mese per vedere il dettaglio.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleTabChange('progressivo2025')} className={getTabClass('progressivo2025')}>Progressivo 2025</button>
        <button onClick={() => handleTabChange('puntuale2025')} className={getTabClass('puntuale2025')}>Puntuale 2025</button>
        <button onClick={() => handleTabChange('progressivo2024')} className={getTabClass('progressivo2024')}>Progressivo 2024</button>
        <button onClick={() => handleTabChange('puntuale2024')} className={getTabClass('puntuale2024')}>Puntuale 2024</button>
      </div>

      <Card className="p-6 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max" data-testid="table-mensile">
            <thead>
              <tr>
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 bg-muted z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  Voce
                </th>
                {months.map((month: string) => (
                  <th key={month} className="bg-muted px-3 py-3 text-sm font-semibold border-b-2 border-border text-right whitespace-nowrap">
                    <Link href={`/ce-dettaglio-mensile/${monthUrlMap[month]}`} className="text-primary hover:underline cursor-pointer">
                      {month}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                if (row.voce === "") {
                  return <tr key={idx}><td colSpan={months.length + 1} className="py-1"></td></tr>;
                }
                const rowClassName = getRowClassName(row.className);
                const isSpecialRow = row.className !== "";
                return (
                  <tr key={idx} className={rowClassName}>
                    <td className={`px-3 py-3 text-sm border-b border-border ${isSpecialRow ? 'font-semibold' : ''} sticky left-0 z-20 ${rowClassName} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>
                      {row.voce}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">
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

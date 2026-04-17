import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/data/financialData";
import { Link } from "wouter";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";

interface MonthlyData {
  months: string[];
  isDynamic?: boolean;
  rows?: any[];
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

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;

  if (!ceData || !currentData) {
    return (
      <div className="p-8">
        <PageHeader title="CE Dettaglio Mensile" subtitle="Dati non disponibili" />
        <div className="mt-8 text-center text-muted-foreground">Nessun dato disponibile per questa vista ({viewMode}).</div>
      </div>
    );
  }

  const { months } = currentData;
  const monthUrlMap: { [key: string]: string } = {
    "Gen": "gennaio", "Feb": "febbraio", "Mar": "marzo", "Apr": "aprile",
    "Mag": "maggio", "Giu": "giugno", "Lug": "luglio", "Ago": "agosto",
    "Set": "settembre", "Ott": "ottobre", "Nov": "novembre", "Dic": "dicembre"
  };

  const getRowStyle = (className: string) => {
    switch (className) {
      case "result": return { row: "bg-yellow-100 dark:bg-yellow-900/40 font-bold", sticky: "bg-[#fefce8] dark:bg-[#1a1600]" };
      case "key-metric": return { row: "bg-blue-50 dark:bg-blue-950/20 font-bold", sticky: "bg-[#f0f9ff] dark:bg-[#082f49]" };
      case "total-dark": return { row: "bg-blue-900/10 dark:bg-blue-900/30 font-bold", sticky: "bg-[#f1f5f9] dark:bg-[#1e293b]" };
      case "highlight": return { row: "font-semibold", sticky: "bg-[#f8fafc] dark:bg-[#0f172a]" };
      default: return { row: "hover:bg-muted/50", sticky: "bg-card" };
    }
  };

  let displayRows: any[] = [];

  if (currentData.isDynamic && currentData.rows) {
    displayRows = currentData.rows.map((row: any) => ({
      voce: row.voce,
      values: (row.valori || new Array(months.length).fill(0)).map((v: number) => 
        formatCurrency(v || 0).replace("€", "").trim()
      ),
      className: row.type === 'result' ? 'result' : 
                 row.type === 'key-metric' ? 'key-metric' : 
                 row.type === 'total' ? 'total-dark' : 
                 row.type === 'subtotal' ? 'highlight' : ''
    }));
  } else {
    const createRowData = (label: string, values: number[] | undefined, className: string = "") => {
      const safeValues = values || new Array(months?.length || 0).fill(0);
      return {
        voce: label,
        values: safeValues.map((v) => formatCurrency(v).replace("€", "").trim()),
        className,
      };
    };
    const emptyRow = { voce: "", values: [], className: "" };
    displayRows = [
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
  }

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
        <p className="opacity-90">Conto Economico Dettagliato - Analisi mensile {viewMode.replace('progressivo', 'Progressivo ').replace('puntuale', 'Puntuale ')}.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['progressivo2025', 'puntuale2025', 'progressivo2024', 'puntuale2024'].map((m) => (
          <button key={m} onClick={() => handleTabChange(m as ViewMode)} className={getTabClass(m as ViewMode)}>
            {m.replace('progressivo', 'Progressivo ').replace('puntuale', 'Puntuale ')}
          </button>
        ))}
      </div>

      <Card className="p-6 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Voce</th>
                {months.map((m) => (
                  <th key={m} className="bg-muted px-3 py-3 text-sm font-semibold border-b-2 border-border text-right whitespace-nowrap">
                    <Link href={`/ce-dettaglio-mensile/${monthUrlMap[m] || 'gennaio'}`} className="text-primary hover:underline">{m}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => {
                if (row.voce === "") return <tr key={idx}><td colSpan={months.length + 1} className="py-1"></td></tr>;
                const styles = getRowStyle(row.className);
                return (
                  <tr key={idx} className={styles.row}>
                    <td className={`px-3 py-3 text-sm border-b border-border sticky left-0 z-20 ${styles.sticky} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>{row.voce}</td>
                    {row.values.map((v: string, i: number) => <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">€ {v}</td>)}
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

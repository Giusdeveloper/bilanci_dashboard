import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/data/financialData";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";
import { Link } from "wouter";

interface MonthlyData {
  months: string[];
  isDynamic?: boolean;
  rows?: any[];
  [key: string]: any;
}

interface CESinteticoMensileData {
  progressivo2025?: MonthlyData;
  puntuale2025?: MonthlyData;
  progressivo2024?: MonthlyData;
  puntuale2024?: MonthlyData;
}

type ViewMode = 'progressivo2025' | 'puntuale2025' | 'progressivo2024' | 'puntuale2024';

export default function CESinteticoMensile() {
  const { selectedCompany, getCESinteticoMensileData } = useFinancialData();
  const [ceData, setCeData] = useState<CESinteticoMensileData | null>(null);
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
        const data = await getCESinteticoMensileData(selectedCompany.id);
        if (data && data.length > 0 && data[0].data) {
          setCeData(data[0].data as CESinteticoMensileData);
        } else {
          setCeData(null);
        }
      } catch (error) {
        console.error('Errore nel caricamento dati CE Sintetico Mensile:', error);
        setCeData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getCESinteticoMensileData]);

  const handleTabChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const getTabClass = (mode: ViewMode) => {
    const base = "px-4 py-2 text-sm font-medium rounded-md transition-colors";
    return viewMode === mode
      ? `${base} bg-primary text-primary-foreground shadow`
      : `${base} bg-muted text-muted-foreground hover:bg-muted/80`;
  };

  const currentData = ceData ? ceData[viewMode] : null;

  if (!selectedCompany) {
    return (
      <div className="p-8">
        <PageHeader title="CE Sintetico Mensile" subtitle="Conto Economico Sintetico" />
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
        <PageHeader title="CE Sintetico Mensile" subtitle="Dati non disponibili" />
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
      case "result": return { row: "bg-yellow-50 dark:bg-yellow-900/20 font-bold", sticky: "bg-[#fefce8] dark:bg-[#1a1600]" };
      case "key-metric": return { row: "bg-blue-100 dark:bg-blue-900/30 font-bold", sticky: "bg-[#f0f9ff] dark:bg-[#082f49]" };
      case "total-dark": return { row: "bg-blue-50 dark:bg-blue-950/20 font-bold", sticky: "bg-[#f1f5f9] dark:bg-[#1e293b]" };
      case "highlight": return { row: "font-semibold", sticky: "bg-[#f8fafc] dark:bg-[#0f172a]" };
      default: return { row: "hover:bg-muted/50", sticky: "bg-card" };
    }
  };

  let displayRows: any[] = [];

  if (currentData.isDynamic && currentData.rows) {
    // RENDERING DINAMICO UNIVERSALE (Awentia, Sherpa42, Maia)
    displayRows = currentData.rows
      .map((row: any) => {
        const vals = row.valori || [];
        const total = vals.length > 0 ? vals[vals.length - 1] : 0;
        
        let className = row.type || "";
        if (className === "total") className = "total-dark";
        if (className === "result") className = "result";
        if (className === "key-metric") className = "key-metric";
        if (className === "subtotal") className = "highlight";

        return {
          voce: row.voce,
          values: vals.map((v: number) => formatCurrency(v || 0).replace("€", "").trim()),
          total: formatCurrency(total).replace("€", "").trim(),
          className: className
        };
      });
  } else {
    // RENDERING HARDCODED (Awentia)
    const createRowData = (label: string, values: number[] | undefined, className = "") => {
      const safeValues = values || new Array(months.length).fill(0);
      const total = safeValues[safeValues.length - 1] || 0; 
      return {
        voce: label,
        values: safeValues.map((v) => formatCurrency(v).replace("€", "").trim()),
        total: formatCurrency(total).replace("€", "").trim(),
        className: className,
      };
    };

    displayRows = [
      createRowData("TOTALE RICAVI", currentData.totaleRicavi, "total-dark"),
      createRowData("COSTI DIRETTI", currentData.costiDiretti, "highlight"),
      createRowData("COSTI INDIRETTI", currentData.costiIndiretti, "highlight"),
      createRowData("TOTALE COSTI DIRETTI E INDIRETTI", currentData.totaleCostiDirettiIndiretti, "total-dark"),
      createRowData("MARGINE", currentData.margine || currentData.grossProfit, "key-metric"),
      createRowData("TOTALE GESTIONE STRUTTURA", currentData.totaleGestioneStruttura || currentData.totaleStruttura, "total-dark"),
      createRowData("EBITDA", currentData.ebitda, "key-metric"),
      createRowData("RISULTATO ANTE IMPOSTE", currentData.ebt || currentData.risultatoAnteImposte, "key-metric"),
      createRowData("RISULTATO DELL'ESERCIZIO", currentData.risultatoEsercizio || currentData.risultato, "result"),
    ];
  }

  return (
    <div data-testid="page-ce-sintetico-mensile" className="space-y-6">
      <div className="bg-primary rounded-lg p-6 text-primary-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2">CE Sintetico Mensile</h1>
        <p className="opacity-90">Conto Economico Sintetico - Analisi mensile {viewMode.replace('progressivo', 'Progressivo ').replace('puntuale', 'Puntuale ')}.</p>
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
                <th className="bg-muted px-3 py-3 text-sm font-bold border-b-2 border-border text-right whitespace-nowrap">Totale</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => {
                const styles = getRowStyle(row.className);
                return (
                  <tr key={idx} className={styles.row}>
                    <td className={`px-3 py-3 text-sm border-b border-border sticky left-0 z-20 ${styles.sticky} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`}>{row.voce}</td>
                    {row.values.map((v: string, i: number) => <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">€ {v}</td>)}
                    <td className="px-3 py-3 text-sm border-b border-border text-right font-bold whitespace-nowrap">€ {row.total}</td>
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

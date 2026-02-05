import { useParams, Link } from "wouter";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/DataTable";
import { formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";
import { ArrowLeft } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";

const monthMapping: { [key: string]: number } = {
  "gennaio": 0, "febbraio": 1, "marzo": 2, "aprile": 3,
  "maggio": 4, "giugno": 5, "luglio": 6, "agosto": 7,
  // Add other months just in case, though 2025 data might be limited
  "settembre": 8, "ottobre": 9, "novembre": 10, "dicembre": 11
};

const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default function CEDettaglioMeseSpecifico() {
  const { selectedCompany, getCEDettaglioMensileData } = useFinancialData(); // Use correct getter
  const params = useParams<{ mese: string }>();
  const meseLower = params.mese?.toLowerCase() || "";
  const monthIndex = monthMapping[meseLower];
  const [ceData, setCeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Carica i dati del mese
  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany) {
        setCeData(null);
        return;
      }

      setLoading(true);
      try {
        // Load the BIG dataset that contains all months (puntuale/progressivo)
        const data = await getCEDettaglioMensileData(selectedCompany.id);
        if (data && data.length > 0 && data[0].data) {
          setCeData(data[0].data);
        } else {
          setCeData(null);
        }
      } catch (error) {
        console.error('Errore nel caricamento dati mese:', error);
        setCeData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getCEDettaglioMensileData]);

  // Se il mese non è valido
  if (monthIndex === undefined) {
    return (
      <div className="p-8">
        <PageHeader title="Mese Non Trovato" subtitle="Data invalida" />
        <Link href="/ce-dettaglio-mensile">
          <a className="text-primary hover:underline">Torna indietro</a>
        </Link>
      </div>
    );
  }

  const monthName = monthNames[monthIndex];

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;

  if (!selectedCompany || !ceData) {
    return (
      <div className="p-8">
        <PageHeader title={`Analisi ${monthName}`} subtitle="Dati non disponibili" />
        <div className="mt-8 text-center text-muted-foreground">
          Nessun dato disponibile.
        </div>
      </div>
    );
  }

  // Estrai i dati Puntuali per il mese specifico
  const puntuale2025 = ceData.puntuale2025;
  const puntuale2024 = ceData.puntuale2024;
  const hasData2024 = !!puntuale2024;

  const getValue = (dataset: any, key: string) => {
    if (!dataset || !dataset[key]) return 0;
    // dataset[key] is an array of 12 numbers
    return dataset[key][monthIndex] || 0;
  };

  const columns = hasData2024 ? [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrent", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentage", label: "% Incidenza", align: "right" as const },
    { key: "valuePrevious", label: `${monthName} 2024`, align: "right" as const },
    { key: "varianceEuro", label: "Var €", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ] : [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrent", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentage", label: "% Incidenza", align: "right" as const },
  ];

  const createRow = (label: string, key: string, isBold = false, className = "") => {
    const val25 = getValue(puntuale2025, key);
    const val24 = getValue(puntuale2024, key);
    const ricavi25 = getValue(puntuale2025, 'totaleRicavi') || 1;

    const perc = (val25 / ricavi25) * 100;
    const varEuro = val25 - val24;
    const varPerc = calculateVariance(val25, val24);

    const row: any = {
      voce: label,
      valueCurrent: formatCurrency(val25),
      percentage: formatPercentage(perc, 1),
      className: className || (isBold ? "font-bold" : "")
    };

    if (hasData2024) {
      row.valuePrevious = formatCurrency(val24);
      row.varianceEuro = (val25 === 0 && val24 === 0) ? "n/a" : formatCurrency(varEuro);
      row.variance = (val25 === 0 && val24 === 0) ? "n/a" : ((varPerc > 0 ? "+" : "") + formatPercentage(varPerc, 1));
    }

    return row;
  };

  const emptyRow = hasData2024
    ? { voce: "", valueCurrent: "", percentage: "", valuePrevious: "", varianceEuro: "", variance: "" }
    : { voce: "", valueCurrent: "", percentage: "" };

  const data = [
    createRow("Ricavi caratteristici", "ricaviCaratteristici"),
    createRow("Altri ricavi", "altriRicavi"),
    createRow("TOTALE RICAVI", "totaleRicavi", true, "total-dark"),
    emptyRow,
    createRow("Servizi diretti", "serviziDiretti"),
    createRow("Consulenze dirette", "consulenzeDirette"),
    createRow("Servizi informatici web", "serviziInformatici"),
    createRow("Servizi cloud", "serviziCloud"),
    createRow("COSTI DIRETTI", "costiDiretti", true, "highlight"),
    createRow("Altri servizi e prestazioni", "altriServizi"),
    createRow("COSTI INDIRETTI", "costiIndiretti", true, "highlight"),
    createRow("TOTALE COSTI DIRETTI E INDIRETTI", "totaleCostiDirettiIndiretti", true, "total-dark"),
    createRow("GROSS PROFIT", "grossProfit", true, "key-metric"),
    emptyRow,
    createRow("Autofatture", "autofatture"),
    createRow("Rimborsi spese", "rimborsiSpese"),
    createRow("Altri proventi", "altriProventi"),
    createRow("ALTRI RICAVI NON TIPICI", "ricaviNonTipici", true, "highlight"),
    emptyRow,
    createRow("Spese viaggio", "speseViaggio"),
    createRow("Pedaggi autostradali", "pedaggi"),
    createRow("Pubblicità", "pubblicita"),
    createRow("Materiale pubblicitario", "materialePubblicitario"),
    createRow("Omaggi", "omaggi"),
    createRow("Spese di rappresentanza", "speseRappresentanza"),
    createRow("Mostre e fiere", "mostreFiere"),
    createRow("Servizi commerciali", "serviziCommerciali"),
    createRow("Carburante", "carburante"),
    createRow("SPESE COMMERCIALI", "speseCommerciali", true, "total-dark"),
    emptyRow,
    createRow("Beni indeducibili", "beniIndeducibili"),
    createRow("Spese generali", "speseGenerali"),
    createRow("Materiale vario e di consumo", "materialeConsumo"),
    createRow("Spese di pulizia", "spesePulizia"),
    createRow("Utenze", "utenze"),
    createRow("Assicurazioni", "assicurazioni"),
    createRow("Rimanenze", "rimanenze"),
    createRow("Tasse e valori bollati", "tasseValori"),
    createRow("Sanzioni e multe", "sanzioniMulte"),
    createRow("Compensi amministratore", "compensiAmministratore"),
    createRow("Rimborsi amministratore", "rimborsiAmministratore"),
    createRow("Personale", "personale"),
    createRow("Servizi amministrativi contabilità", "serviziAmministrativi"),
    createRow("Servizi amministrativi paghe", "serviziAmministrativiPaghe"),
    createRow("Consulenze tecniche", "consulenzeTecniche"),
    createRow("Consulenze legali", "consulenzeLegali"),
    createRow("Locazioni e noleggi", "locazioniNoleggi"),
    createRow("Servizi indeducibili", "serviziIndeducibili"),
    createRow("Utili e perdite su cambi", "utiliPerditeCambi"),
    createRow("Perdite su crediti", "perditeSuCrediti"),
    createRow("Licenze d'uso", "licenzeUso"),
    createRow("Utenze telefoniche e cellulari", "utenzeTelefoniche"),
    createRow("Altri oneri", "altriOneri"),
    createRow("Abbuoni e arrotondamenti", "abbuoniArrotondamenti"),
    createRow("SPESE DI STRUTTURA", "speseStruttura", true, "total-dark"),
    emptyRow,
    createRow("TOTALE GESTIONE STRUTTURA", "totaleGestioneStruttura", true, "total-dark"),
    createRow("EBITDA", "ebitda", true, "key-metric"),
    emptyRow,
    createRow("Ammortamenti immateriali", "ammortamentiImmateriali"),
    createRow("Ammortamenti materiali", "ammortamentiMateriali"),
    createRow("Svalutazioni e accantonamenti", "svalutazioni"),
    createRow("AMMORTAMENTI, ACCANT. SVALUTAZIONI", "totaleAmmortamenti", true, "total-dark"),
    emptyRow,
    createRow("Gestione straordinaria", "gestioneStraordinaria"),
    createRow("EBIT", "ebit", true, "key-metric"),
    emptyRow,
    createRow("Spese e commissioni bancarie", "speseCommissioniBancarie"),
    createRow("Interessi passivi su mutui", "interessiPassiviMutui"),
    createRow("Altri interessi", "altriInteressi"),
    createRow("GESTIONE FINANZIARIA", "gestioneFinanziaria", true, "total-dark"),
    emptyRow,
    createRow("EBT (Risultato ante imposte)", "ebt", true, "key-metric"),
    createRow("Imposte dirette", "imposteDirette"),
    createRow("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", "risultatoEsercizio", true, "result"),
  ];

  return (
    <div data-testid="page-ce-mese-specifico">
      <div className="mb-4">
        <Link href="/ce-dettaglio-mensile">
          <a className="text-primary hover:underline flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Torna a CE Dettaglio Mensile
          </a>
        </Link>
      </div>

      <PageHeader
        title={`Conto Economico - ${monthName} 2025`}
        subtitle={`Analisi puntuale del mese di ${monthName}${hasData2024 ? ` con confronto rispetto a ${monthName} 2024` : ''}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </div>
  );
}

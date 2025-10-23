import React from "react";
import { useParams, Link } from "wouter";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/DataTable";
import { financialData, formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";
import { getMonthData, fallbackData } from "@/data/csvData";
import { ArrowLeft } from "lucide-react";

const monthMapping: { [key: string]: number } = {
  "gennaio": 0,
  "febbraio": 1,
  "marzo": 2,
  "aprile": 3,
  "maggio": 4,
  "giugno": 5,
  "luglio": 6,
  "agosto": 7,
};

const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto"];

export default function CEDettaglioMeseSpecifico() {
  const params = useParams<{ mese: string }>();
  const meseLower = params.mese?.toLowerCase() || "";
  const monthIndex = monthMapping[meseLower];

  // Se il mese non è valido, mostra errore
  if (monthIndex === undefined) {
    return (
      <div data-testid="page-ce-mese-invalido">
        <PageHeader title="Mese Non Trovato" subtitle="Il mese specificato non è valido" />
        <Card className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Mese non valido o non disponibile.</p>
            <Link href="/ce-dettaglio-mensile">
              <a className="text-primary hover:underline flex items-center gap-2 justify-center">
                <ArrowLeft className="w-4 h-4" />
                Torna a CE Dettaglio Mensile
              </a>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const monthName = monthNames[monthIndex];

  // Dati del mese corrente (2025) - ora usiamo i dati CSV
  // Carica i dati CSV per il mese specifico
  const [csvMonthData, setCsvMonthData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getMonthData(meseLower);
        if (data) {
          setCsvMonthData(data);
        } else {
          // Fallback ai dati hardcoded per gennaio
          setCsvMonthData(fallbackData.gennaio);
        }
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        // Fallback ai dati hardcoded per gennaio
        setCsvMonthData(fallbackData.gennaio);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [meseLower]);
  
  const data2025Prog = csvMonthData?.progressivo2025;
  const data2025Punt = csvMonthData?.puntuale2025;
  const data2024Prog = csvMonthData?.progressivo2024;
  const data2024Punt = csvMonthData?.puntuale2024;
  
  const hasData2024 = data2024Prog !== undefined;

  // Mostra loading se i dati non sono ancora caricati
  if (loading || !csvMonthData) {
    return (
      <div data-testid="page-ce-mese-specifico">
        <PageHeader 
          title={`Conto Economico - ${monthName} 2025`} 
          subtitle="Caricamento dati in corso..."
        />
        <Card className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento dati per {monthName}...</p>
          </div>
        </Card>
      </div>
    );
  }

  // ===== TABELLA PROGRESSIVA =====
  const columnsProg = hasData2024 ? [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrentProg", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentageProg2025", label: "% sui Ricavi", align: "right" as const },
    { key: "valuePreviousProg", label: `${monthName} 2024`, align: "right" as const },
    { key: "percentageProg2024", label: "% sui Ricavi", align: "right" as const },
    { key: "varianceProg", label: "Var €", align: "right" as const },
    { key: "varianceProgPerc", label: "Var %", align: "right" as const },
  ] : [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrentProg", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentageProg2025", label: "% sui Ricavi", align: "right" as const },
  ];

  // ===== TABELLA PUNTUALE =====
  const columnsPunt = hasData2024 ? [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrentPunt", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentagePunt2025", label: "% sui Ricavi", align: "right" as const },
    { key: "valuePreviousPunt", label: `${monthName} 2024`, align: "right" as const },
    { key: "percentagePunt2024", label: "% sui Ricavi", align: "right" as const },
    { key: "variancePunt", label: "Var €", align: "right" as const },
    { key: "variancePuntPerc", label: "Var %", align: "right" as const },
  ] : [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "valueCurrentPunt", label: `${monthName} 2025`, align: "right" as const },
    { key: "percentagePunt2025", label: "% sui Ricavi", align: "right" as const },
  ];

  // Funzione per creare righe della tabella PROGRESSIVA
  const createRowProg = (label: string, field: string, isBold = false, className: string = "") => {
    const currentValueProg = data2025Prog ? (data2025Prog as any)[field] : 0;
    const previousValueProg = hasData2024 && data2024Prog ? (data2024Prog as any)[field] : null;
    const ricaviCurrent = data2025Prog ? (data2025Prog as any).totaleRicavi : 1;
    const ricaviPrevious = data2024Prog ? (data2024Prog as any).totaleRicavi : 1;
    
    const percentageProg2025 = ricaviCurrent !== 0 ? (currentValueProg / ricaviCurrent) * 100 : 0;
    const percentageProg2024 = ricaviPrevious !== 0 ? (previousValueProg || 0) / ricaviPrevious * 100 : 0;
    
    if (hasData2024 && previousValueProg !== null) {
      const varianceProg = calculateVariance(currentValueProg, previousValueProg);
      const varianceEuroProg = currentValueProg - previousValueProg;
      
      return {
        voce: label,
        valueCurrentProg: formatCurrency(currentValueProg),
        percentageProg2025: formatPercentage(percentageProg2025, 1),
        valuePreviousProg: formatCurrency(previousValueProg),
        percentageProg2024: formatPercentage(percentageProg2024, 1),
        varianceProg: previousValueProg === 0 && currentValueProg === 0 ? "n/a" : formatCurrency(varianceEuroProg),
        varianceProgPerc: previousValueProg === 0 && currentValueProg === 0 ? "n/a" : `${varianceProg >= 0 ? '+' : ''}${formatPercentage(varianceProg, 1)}`,
        className: className || (isBold ? "font-bold" : ""),
      };
    } else {
      return {
        voce: label,
        valueCurrentProg: formatCurrency(currentValueProg),
        percentageProg2025: formatPercentage(percentageProg2025, 1),
        className: className || (isBold ? "font-bold" : ""),
      };
    }
  };

  // Funzione per creare righe della tabella PUNTUALE
  const createRowPunt = (label: string, field: string, isBold = false, className: string = "") => {
    const currentValuePunt = data2025Punt ? (data2025Punt as any)[field] : 0;
    const previousValuePunt = hasData2024 && data2024Punt ? (data2024Punt as any)[field] : null;
    const ricaviCurrent = data2025Punt ? (data2025Punt as any).totaleRicavi : 1;
    const ricaviPrevious = data2024Punt ? (data2024Punt as any).totaleRicavi : 1;
    
    const percentagePunt2025 = ricaviCurrent !== 0 ? (currentValuePunt / ricaviCurrent) * 100 : 0;
    const percentagePunt2024 = ricaviPrevious !== 0 ? (previousValuePunt || 0) / ricaviPrevious * 100 : 0;
    
    if (hasData2024 && previousValuePunt !== null) {
      const variancePunt = calculateVariance(currentValuePunt, previousValuePunt);
      const varianceEuroPunt = currentValuePunt - previousValuePunt;
      
      return {
        voce: label,
        valueCurrentPunt: formatCurrency(currentValuePunt),
        percentagePunt2025: formatPercentage(percentagePunt2025, 1),
        valuePreviousPunt: formatCurrency(previousValuePunt),
        percentagePunt2024: formatPercentage(percentagePunt2024, 1),
        variancePunt: previousValuePunt === 0 && currentValuePunt === 0 ? "n/a" : formatCurrency(varianceEuroPunt),
        variancePuntPerc: previousValuePunt === 0 && currentValuePunt === 0 ? "n/a" : `${variancePunt >= 0 ? '+' : ''}${formatPercentage(variancePunt, 1)}`,
        className: className || (isBold ? "font-bold" : ""),
      };
    } else {
      return {
        voce: label,
        valueCurrentPunt: formatCurrency(currentValuePunt),
        percentagePunt2025: formatPercentage(percentagePunt2025, 1),
        className: className || (isBold ? "font-bold" : ""),
      };
    }
  };

  const emptyRowProg = hasData2024 
    ? { 
        voce: "", 
        valueCurrentProg: "", percentageProg2025: "", 
        valuePreviousProg: "", percentageProg2024: "", 
        varianceProg: "", varianceProgPerc: ""
      }
    : { 
        voce: "", 
        valueCurrentProg: "", percentageProg2025: ""
      };

  const emptyRowPunt = hasData2024 
    ? { 
        voce: "", 
        valueCurrentPunt: "", percentagePunt2025: "", 
        valuePreviousPunt: "", percentagePunt2024: "", 
        variancePunt: "", variancePuntPerc: ""
      }
    : { 
        voce: "", 
        valueCurrentPunt: "", percentagePunt2025: ""
      };

  // Dati per la tabella PROGRESSIVA
  const dataProg = [
    createRowProg("Ricavi caratteristici", "ricaviCaratteristici"),
    createRowProg("Altri ricavi", "altriRicavi"),
    createRowProg("TOTALE RICAVI", "totaleRicavi", true, "total-dark"),
    emptyRowProg,
    createRowProg("Servizi diretti", "serviziDiretti"),
    createRowProg("Consulenze dirette", "consulenzeDirette"),
    createRowProg("Servizi informatici web", "serviziInformatici"),
    createRowProg("Servizi cloud", "serviziCloud"),
    createRowProg("COSTI DIRETTI", "costiDiretti", true, "highlight"),
    createRowProg("Altri servizi e prestazioni", "altriServizi"),
    createRowProg("COSTI INDIRETTI", "costiIndiretti", true, "highlight"),
    createRowProg("TOTALE COSTI DIRETTI E INDIRETTI", "totaleCostiDirettiIndiretti", true, "total-dark"),
    createRowProg("GROSS PROFIT", "grossProfit", true, "key-metric"),
    emptyRowProg,
    createRowProg("Autofatture", "autofatture"),
    createRowProg("Rimborsi spese", "rimborsiSpese"),
    createRowProg("Altri proventi", "altriProventi"),
    createRowProg("ALTRI RICAVI NON TIPICI", "ricaviNonTipici", true, "highlight"),
    emptyRowProg,
    createRowProg("Spese viaggio", "speseViaggio"),
    createRowProg("Pedaggi autostradali", "pedaggi"),
    createRowProg("Pubblicità", "pubblicita"),
    createRowProg("Materiale pubblicitario", "materialePubblicitario"),
    createRowProg("Omaggi", "omaggi"),
    createRowProg("Spese di rappresentanza", "speseRappresentanza"),
    createRowProg("Mostre e fiere", "mostreFiere"),
    createRowProg("Servizi commerciali", "serviziCommerciali"),
    createRowProg("Carburante", "carburante"),
    createRowProg("SPESE COMMERCIALI", "speseCommerciali", true, "total-dark"),
    emptyRowProg,
    createRowProg("Beni indeducibili", "beniIndeducibili"),
    createRowProg("Spese generali", "speseGenerali"),
    createRowProg("Materiale vario e di consumo", "materialeConsumo"),
    createRowProg("Spese di pulizia", "spesePulizia"),
    createRowProg("Utenze", "utenze"),
    createRowProg("Assicurazioni", "assicurazioni"),
    createRowProg("Rimanenze", "rimanenze"),
    createRowProg("Tasse e valori bollati", "tasseValori"),
    createRowProg("Sanzioni e multe", "sanzioniMulte"),
    createRowProg("Compensi amministratore", "compensiAmministratore"),
    createRowProg("Rimborsi amministratore", "rimborsiAmministratore"),
    createRowProg("Personale", "personale"),
    createRowProg("Servizi amministrativi contabilità", "serviziAmministrativi"),
    createRowProg("Servizi amministrativi paghe", "serviziAmministrativiPaghe"),
    createRowProg("Consulenze tecniche", "consulenzeTecniche"),
    createRowProg("Consulenze legali", "consulenzeLegali"),
    createRowProg("Locazioni e noleggi", "locazioniNoleggi"),
    createRowProg("Servizi indeducibili", "serviziIndeducibili"),
    createRowProg("Utili e perdite su cambi", "utiliPerditeCambi"),
    createRowProg("Perdite su crediti", "perditeSuCrediti"),
    createRowProg("Licenze d'uso", "licenzeUso"),
    createRowProg("Utenze telefoniche e cellulari", "utenzeTelefoniche"),
    createRowProg("Altri oneri", "altriOneri"),
    createRowProg("Abbuoni e arrotondamenti", "abbuoniArrotondamenti"),
    createRowProg("SPESE DI STRUTTURA", "speseStruttura", true, "total-dark"),
    emptyRowProg,
    createRowProg("TOTALE GESTIONE STRUTTURA", "totaleGestioneStruttura", true, "total-dark"),
    createRowProg("EBITDA", "ebitda", true, "key-metric"),
    emptyRowProg,
    createRowProg("Ammortamenti immateriali", "ammortamentiImmateriali"),
    createRowProg("Ammortamenti materiali", "ammortamentiMateriali"),
    createRowProg("Svalutazioni e accantonamenti", "svalutazioni"),
    createRowProg("AMMORTAMENTI, ACCANT. SVALUTAZIONI", "totaleAmmortamenti", true, "total-dark"),
    emptyRowProg,
    createRowProg("Gestione straordinaria", "gestioneStraordinaria"),
    createRowProg("EBIT", "ebit", true, "key-metric"),
    emptyRowProg,
    createRowProg("Spese e commissioni bancarie", "speseCommissioniBancarie"),
    createRowProg("Interessi passivi su mutui", "interessiPassiviMutui"),
    createRowProg("Altri interessi", "altriInteressi"),
    createRowProg("GESTIONE FINANZIARIA", "gestioneFinanziaria", true, "total-dark"),
    emptyRowProg,
    createRowProg("EBT (Risultato ante imposte)", "ebt", true, "key-metric"),
    createRowProg("Imposte dirette", "imposteDirette"),
    createRowProg("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", "risultatoEsercizio", true, "result"),
  ];

  // Dati per la tabella PUNTUALE
  const dataPunt = [
    createRowPunt("Ricavi caratteristici", "ricaviCaratteristici"),
    createRowPunt("Altri ricavi", "altriRicavi"),
    createRowPunt("TOTALE RICAVI", "totaleRicavi", true, "total-dark"),
    emptyRowPunt,
    createRowPunt("Servizi diretti", "serviziDiretti"),
    createRowPunt("Consulenze dirette", "consulenzeDirette"),
    createRowPunt("Servizi informatici web", "serviziInformatici"),
    createRowPunt("Servizi cloud", "serviziCloud"),
    createRowPunt("COSTI DIRETTI", "costiDiretti", true, "highlight"),
    createRowPunt("Altri servizi e prestazioni", "altriServizi"),
    createRowPunt("COSTI INDIRETTI", "costiIndiretti", true, "highlight"),
    createRowPunt("TOTALE COSTI DIRETTI E INDIRETTI", "totaleCostiDirettiIndiretti", true, "total-dark"),
    createRowPunt("GROSS PROFIT", "grossProfit", true, "key-metric"),
    emptyRowPunt,
    createRowPunt("Autofatture", "autofatture"),
    createRowPunt("Rimborsi spese", "rimborsiSpese"),
    createRowPunt("Altri proventi", "altriProventi"),
    createRowPunt("ALTRI RICAVI NON TIPICI", "ricaviNonTipici", true, "highlight"),
    emptyRowPunt,
    createRowPunt("Spese viaggio", "speseViaggio"),
    createRowPunt("Pedaggi autostradali", "pedaggi"),
    createRowPunt("Pubblicità", "pubblicita"),
    createRowPunt("Materiale pubblicitario", "materialePubblicitario"),
    createRowPunt("Omaggi", "omaggi"),
    createRowPunt("Spese di rappresentanza", "speseRappresentanza"),
    createRowPunt("Mostre e fiere", "mostreFiere"),
    createRowPunt("Servizi commerciali", "serviziCommerciali"),
    createRowPunt("Carburante", "carburante"),
    createRowPunt("SPESE COMMERCIALI", "speseCommerciali", true, "total-dark"),
    emptyRowPunt,
    createRowPunt("Beni indeducibili", "beniIndeducibili"),
    createRowPunt("Spese generali", "speseGenerali"),
    createRowPunt("Materiale vario e di consumo", "materialeConsumo"),
    createRowPunt("Spese di pulizia", "spesePulizia"),
    createRowPunt("Utenze", "utenze"),
    createRowPunt("Assicurazioni", "assicurazioni"),
    createRowPunt("Rimanenze", "rimanenze"),
    createRowPunt("Tasse e valori bollati", "tasseValori"),
    createRowPunt("Sanzioni e multe", "sanzioniMulte"),
    createRowPunt("Compensi amministratore", "compensiAmministratore"),
    createRowPunt("Rimborsi amministratore", "rimborsiAmministratore"),
    createRowPunt("Personale", "personale"),
    createRowPunt("Servizi amministrativi contabilità", "serviziAmministrativi"),
    createRowPunt("Servizi amministrativi paghe", "serviziAmministrativiPaghe"),
    createRowPunt("Consulenze tecniche", "consulenzeTecniche"),
    createRowPunt("Consulenze legali", "consulenzeLegali"),
    createRowPunt("Locazioni e noleggi", "locazioniNoleggi"),
    createRowPunt("Servizi indeducibili", "serviziIndeducibili"),
    createRowPunt("Utili e perdite su cambi", "utiliPerditeCambi"),
    createRowPunt("Perdite su crediti", "perditeSuCrediti"),
    createRowPunt("Licenze d'uso", "licenzeUso"),
    createRowPunt("Utenze telefoniche e cellulari", "utenzeTelefoniche"),
    createRowPunt("Altri oneri", "altriOneri"),
    createRowPunt("Abbuoni e arrotondamenti", "abbuoniArrotondamenti"),
    createRowPunt("SPESE DI STRUTTURA", "speseStruttura", true, "total-dark"),
    emptyRowPunt,
    createRowPunt("TOTALE GESTIONE STRUTTURA", "totaleGestioneStruttura", true, "total-dark"),
    createRowPunt("EBITDA", "ebitda", true, "key-metric"),
    emptyRowPunt,
    createRowPunt("Ammortamenti immateriali", "ammortamentiImmateriali"),
    createRowPunt("Ammortamenti materiali", "ammortamentiMateriali"),
    createRowPunt("Svalutazioni e accantonamenti", "svalutazioni"),
    createRowPunt("AMMORTAMENTI, ACCANT. SVALUTAZIONI", "totaleAmmortamenti", true, "total-dark"),
    emptyRowPunt,
    createRowPunt("Gestione straordinaria", "gestioneStraordinaria"),
    createRowPunt("EBIT", "ebit", true, "key-metric"),
    emptyRowPunt,
    createRowPunt("Spese e commissioni bancarie", "speseCommissioniBancarie"),
    createRowPunt("Interessi passivi su mutui", "interessiPassiviMutui"),
    createRowPunt("Altri interessi", "altriInteressi"),
    createRowPunt("GESTIONE FINANZIARIA", "gestioneFinanziaria", true, "total-dark"),
    emptyRowPunt,
    createRowPunt("EBT (Risultato ante imposte)", "ebt", true, "key-metric"),
    createRowPunt("Imposte dirette", "imposteDirette"),
    createRowPunt("RISULTATO DI ESERCIZIO (UTILE / PERDITA)", "risultatoEsercizio", true, "result"),
  ];

  return (
    <div data-testid="page-ce-mese-specifico">
      {/* Header con link indietro */}
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
        subtitle={`Analisi dettagliata del mese di ${monthName}${hasData2024 ? ` con confronto rispetto a ${monthName} 2024` : ''}`}
      />

      {/* Tabella PROGRESSIVA */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analisi PROGRESSIVA - {monthName} 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columnsProg} 
            data={dataProg}
          />
        </CardContent>
      </Card>

      {/* Tabella PUNTUALE */}
      <Card>
        <CardHeader>
          <CardTitle>Analisi PUNTUALE - {monthName} 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columnsPunt} 
            data={dataPunt}
          />
        </CardContent>
      </Card>
    </div>
  );
}

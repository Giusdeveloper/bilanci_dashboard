// Parser CSV per i file di bilancio mensili
// Gestisce la struttura specifica dei file CSV di Awentia

export interface MonthlyData {
  progressivo2025: Record<string, number>;
  progressivo2024: Record<string, number>;
  puntuale2025: Record<string, number>;
  puntuale2024: Record<string, number>;
}

export interface AllMonthsData {
  [month: string]: MonthlyData;
}

// Mappa dei campi CSV ai nomi delle proprietà
const fieldMapping: Record<string, string> = {
  'Ricavi caratteristici': 'ricaviCaratteristici',
  'Altri ricavi': 'altriRicavi',
  'TOTALE RICAVI': 'totaleRicavi',
  'Servizi diretti': 'serviziDiretti',
  'Cosulenze dirette': 'consulenzeDirette', // Nota: c'è un typo nel CSV originale
  'Servizi informatici web': 'serviziInformatici',
  'Servizi cloud': 'serviziCloud',
  'COSTI DIRETTI': 'costiDiretti',
  'Altri servizi e prestazioni': 'altriServizi',
  'COSTI INDIRETTI': 'costiIndiretti',
  'TOTALE COSTI DIRETTI E INDIRETTI': 'totaleCostiDirettiIndiretti',
  'GROSS PROFIT': 'grossProfit',
  'Autofatture': 'autofatture',
  'Rimborsi spese': 'rimborsiSpese',
  'Altri proventi': 'altriProventi',
  'ALTRI RICAVI NON TIPICI': 'ricaviNonTipici',
  'Spese viaggio': 'speseViaggio',
  'Pedaggi autostradali': 'pedaggi',
  'Pubblicità': 'pubblicita',
  'Materiale pubblicitario': 'materialePubblicitario',
  'Omaggi': 'omaggi',
  'Spese di rappresentanza': 'speseRappresentanza',
  'Mostre e fiere': 'mostreFiere',
  'Servizi commerciali': 'serviziCommerciali',
  'Carburante': 'carburante',
  'SPESE COMMERCIALI': 'speseCommerciali',
  'Beni indeducibili': 'beniIndeducibili',
  'Spese generali': 'speseGenerali',
  'Materiale vario e di consumo': 'materialeConsumo',
  'Spese di pulizia': 'spesePulizia',
  'Utenze': 'utenze',
  'Assicurazioni': 'assicurazioni',
  'Rimanenze': 'rimanenze',
  'Tasse e valori bollati': 'tasseValori',
  'Sanzioni e multe': 'sanzioniMulte',
  'Compensi amministratore': 'compensiAmministratore',
  'Rimborsi amministratore': 'rimborsiAmministratore',
  'Personale': 'personale',
  'Servizi amministrativi contabilità': 'serviziAmministrativi',
  'Servizi amministrativi paghe': 'serviziAmministrativiPaghe',
  'Consulenze tecniche': 'consulenzeTecniche',
  'Consulenze legali': 'consulenzeLegali',
  'Locazioni e noleggi': 'locazioniNoleggi',
  'Servizi indeducibili': 'serviziIndeducibili',
  'Utili e perdite su cambi': 'utiliPerditeCambi',
  'Perdite su crediti': 'perditeSuCrediti',
  'Licenze d\'uso': 'licenzeUso',
  'Utenze telefoniche e cellulari': 'utenzeTelefoniche',
  'Altri oneri': 'altriOneri',
  'Abbuoni e arrotondamenti': 'abbuoniArrotondamenti',
  'SPESE DI STRUTTURA': 'speseStruttura',
  'TOTALE GESTIONE STRUTTURA': 'totaleGestioneStruttura',
  'EBITDA': 'ebitda',
  'Ammortamenti immateriali': 'ammortamentiImmateriali',
  'Ammortamenti materiali': 'ammortamentiMateriali',
  'Svalutazioni e accantonamenti': 'svalutazioni',
  'AMMORTAMENTI, ACCANT. SVALUTAZIONI': 'totaleAmmortamenti',
  'Gestione straordinaria': 'gestioneStraordinaria',
  'EBIT': 'ebit',
  'Spese e commissioni bancarie': 'speseCommissioniBancarie',
  'Interessi passivi su mutui': 'interessiPassiviMutui',
  'Altri interessi': 'altriInteressi',
  'GESTIONE FINANZIARIA': 'gestioneFinanziaria',
  'EBT (Risultato ante imposte)': 'ebt',
  'Imposte dirette': 'imposteDirette',
  'RISULTATO DI ESERCIZIO (UTILE / PERDITA)': 'risultatoEsercizio',
};

// Funzione per pulire e convertire un valore numerico dal CSV
function parseNumericValue(value: string): number {
  if (!value || value.trim() === '' || value === '0' || value === '#DIV/0!' || value === '#ERROR!' || value === 'n/a') {
    return 0;
  }
  
  // Rimuove spazi e converte virgole in punti
  const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
  
  // Rimuove caratteri non numerici tranne il segno meno e il punto
  const numericOnly = cleaned.replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(numericOnly);
  return isNaN(parsed) ? 0 : parsed;
}

// Funzione per estrarre i dati da una riga del CSV
function extractRowData(row: string[]): { field: string; progressivo2025: number; progressivo2024: number; puntuale2025: number; puntuale2024: number } | null {
  if (row.length < 4) return null;
  
  const fieldName = row[1]?.trim();
  if (!fieldName || !fieldMapping[fieldName]) return null;
  
  return {
    field: fieldMapping[fieldName],
    progressivo2025: parseNumericValue(row[3] || '0'), // Colonna D
    progressivo2024: parseNumericValue(row[6] || '0'), // Colonna G
    puntuale2025: parseNumericValue(row[12] || '0'), // Colonna M
    puntuale2024: parseNumericValue(row[15] || '0'), // Colonna P
  };
}

// Funzione principale per parsare un file CSV
export function parseCSVFile(csvContent: string): MonthlyData {
  const lines = csvContent.split('\n');
  const data: MonthlyData = {
    progressivo2025: {},
    progressivo2024: {},
    puntuale2025: {},
    puntuale2024: {},
  };
  
  // Salta le prime 3 righe (header) e processa i dati
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = line.split(',');
    const rowData = extractRowData(row);
    
    if (rowData) {
      data.progressivo2025[rowData.field] = rowData.progressivo2025;
      data.progressivo2024[rowData.field] = rowData.progressivo2024;
      data.puntuale2025[rowData.field] = rowData.puntuale2025;
      data.puntuale2024[rowData.field] = rowData.puntuale2024;
    }
  }
  
  return data;
}

// Funzione per caricare tutti i mesi disponibili
export async function loadAllMonthsData(): Promise<AllMonthsData> {
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio'];
  const allData: AllMonthsData = {};
  
  for (const month of months) {
    try {
      // In un'applicazione reale, questi file sarebbero caricati dal server
      // Per ora, simuliamo il caricamento
      const response = await fetch(`/attached_assets/[2025] Analisi Bilanci al 31 agosto Awentia _CE dettaglio - ${month.charAt(0).toUpperCase() + month.slice(1)}.csv`);
      if (response.ok) {
        const csvContent = await response.text();
        allData[month] = parseCSVFile(csvContent);
      }
    } catch (error) {
      console.warn(`Impossibile caricare i dati per ${month}:`, error);
      // Per ora, usiamo dati vuoti se il caricamento fallisce
      allData[month] = {
        progressivo2025: {},
        progressivo2024: {},
        puntuale2025: {},
        puntuale2024: {},
      };
    }
  }
  
  return allData;
}
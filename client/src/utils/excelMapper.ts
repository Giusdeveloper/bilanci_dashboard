
// Map Excel Labels to Internal Keys
export const EXCEL_ROW_MAP: Record<string, string> = {
    // Ricavi
    "Ricavi caratteristici": "ricaviCaratteristici",
    "Altri ricavi": "altriRicavi",
    "TOTALE RICAVI": "totaleRicavi",

    // Costi Diretti
    "Servizi diretti": "serviziDiretti",
    "Cosulenze dirette": "consulenzeDirette", // Typo in Excel handled
    "Consulenze dirette": "consulenzeDirette",
    "Servizi informatici web": "serviziInformatici",
    "Servizi cloud": "serviziCloud",
    "COSTI DIRETTI": "costiDiretti",

    // Costi Indiretti
    "Altri servizi e prestazioni": "altriServizi",
    "COSTI INDIRETTI": "costiIndiretti",
    "TOTALE COSTI DIRETTI E INDIRETTI": "totaleCostiDirettiIndiretti",
    "GROSS PROFIT": "grossProfit",

    // Altri Ricavi Non Tipici
    "Autofatture": "autofatture",
    "Rimborsi spese": "rimborsiSpese",
    "Altri proventi": "altriProventi",
    "ALTRI RICAVI NON TIPICI": "ricaviNonTipici",

    // Spese Commerciali
    "Spese viaggio": "speseViaggio",
    "Pedaggi autostradali": "pedaggi",
    "Pubblicità": "pubblicita",
    "Materiale pubblicitario": "materialePubblicitario",
    "Omaggi": "omaggi",
    "Spese di rappresentanza": "speseRappresentanza",
    "Mostre e fiere": "mostreFiere",
    "Servizi commerciali": "serviziCommerciali",
    "Carburante": "carburante",
    "SPESE COMMERCIALI": "speseCommerciali",

    // Spese Generali / Struttura
    "Beni indeducibili": "beniIndeducibili",
    "Spese generali": "speseGenerali",
    "Materiale vario e di consumo": "materialeConsumo",
    "Spese di pulizia": "spesePulizia",
    "Utenze": "utenze",
    "Assicurazioni": "assicurazioni",
    "Rimanenze": "rimanenze",
    "Tasse e valori bollati": "tasseValori",
    "Sanzioni e multe": "sanzioniMulte",
    "Compensi amministratore": "compensiAmministratore",
    "Rimborsi amministratore": "rimborsiAmministratore",
    "Personale": "personale",
    "Servizi amministrativi contabilità": "serviziAmministrativi",
    "Servizi amministrativi paghe": "serviziAmministrativiPaghe",
    "Consulenze tecniche": "consulenzeTecniche",
    "Consulenze legali": "consulenzeLegali",
    "Locazioni e noleggi": "locazioniNoleggi",
    "Servizi indeducibili": "serviziIndeducibili",
    "Utili e perdite su cambi": "utiliPerditeCambi",
    "Perdite su crediti": "perditeSuCrediti",
    "Licenze d'uso": "licenzeUso",
    "Utenze telefoniche e cellulari": "utenzeTelefoniche",
    "Altri oneri": "altriOneri",
    "Abbuoni e arrotondamenti": "abbuoniArrotondamenti",
    "SPESE DI STRUTTURA": "speseStruttura",
    "TOTALE GESTIONE STRUTTURA E NON TIPICA": "totaleGestioneStruttura", // MAPPED
    "TOTALE GESTIONE STRUTTURA": "totaleGestioneStruttura",

    // Margini
    "EBITDA": "ebitda",

    // Ammortamenti
    "Ammortamenti immateriali": "ammortamentiImmateriali",
    "Ammortamenti materiali": "ammortamentiMateriali",
    "Svalutazioni e accantonamenti": "svalutazioni",
    "AMMORTAMENTI, ACCANT. SVALUTAZIONI": "totaleAmmortamenti", // Key used in Detail
    "ammortamenti e svalutazioni": "totaleAmmortamenti", // Variation

    // Gestioni Varie
    "Gestione straordinaria": "gestioneStraordinaria",
    "EBIT": "ebit",

    // Finanziaria
    "Spese e commissioni bancarie": "speseCommissioniBancarie",
    "Interessi passivi su mutui": "interessiPassiviMutui",
    "Altri interessi": "altriInteressi",
    "GESTIONE FINANZIARIA": "gestioneFinanziaria",

    // Risultati finali
    "EBT": "ebt",
    "RISULTATO ANTE IMPOSTE": "ebt",
    "Imposte dirette": "imposteDirette",
    "Imposte": "imposteDirette",
    "RISULTATO DELL'ESERCIZIO": "risultatoEsercizio",
    "RISULTATO DI ESERCIZIO (UTILE / PERDITA)": "risultatoEsercizio",
    "UTILE (PERDITA) DELL'ESERCIZIO": "risultatoEsercizio",
    "Risultato d'esercizio": "risultatoEsercizio",
    "Risultato netto": "risultatoEsercizio",

    // Extra found in monthly
    "Merci": "merci",

    // Sherpa42 Mappings
    "Ricavi da attività di consulenza": "ricaviCaratteristici",
    "Ricavi da attività legate ad outcome/success fee": "ricaviCaratteristici",
    "Ricavi da fee \"Sherpa as a Service\"": "ricaviCaratteristici",
    "Ricavi da Provvigioni": "ricaviCaratteristici",
    "Ricavi da Contributi/Bandi": "ricaviCaratteristici",
    "Ricavi da Capitalizzazioni": "ricaviCaratteristici",
    "Ricavi non caratteristici": "altriRicavi",
    "Totale ricavi complessivi": "totaleRicavi",
    "Costi collaboratori a partita iva": "costiServizi",
    "Costi per fee di segnalazione": "costiServizi",
    "Costi connessi alla delivery corsi/eventi": "costiServizi",
    "Consulenze e servizi esterni": "costiServizi",
    "Costi per Bandi": "costiServizi",
    "Costi per Formazione e TeamBuilding": "costiServizi",
    "Costi per Sherpa Platform(R&D)": "costiServizi",
    "Costi Board": "compensiAmministratore",
    "Costo IT/Tool e Software": "serviziInformatici",
    "Spese Commerciali e Marketing": "speseCommerciali",
    "Spese di Struttura": "speseStruttura",
    "Spese per benefit": "personale",
    "Totale costi fissi gestione caratteristica": "totaleGestioneStruttura",
    "Primo Margine": "grossProfit",
    "Costi del Personale per delivery": "personale",
    "Costi del Personale per sviluppo business": "personale",
    "Costi del Personale per sviluppo ip": "personale"
};

export interface CEDettaglioData {
    progressivo2025: Record<string, number>;
    progressivo2024: Record<string, number>;
}

export interface CEDettaglioMensileData {
    progressivo2025: Record<string, number[] | string[]>;
}

export interface CESinteticoData {
    progressivo2025: Record<string, number>;
    progressivo2024: Record<string, number>;
}

export interface CESinteticoMensileData {
    progressivo2025: Record<string, number[] | string[]>;
}

/**
 * labelMapping — modulo PURO (nessuna dipendenza da React/Supabase/xlsx a runtime).
 *
 * Contiene il dizionario di mapping etichetta Excel -> chiave canonica interna
 * (`EXCEL_ROW_MAP`) e la funzione `getCanonicalKey` che normalizza un'etichetta
 * arbitraria nella chiave canonica corrispondente.
 *
 * NOTA ARCHITETTURALE: alcuni mapping qui presenti sono azienda-specifici
 * (es. le voci "Sherpa42"). In futuro questi mapping per-azienda andranno spostati
 * in una tabella `account_mappings` per-azienda, lasciando qui solo il dizionario
 * "canonico" condiviso. Per ora vengono mantenuti per retro-compatibilità.
 */

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
    "MARGINE": "grossProfit",

    // Altri Ricavi Non Tipici
    "Autofatture": "autofatture",
    "Rimborsi spese": "rimborsiSpese",
    "Altri proventi": "altriProventi",
    "ALTRI RICAVI NON TIPICI": "ricaviNonTipici",
    "Ricavi non tipici": "ricaviNonTipici",

    // Spese Commerciali
    "Spese viaggio": "speseViaggio",
    "Pedaggi autostradali": "pedaggi",
    "Pubblicità": "pubblicita",
    "Materiale pubblicitario": "materialePubblicitario",
    "Omaggi": "omaggi",
    "Spese di rappresentanza": "speseRappresentanza",
    "Mostre e fiere": "mostreFiere",
    "Servizi commerciali": "serviziCommerciali",
    "Costi commerciali": "speseCommerciali",
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

    // Sherpa42 Mappings (azienda-specifici: futuri candidati per account_mappings)
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

/**
 * Restituisce la chiave canonica interna a partire da un'etichetta Excel.
 *
 * Strategia:
 *  1. match esatto su `EXCEL_ROW_MAP`;
 *  2. match sul testo normalizzato in maiuscolo;
 *  3. euristiche fuzzy (azienda-specifiche e generiche).
 *
 * @returns la chiave canonica, oppure `null` se nessuna corrispondenza.
 */
export const getCanonicalKey = (label: unknown): string | null => {
    if (!label) return null;
    const strLabel = String(label).trim();

    // 1. Exact match via map
    if (EXCEL_ROW_MAP[strLabel]) return EXCEL_ROW_MAP[strLabel];

    // 2. Fuzzy / Smart match replacements
    const cleanLabel = strLabel.toUpperCase().replace(/\s+/g, ' ');

    // 2b. Check map with uppercase label (handles "Gross Profit" -> "GROSS PROFIT")
    if (EXCEL_ROW_MAP[cleanLabel]) return EXCEL_ROW_MAP[cleanLabel];

    const labelLower = strLabel.toLowerCase().replace(/\s+/g, '');

    // Sherpa42 Specific Mappings
    if (labelLower.includes('costiboard')) return "compensiAmministratore";
    if (labelLower.includes('costoit') || labelLower.includes('tool')) return "serviziInformatici";
    if (labelLower.includes('spesecommercialie') || labelLower.includes('spesecommerciali')) return "speseCommerciali";
    if (labelLower.includes('spesedistruttura')) return "speseStruttura";
    if (labelLower.includes('speseperbenefit')) return "personale";
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavicaratteristici') || labelLower.includes('1-totalericavi')) return "ricaviCaratteristici";

    // Generic Mappings
    if (cleanLabel.includes("TOTALE RICAVI")) return "totaleRicavi";
    if (cleanLabel.includes("RISULTATO") && cleanLabel.includes("ESERCIZIO")) return "risultatoEsercizio";
    if (cleanLabel.includes("UTILE") && cleanLabel.includes("PERDITA")) return "risultatoEsercizio";
    if (cleanLabel.includes("EBITDA") || cleanLabel.includes("MARGINEMOL")) return "ebitda";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";

    // Sherpa42 Specific Mappings (Monthly Sheet)
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavidaattivitàdiconsulenza')) return "ricaviCaratteristici";
    if (labelLower.includes('ricavilegateadobiettivi') || labelLower.includes('obiettivivariabiali')) return "ricaviCaratteristici";

    // Ammortamenti & Gestione Finanziaria
    if (labelLower.includes('ammortamentiimmateriali')) return "ammortamentiImmateriali";
    if (labelLower.includes('ammortamentimateriali')) return "ammortamentiMateriali";
    if (labelLower.includes('svalutazionieaccantonamenti')) return "svalutazioni";

    // Explicitly handle the compound label found in many reports
    if (cleanLabel.includes("AMMORTAMENTI") && (cleanLabel.includes("ACCANT") || cleanLabel.includes("SVALUT"))) return "totaleAmmortamenti";
    if (cleanLabel === "AMMORTAMENTI") return "totaleAmmortamenti";
    if (labelLower.includes("ammortamentiesvalutazioni")) return "totaleAmmortamenti";

    // Try simplified key matching for Totals
    if (cleanLabel.includes("TOTALE COSTI FISSI")) return "totaleGestioneStruttura";
    if (cleanLabel.includes("TOTALECOSTIFISSI")) return "totaleGestioneStruttura";

    // Key Financials
    if (cleanLabel.includes("GESTIONE FINANZIARIA")) return "gestioneFinanziaria";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";
    if (cleanLabel.includes("RISULTATO") || cleanLabel.includes("UTILE") || cleanLabel.includes("EBT")) return "risultatoEsercizio";

    return null;
};

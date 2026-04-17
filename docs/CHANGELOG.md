# Changelog - Gemini Dashboard

Tutte le modifiche rilevanti apportate al progetto, focalizzate su integrità dei dati, allineamento Excel e miglioramenti UI.

## [1.1.0] - 2026-04-08 (Sessione Odierna)

### ✅ Integrità dei Dati e Calcoli
- **Risoluzione "Totale Costi"**: Corretto il calcolo nella Dashboard Generale per includere `Costi Operativi + Ammortamenti + Gestione Finanziaria + Imposte`.
- **Equazione di Verifica**: Implementata la regola `Ricavi - Costi = Risultato d'Esercizio`.
- **Fix Margine (Gross Profit)**: Il calcolo ora sottrae correttamente sia i Costi Diretti che i Costi Indiretti, allineandosi ai report Excel.
- **Integrità Subtotali**: Modificato il parser per utilizzare i subtotali calcolati in Excel (es. TOTALE STRUTTURA) evitando ricalcoli manuali che causavano doppi conteggi.
- **Riparazione Retroattiva**: Eseguito script di manutenzione per correggere i dati storici di Maia Management e Sherpa42.

### 📊 Allineamento Strutturale (Awentia & Sherpa42)
- **CE Sintetico Speculare**: Riprogettata la vista per riflettere esattamente il foglio "3_CE sintetico" dei file sorgente.
- **Standardizzazione Etichette**: Uniformate le voci in tutte le viste (Sintetico, Dettaglio, Mensile):
    - "TOTALE STRUTTURA" (ex "Gestione Struttura e Non Tipica").
    - "RISULTATO DELL'ESERCIZIO".
- **Mappatura Voci Mancanti**: Ripristinati i dati per "Altre spese di funzionamento" e "Servizi contabili e paghe".

### 🎨 UI/UX e Visualizzazione
- **Stilizzazione Tabelle**:
    - Sfondi colorati per righe totali.
    - Evidenziazione blu per KPI (EBITDA, Margine).
    - Evidenziazione gialla per Risultato d'Esercizio.
- **Fix Sticky Columns**: Risolto problema di trasparenza nelle colonne fisse (ora hanno sfondo solido durante lo scroll).
- **KPI Card**: Aggiunte variazioni percentuali vs 2024 (Var %) con indicatori di tendenza positivi/negativi.
- **Robustezza Frontend**: Aggiunti fallback `|| 0` per prevenire errori `NaN` in assenza di dati.

### ⚙️ Manutenzione e Sviluppo
- **GEMINI.md**: Aggiornati i mandati tecnici per prevenire regressioni nei calcoli finanziari.
- **Script di Import**: Ottimizzato `reimport_awentia_dec.ts` con gestione automatica di pulizia e ricaricamento.
- **GitHub**: Sincronizzazione completa del repository con risoluzione conflitti.

---

## [1.0.0] - Febbraio 2026 (Stato Precedente)
- Riprogettazione tabella Dashboard per focus su macro-aggregati.
- Filtro Partitari limitato ai conti economici (58/ - 88/).
- Implementazione scroll orizzontale su viste mensili.

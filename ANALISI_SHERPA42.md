# Analisi Problema Caricamento Dati Sherpa42 da Supabase

## 📋 Riepilogo Analisi Applicativo

### 1. Architettura del Sistema

L'applicativo utilizza:
- **Frontend**: React + TypeScript con Vite
- **Backend/Database**: Supabase (PostgreSQL)
- **State Management**: React Context (`FinancialDataContext`)
- **Data Fetching**: Supabase Client SDK

### 2. Flusso di Caricamento Dati

```
1. App.tsx → FinancialDataProvider
2. FinancialDataContext carica le aziende dalla tabella `companies`
3. CompanySelector permette di selezionare un'azienda
4. Dashboard carica i dati usando `getDashboardData(companyId)`
5. getDashboardData cerca nella tabella `financial_data` con filtri:
   - company_id = selectedCompany.id
   - data_type = 'dashboard'
   - year = 2025
   - month = 8 (poi prova 9, null, o nessun filtro)
```

### 3. Struttura Database

**Tabella `companies`:**
- `id` (UUID, PK)
- `name` (string)
- `slug` (string)
- `created_at` (timestamp)

**Tabella `financial_data`:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies.id)
- `data_type` (string): 'dashboard', 'ce-dettaglio', 'ce-sintetico', ecc.
- `year` (integer)
- `month` (integer | null)
- `data` (JSONB)
- `created_at` (timestamp)

### 4. Struttura Dati Dashboard

Il sistema supporta **due strutture dati**:

**Struttura Standard (Awentia):**
```json
{
  "kpis": { ... },
  "monthlyTrend": { labels: [], ricavi: [], ebitda: [] },
  "summary": [ ... ]
}
```

**Struttura Alternativa (Sherpa42):**
```json
{
  "kpis": { ... },
  "trends": { monthlyTrend: { ... } },
  "table": [ ... ]
}
```

La dashboard converte automaticamente la struttura alternativa in quella standard (vedi `dashboard.tsx` linee 86-93).

---

## 🔍 Verifica su Supabase

### Step 1: Verificare Esistenza Azienda

**Query SQL:**
```sql
SELECT id, name, slug, created_at 
FROM companies 
WHERE name ILIKE '%sherpa42%' OR name ILIKE '%sherpa%' 
   OR slug ILIKE '%sherpa42%' OR slug ILIKE '%sherpa%';
```

**Possibili scenari:**
- ✅ **Azienda esiste**: Procedere con Step 2
- ❌ **Azienda non esiste**: Creare l'azienda prima di procedere

### Step 2: Verificare Dati Finanziari

**Query SQL:**
```sql
SELECT id, data_type, year, month, created_at, 
       jsonb_object_keys(data) as data_keys
FROM financial_data 
WHERE company_id = '{SHERPA42_ID}'
ORDER BY created_at DESC;
```

**Query specifica per Dashboard:**
```sql
SELECT id, year, month, data->'kpis' as kpis,
       data->'monthlyTrend' as monthlyTrend,
       data->'summary' as summary,
       data->'trends' as trends,
       data->'table' as table
FROM financial_data 
WHERE company_id = '{SHERPA42_ID}' 
  AND data_type = 'dashboard'
ORDER BY created_at DESC;
```

### Step 3: Usare Script di Diagnostica

**Nella console del browser (F12):**
```javascript
checkSherpa42Data()
```

Questo script verificherà:
- ✅ Esistenza azienda Sherpa42
- ✅ Presenza dati finanziari
- ✅ Struttura dei dati (standard vs alternativa)
- ✅ Completezza dei dati dashboard

---

## 🎯 Pianificazione Soluzione

### Scenario A: Sherpa42 non esiste nella tabella `companies`

**Soluzione:**
1. Creare l'azienda Sherpa42 in Supabase:
   ```sql
   INSERT INTO companies (name, slug) 
   VALUES ('Sherpa42', 'sherpa42') 
   RETURNING *;
   ```
2. Salvare l'ID restituito
3. Procedere con Scenario B o C

### Scenario B: Sherpa42 esiste ma non ha dati finanziari

**Soluzione:**
1. Ottenere l'ID di Sherpa42:
   ```sql
   SELECT id FROM companies WHERE name ILIKE '%sherpa42%';
   ```
2. Caricare i dati usando uno dei metodi:
   
   **Metodo 1: Funzione JavaScript (se i dati sono in `financialData.ts`)**
   - Modificare `loadFinancialDataToSupabase.ts` per supportare Sherpa42
   - Oppure creare una nuova funzione `loadSherpa42DataToSupabase()`
   
   **Metodo 2: SQL diretto**
   - Usare lo script `scripts/load-financial-data.sql`
   - Sostituire `{COMPANY_ID}` con l'ID di Sherpa42
   - Inserire i dati JSON corretti

### Scenario C: Sherpa42 esiste e ha dati ma non vengono caricati

**Possibili cause:**
1. **Struttura dati non riconosciuta**: I dati hanno una struttura diversa da quella attesa
2. **Filtri year/month non corrispondenti**: I dati sono salvati con year/month diversi da quelli cercati
3. **Errore nella conversione struttura alternativa**: La conversione da struttura alternativa a standard fallisce

**Soluzione:**
1. Verificare la struttura esatta dei dati con `checkSherpa42Data()`
2. Se necessario, aggiornare la logica di conversione in `dashboard.tsx`
3. Se i dati hanno year/month diversi, aggiornare `getDashboardData()` per cercare anche altri valori

### Scenario D: Dati parziali o incompleti

**Soluzione:**
1. Identificare i dati mancanti con `checkSupabaseData()`
2. Caricare i dati mancanti usando SQL o la funzione JavaScript
3. Verificare che tutti i tipi di dati siano presenti:
   - `dashboard`
   - `ce-dettaglio`
   - `ce-dettaglio-mensile`
   - `ce-sintetico`
   - `ce-sintetico-mensile`
   - `partitari`

---

## 🛠️ Azioni Immediate

### 1. Eseguire Diagnostica

Aprire la console del browser e eseguire:
```javascript
checkSherpa42Data()
```

### 2. In base ai risultati:

**Se Sherpa42 non esiste:**
- Creare l'azienda in Supabase (vedi Scenario A)

**Se Sherpa42 esiste ma non ha dati:**
- Caricare i dati (vedi Scenario B)

**Se Sherpa42 ha dati ma non vengono caricati:**
- Analizzare la struttura dati
- Verificare i filtri year/month
- Aggiornare la logica di caricamento se necessario

### 3. Verificare Risultato

Dopo aver applicato la soluzione:
```javascript
checkSupabaseData()  // Verifica tutte le aziende
checkSherpa42Data()  // Verifica specificamente Sherpa42
```

---

## 📝 Note Tecniche

### Funzioni Utili Disponibili nella Console

- `checkSupabaseData()`: Verifica tutti i dati di tutte le aziende
- `checkCompanyData(companyId)`: Verifica dettagliata per una specifica azienda
- `checkSherpa42Data()`: Diagnostica specifica per Sherpa42
- `loadFinancialDataToSupabase()`: Carica dati di Awentia (hardcoded)

### File Chiave del Codice

- `client/src/contexts/FinancialDataContext.tsx`: Gestione stato e caricamento dati
- `client/src/pages/dashboard.tsx`: Visualizzazione dashboard con conversione struttura
- `client/src/utils/checkSupabaseData.ts`: Funzioni di verifica
- `client/src/utils/loadFinancialDataToSupabase.ts`: Funzione di caricamento (solo Awentia)
- `client/src/utils/checkSherpa42Data.ts`: Diagnostica Sherpa42 (nuovo)

### Prossimi Sviluppi Suggeriti

1. **Generalizzare `loadFinancialDataToSupabase()`**: Permettere di specificare l'azienda come parametro
2. **Aggiungere validazione struttura dati**: Verificare che i dati caricati abbiano la struttura corretta
3. **Migliorare gestione errori**: Mostrare messaggi più chiari quando i dati non vengono trovati
4. **Aggiungere test**: Test automatici per verificare il caricamento dati


# Script per caricare dati finanziari in Supabase

## Metodo 1: Funzione JavaScript (Consigliato)

### Caricare dati mancanti di Awentia

1. Apri la console del browser (F12 → Console)
2. Esegui: `loadFinancialDataToSupabase()`
3. La funzione caricherà automaticamente:
   - CE Dettaglio
   - CE Sintetico
   - CE Sintetico Mensile
   - Partitari

### Verificare i dati caricati

Dopo il caricamento, esegui: `checkSupabaseData()` per verificare che tutti i dati siano stati caricati correttamente.

## Metodo 2: Script SQL diretto

Per caricare dati di nuove aziende (es. Sherpa42) o per modifiche manuali:

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Apri il file `load-financial-data.sql`
3. Sostituisci i placeholder:
   - `{COMPANY_ID}`: ID dell'azienda (UUID)
   - `{YEAR}`: Anno (es. 2025)
   - `{MONTH}`: Mese (1-12) o NULL per dati progressivi
   - `{DATA_TYPE}`: Tipo di dato
   - `{JSON_DATA}`: Dati JSON formattati

### Esempio per Sherpa42

```sql
-- Prima trova l'ID di Sherpa42
SELECT id, name FROM companies WHERE name LIKE '%Sherpa42%';

-- Poi usa l'ID trovato (es. 0fb5063a-4b54-4ab1-ae2b-afd04865a1a1)
INSERT INTO financial_data (company_id, data_type, data, year, month)
VALUES (
  '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1'::uuid,
  'dashboard',
  '{
    "kpis": {
      "ricavi2025": 100000,
      "ricavi2024": 50000,
      ...
    }
  }'::jsonb,
  2025,
  8
)
ON CONFLICT (company_id, data_type, year, month) 
DO UPDATE SET 
  data = EXCLUDED.data,
  created_at = NOW();
```

## Struttura dati

I tipi di dati supportati sono:
- `dashboard`: KPIs, trend mensili, summary
- `ce-dettaglio`: Conto Economico dettagliato (progressivo 2025 e 2024)
- `ce-dettaglio-mensile`: CE Dettaglio con dati mensili
- `ce-sintetico`: Conto Economico sintetico (progressivo 2025 e 2024)
- `ce-sintetico-mensile`: CE Sintetico con dati mensili
- `partitari`: Dati partitari (headers + data array)

## Note

- I dati JSON devono essere formattati correttamente come stringa JSON valida
- Usa `::jsonb` per convertire la stringa JSON in tipo JSONB di PostgreSQL
- `ON CONFLICT` aggiorna i dati esistenti invece di creare duplicati
- Per dati progressivi annuali, usa `month: NULL`
- Per dati mensili, specifica il mese (1-12)


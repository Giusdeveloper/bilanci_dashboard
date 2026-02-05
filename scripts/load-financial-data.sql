-- Script SQL per caricare dati finanziari direttamente in Supabase
-- 
-- Istruzioni:
-- 1. Vai su Supabase Dashboard → SQL Editor
-- 2. Sostituisci i placeholder:
--    - {COMPANY_ID}: ID dell'azienda (UUID)
--    - {YEAR}: Anno (es. 2025)
--    - {MONTH}: Mese (1-12) o NULL per dati progressivi annuali
--    - {DATA_TYPE}: Tipo di dato (dashboard, ce-dettaglio, ce-sintetico, ecc.)
--    - {JSON_DATA}: Dati JSON formattati correttamente
-- 3. Esegui la query
--
-- NOTA: I dati JSON devono essere formattati come stringa JSON valida
--       e poi convertiti in JSONB usando ::jsonb

-- ============================================
-- ESEMPIO 1: Caricare CE Dettaglio
-- ============================================
INSERT INTO financial_data (company_id, data_type, data, year, month)
VALUES (
  '{COMPANY_ID}'::uuid,  -- Sostituisci con l'ID dell'azienda
  'ce-dettaglio',
  '{
    "progressivo2025": {
      "ricaviCaratteristici": 219789,
      "altriRicavi": 11347,
      "totaleRicavi": 231136,
      "serviziDiretti": 14289,
      "consulenzeDirette": 0,
      "serviziInformatici": 806,
      "serviziCloud": 0,
      "costiDiretti": 15095,
      "altriServizi": 1750,
      "costiIndiretti": 1750,
      "totaleCostiDirettiIndiretti": 16845,
      "grossProfit": 214290,
      "autofatture": 0,
      "rimborsiSpese": 0,
      "altriProventi": 0,
      "ricaviNonTipici": 0,
      "speseViaggio": 3031,
      "pedaggi": 0,
      "pubblicita": 0,
      "materialePubblicitario": 0,
      "omaggi": 0,
      "speseRappresentanza": 4562,
      "mostreFiere": 5890,
      "serviziCommerciali": 443,
      "carburante": 1352,
      "speseCommerciali": 15279,
      "beniIndeducibili": 2182,
      "speseGenerali": 23150,
      "materialeConsumo": 0,
      "spesePulizia": 0,
      "utenze": 826,
      "assicurazioni": 171,
      "rimanenze": 0,
      "tasseValori": 585,
      "sanzioniMulte": 371,
      "compensiAmministratore": 0,
      "rimborsiAmministratore": 0,
      "personale": 137119,
      "serviziAmministrativi": 12617,
      "serviziAmministrativiPaghe": 0,
      "consulenzeTecniche": 29150,
      "consulenzeLegali": 1794,
      "locazioniNoleggi": 7133,
      "serviziIndeducibili": 1052,
      "utiliPerditeCambi": 513,
      "perditeSuCrediti": 0,
      "licenzeUso": 0,
      "utenzeTelefoniche": 226,
      "altriOneri": 3288,
      "abbuoniArrotondamenti": 12,
      "speseStruttura": 220189,
      "totaleGestioneStruttura": 235468,
      "ebitda": -21178,
      "ammortamentiImmateriali": 34520,
      "ammortamentiMateriali": 571,
      "svalutazioni": 0,
      "totaleAmmortamenti": 35091,
      "gestioneStraordinaria": 0,
      "ebit": -56268,
      "speseCommissioniBancarie": 257,
      "interessiPassiviMutui": 1170,
      "altriInteressi": 176,
      "gestioneFinanziaria": 1603,
      "ebt": -57871,
      "imposteDirette": 0,
      "risultatoEsercizio": -57871
    },
    "progressivo2024": {
      "ricaviCaratteristici": 43656,
      "altriRicavi": 0,
      "totaleRicavi": 43656,
      "serviziDiretti": 1710,
      "consulenzeDirette": 0,
      "serviziInformatici": 0,
      "serviziCloud": 0,
      "costiDiretti": 1710,
      "altriServizi": 5500,
      "costiIndiretti": 5500,
      "totaleCostiDirettiIndiretti": 7210,
      "grossProfit": 36446,
      "autofatture": 0,
      "rimborsiSpese": 0,
      "altriProventi": 0,
      "ricaviNonTipici": 0,
      "speseViaggio": 0,
      "pedaggi": 0,
      "pubblicita": 0,
      "materialePubblicitario": 0,
      "omaggi": 0,
      "speseRappresentanza": 0,
      "mostreFiere": 0,
      "serviziCommerciali": 0,
      "carburante": 0,
      "speseCommerciali": 13162,
      "beniIndeducibili": 0,
      "speseGenerali": 0,
      "materialeConsumo": 0,
      "spesePulizia": 0,
      "utenze": 0,
      "assicurazioni": 0,
      "rimanenze": 0,
      "tasseValori": 0,
      "sanzioniMulte": 0,
      "compensiAmministratore": 31166,
      "rimborsiAmministratore": 0,
      "personale": 55950,
      "serviziAmministrativi": 0,
      "serviziAmministrativiPaghe": 0,
      "consulenzeTecniche": 0,
      "consulenzeLegali": 0,
      "locazioniNoleggi": 0,
      "serviziIndeducibili": 0,
      "utiliPerditeCambi": 0,
      "perditeSuCrediti": 0,
      "licenzeUso": 0,
      "utenzeTelefoniche": 0,
      "altriOneri": 0,
      "abbuoniArrotondamenti": 0,
      "speseStruttura": 87078,
      "totaleGestioneStruttura": 156190,
      "ebitda": -148217,
      "ammortamentiImmateriali": 5933,
      "ammortamentiMateriali": 0,
      "svalutazioni": 0,
      "totaleAmmortamenti": 5933,
      "gestioneStraordinaria": 0,
      "ebit": -154150,
      "speseCommissioniBancarie": 0,
      "interessiPassiviMutui": 0,
      "altriInteressi": 2496,
      "gestioneFinanziaria": 2496,
      "ebt": -156646,
      "imposteDirette": 0,
      "risultatoEsercizio": -156646
    }
  }'::jsonb,
  2025,  -- Anno
  NULL  -- NULL per dati progressivi annuali
)
ON CONFLICT (company_id, data_type, year, month) 
DO UPDATE SET 
  data = EXCLUDED.data,
  created_at = NOW();

-- ============================================
-- ESEMPIO 2: Caricare CE Sintetico
-- ============================================
-- (Sostituisci {COMPANY_ID} con l'ID dell'azienda)
-- (Sostituisci il JSON con i dati reali di ceSintetico)

INSERT INTO financial_data (company_id, data_type, data, year, month)
VALUES (
  '{COMPANY_ID}'::uuid,
  'ce-sintetico',
  '{
    "progressivo2025": {
      "totaleRicavi": 231136,
      "costiDiretti": 15095,
      "costiIndiretti": 1750,
      "totaleCostiDirettiIndiretti": 16845,
      "grossProfit": 214290,
      "speseCommerciali": 15279,
      "personale": 137119,
      "compensiAmministratore": 0,
      "serviziContabiliPaghe": 12617,
      "consulenzeLegali": 1794,
      "consulenzeTecniche": 29150,
      "altreSpeseFunzionamento": 39509,
      "totaleStruttura": 235468,
      "ebitda": -21178,
      "ammortamentiSvalutazioni": 35091,
      "gestioneStraordinaria": 0,
      "ebit": -56268,
      "gestioneFinanziaria": 1603,
      "ebt": -57871,
      "imposteDirette": 0,
      "risultatoEsercizio": -57871
    },
    "progressivo2024": {
      "totaleRicavi": 43656,
      "costiDiretti": 1710,
      "costiIndiretti": 5500,
      "totaleCostiDirettiIndiretti": 7210,
      "grossProfit": 36446,
      "speseCommerciali": 13162,
      "personale": 55950,
      "compensiAmministratore": 31166,
      "serviziContabiliPaghe": 0,
      "consulenzeLegali": 0,
      "consulenzeTecniche": 0,
      "altreSpeseFunzionamento": 69062,
      "totaleStruttura": 156190,
      "ebitda": -148217,
      "ammortamentiSvalutazioni": 5933,
      "gestioneStraordinaria": 0,
      "ebit": -154150,
      "gestioneFinanziaria": 2496,
      "ebt": -156646,
      "imposteDirette": 0,
      "risultatoEsercizio": -156646
    }
  }'::jsonb,
  2025,
  NULL
)
ON CONFLICT (company_id, data_type, year, month) 
DO UPDATE SET 
  data = EXCLUDED.data,
  created_at = NOW();

-- ============================================
-- ESEMPIO 3: Caricare Dashboard
-- ============================================
-- (Sostituisci {COMPANY_ID} con l'ID dell'azienda)
-- (Sostituisci il JSON con i dati reali di dashboard)

INSERT INTO financial_data (company_id, data_type, data, year, month)
VALUES (
  '{COMPANY_ID}'::uuid,
  'dashboard',
  '{
    "kpis": {
      "ricavi2025": 231136,
      "ricavi2024": 43656,
      "costi2025": 289007,
      "costi2024": 200302,
      "ebitda2025": -21178,
      "ebitda2024": -148217,
      "risultato2025": -57871,
      "risultato2024": -156646,
      "margineEbitda2025": -9.2,
      "margineEbitda2024": -339.5
    },
    "monthlyTrend": {
      "labels": ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"],
      "ricavi": [56600, 82100, 117340, 142840, 161441, 186441, 230030, 231136],
      "ebitda": [45971, 21850, -17092, -15105, -19148, -22632, -61, -21178]
    },
    "summary": [
      {"voce": "Totale Ricavi", "value2025": 231136, "percentage": 100.0, "value2024": 43656},
      {"voce": "Costi Diretti", "value2025": 15095, "percentage": 6.5, "value2024": 1710},
      {"voce": "Costi Indiretti", "value2025": 1750, "percentage": 0.8, "value2024": 5500},
      {"voce": "Totale Costi Diretti e Indiretti", "value2025": 16845, "percentage": 7.3, "value2024": 7210},
      {"voce": "Gross Profit", "value2025": 214290, "percentage": 92.7, "value2024": 36446},
      {"voce": "Spese Commerciali", "value2025": 15279, "percentage": 6.6, "value2024": 13162},
      {"voce": "Personale", "value2025": 137119, "percentage": 59.3, "value2024": 55950},
      {"voce": "Compensi Amministratore", "value2025": 0, "percentage": 0, "value2024": 31166},
      {"voce": "EBITDA", "value2025": -21178, "percentage": -9.2, "value2024": -148217},
      {"voce": "Ammortamenti", "value2025": 35091, "percentage": 15.2, "value2024": 5933},
      {"voce": "EBIT", "value2025": -56268, "percentage": -24.4, "value2024": -154150},
      {"voce": "Gestione Finanziaria", "value2025": 1603, "percentage": 0.7, "value2024": 2496},
      {"voce": "Risultato ante Imposte", "value2025": -57871, "percentage": -25.0, "value2024": -156646},
      {"voce": "Imposte", "value2025": 0, "percentage": 0.0, "value2024": 0},
      {"voce": "Risultato dell'\''Esercizio", "value2025": -57871, "percentage": -25.0, "value2024": -156646}
    ]
  }'::jsonb,
  2025,
  8  -- Mese 8 (Agosto)
)
ON CONFLICT (company_id, data_type, year, month) 
DO UPDATE SET 
  data = EXCLUDED.data,
  created_at = NOW();

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Per caricare dati complessi come CE Dettaglio o CE Sintetico,
-- è meglio usare la funzione JavaScript loadFinancialDataToSupabase()
-- che formatta automaticamente i dati JSON da financialData.ts
--
-- Per dati semplici o per caricare dati di nuove aziende,
-- puoi usare questo script SQL sostituendo i placeholder.


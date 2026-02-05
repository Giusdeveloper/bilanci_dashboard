-- ============================================
-- SCRIPT PER TROVARE ED ELIMINARE DUPLICATI AWENTIA
-- ============================================
-- Questo script identifica ed elimina i record duplicati nella tabella financial_data
-- per l'azienda Awentia, mantenendo solo il record più recente per ogni combinazione
-- di (company_id, data_type, year, month)

-- ID di Awentia
-- 'ffd64e5f-4692-4254-8ef4-f1611935f08e'

-- ============================================
-- STEP 1: TROVARE I DUPLICATI
-- ============================================
-- Questa query mostra tutti i record duplicati con i dettagli

SELECT 
  company_id,
  data_type,
  year,
  month,
  COUNT(*) as numero_duplicati,
  array_agg(id ORDER BY created_at DESC) as ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM financial_data
WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
GROUP BY company_id, data_type, year, month
HAVING COUNT(*) > 1
ORDER BY numero_duplicati DESC, data_type, year, month;

-- ============================================
-- STEP 2: VEDERE I DETTAGLI DEI DUPLICATI
-- ============================================
-- Questa query mostra i dettagli completi di tutti i duplicati

SELECT 
  fd.id,
  fd.company_id,
  c.name as company_name,
  fd.data_type,
  fd.year,
  fd.month,
  fd.created_at,
  jsonb_pretty(fd.data) as data_sample
FROM financial_data fd
JOIN companies c ON c.id = fd.company_id
WHERE fd.company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
  AND (fd.company_id, fd.data_type, fd.year, fd.month) IN (
    SELECT company_id, data_type, year, month
    FROM financial_data
    WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
    GROUP BY company_id, data_type, year, month
    HAVING COUNT(*) > 1
  )
ORDER BY fd.data_type, fd.year, fd.month, fd.created_at DESC;

-- ============================================
-- STEP 3: CONTARE I DUPLICATI DA ELIMINARE
-- ============================================
-- Questa query mostra quanti record verranno eliminati

WITH duplicati AS (
  SELECT 
    company_id,
    data_type,
    year,
    month,
    COUNT(*) as totale,
    MIN(created_at) as prima_data,
    MAX(created_at) as ultima_data
  FROM financial_data
  WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
  GROUP BY company_id, data_type, year, month
  HAVING COUNT(*) > 1
)
SELECT 
  COUNT(*) as gruppi_duplicati,
  SUM(totale - 1) as record_da_eliminare,
  SUM(totale) as record_totali_coinvolti
FROM duplicati;

-- ============================================
-- STEP 4: ELIMINARE I DUPLICATI
-- ============================================
-- ⚠️ ATTENZIONE: Questa query ELIMINA i record duplicati!
-- Mantiene solo il record più recente (created_at più recente)
-- Se più record hanno la stessa data, mantiene quello con l'ID minore

-- PRIMA DI ELIMINARE, ESEGUIRE GLI STEP 1-3 PER VERIFICARE!

DELETE FROM financial_data
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, data_type, year, month 
        ORDER BY created_at DESC, id ASC
      ) as rn
    FROM financial_data
    WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
  ) ranked
  WHERE rn > 1  -- Mantiene solo il primo (più recente)
);

-- ============================================
-- STEP 5: VERIFICA POST-ELIMINAZIONE
-- ============================================
-- Verifica che non ci siano più duplicati

SELECT 
  company_id,
  data_type,
  year,
  month,
  COUNT(*) as numero_record
FROM financial_data
WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
GROUP BY company_id, data_type, year, month
HAVING COUNT(*) > 1;

-- Se questa query non restituisce risultati, tutti i duplicati sono stati eliminati!

-- ============================================
-- ALTERNATIVA: ELIMINARE MANTENENDO IL PIÙ VECCHIO
-- ============================================
-- Se preferisci mantenere il record più vecchio invece del più recente,
-- usa questa query invece dello STEP 4:

/*
DELETE FROM financial_data
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, data_type, year, month 
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM financial_data
    WHERE company_id = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'::uuid
  ) ranked
  WHERE rn > 1  -- Mantiene solo il primo (più vecchio)
);
*/


-- Script SQL per creare la company Sherpa42 su Supabase
-- Esegui questo script nel SQL Editor di Supabase

-- 1. Crea la company Sherpa42 (se non esiste già)
INSERT INTO companies (name, slug)
VALUES ('Sherpa42 Srl', 'sherpa42')
ON CONFLICT (slug) DO NOTHING;

-- 2. Verifica che sia stata creata
SELECT id, name, slug, created_at 
FROM companies 
WHERE slug = 'sherpa42';

-- 3. Se vuoi vedere tutte le companies
-- SELECT * FROM companies ORDER BY name;


# Istruzioni per Creare Sherpa42 su Supabase

## Passo 1: Crea la Company

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Crea una nuova query
3. Copia e incolla questo script:

```sql
-- Crea la company Sherpa42
INSERT INTO companies (name, slug)
VALUES ('Sherpa42 Srl', 'sherpa42')
ON CONFLICT (slug) DO NOTHING;

-- Verifica che sia stata creata
SELECT id, name, slug, created_at 
FROM companies 
WHERE slug = 'sherpa42';
```

4. Clicca su **Run** (o premi Ctrl+Enter)
5. Dovresti vedere l'ID della company (es: `0fb5063a-4b54-4ab1-ae2b-afd04865a1a1`)

## Passo 2: Carica i Dati

Dopo aver creato la company, possiamo caricare i dati dai CSV. 

**Prossimi passi:**
1. Condividi con me la struttura dei CSV (prime righe o intestazioni)
2. Oppure esegui lo script Node.js che creerò per processare i CSV

## File SQL

Lo script completo è salvato in: `scripts/create-sherpa42-company.sql`


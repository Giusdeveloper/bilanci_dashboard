# Configurazione Secrets per GitHub Actions

## Secrets Richiesti

Per il corretto funzionamento del workflow di build, è necessario configurare i seguenti secrets nel repository GitHub:

### 1. VITE_SUPABASE_URL
- **Descrizione**: URL del progetto Supabase
- **Formato**: `https://your-project-id.supabase.co`
- **Come ottenere**: Dal dashboard di Supabase, sezione Settings > API

### 2. VITE_SUPABASE_ANON_KEY
- **Descrizione**: Chiave pubblica anonima di Supabase
- **Formato**: Stringa alfanumerica lunga
- **Come ottenere**: Dal dashboard di Supabase, sezione Settings > API

## Come Configurare i Secrets

1. Vai al repository su GitHub
2. Clicca su **Settings** (nella barra superiore del repository)
3. Nel menu laterale, clicca su **Secrets and variables** > **Actions**
4. Clicca su **New repository secret**
5. Aggiungi i secrets uno per uno:
   - **Name**: `VITE_SUPABASE_URL`
   - **Secret**: Il tuo URL Supabase
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Secret**: La tua chiave anonima Supabase

## Verifica

Dopo aver configurato i secrets, il workflow dovrebbe funzionare correttamente. I valori verranno automaticamente iniettati nel file `.env.production` durante il build.

## Note di Sicurezza

- I secrets sono crittografati e non visibili nei log del workflow
- Non condividere mai i valori dei secrets in codice pubblico
- I secrets sono disponibili solo per i workflow autorizzati
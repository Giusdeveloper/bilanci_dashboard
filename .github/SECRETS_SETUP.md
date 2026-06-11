# Configurazione Secrets per GitHub Actions

## Secrets Richiesti

Per il corretto funzionamento del workflow di build, configura questi secrets nel repository GitHub.

### 1. VITE_SUPABASE_URL

- **Descrizione**: URL del progetto Supabase
- **Valore per questo progetto**: `https://caubhppwypkymsixsrco.supabase.co`
- **Dove trovarlo**: Dashboard → Project Settings → API → Project URL

### 2. VITE_SUPABASE_ANON_KEY

- **Descrizione**: Chiave **publishable** per il client (nome env storico `ANON_KEY`, valore nuovo)
- **Formato richiesto**: `sb_publishable_<random>_<checksum>`
- **NON usare**: la legacy `anon` JWT (`eyJhbGciOiJIUzI1NiIs...`) — se disabilitata sul progetto, il login risponde *"Legacy API keys are disabled"*
- **Dove trovarlo**: Dashboard → [API Keys](https://supabase.com/dashboard/project/caubhppwypkymsixsrco/settings/api-keys) → sezione **Publishable key**

> Supabase sostituisce le chiavi `anon`/`service_role` con **Publishable** / **Secret** keys. Per il frontend basta la Publishable key al posto della vecchia anon.

## Come Configurare i Secrets

1. Vai al repository su GitHub: https://github.com/Giusdeveloper/bilanci_dashboard
2. **Settings** → **Secrets and variables** → **Actions**
3. Per ogni secret:
   - **New repository secret** (prima configurazione) oppure clic sul nome → **Update secret**
4. Inserisci:

| Name | Secret (valore) |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://caubhppwypkymsixsrco.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` (copia dalla dashboard Supabase) |

## Redeploy dopo l'aggiornamento

I secrets vengono letti solo in build time (Vite inlines le variabili nel bundle). Dopo aver aggiornato i secrets:

1. Push su `main` (anche commit vuoto) oppure **Actions** → **Build Client** → **Run workflow**
2. Attendi il deploy su GitHub Pages
3. Verifica login su https://giusdeveloper.github.io/bilanci-dashboard/

## Verifica

Il workflow `build-client.yml`:

- Fallisce se i secrets mancano
- Fallisce se `VITE_SUPABASE_ANON_KEY` è ancora una legacy JWT (`eyJ...`)
- Conferma il prefisso `sb_publishable_` quando la chiave è corretta

## Note di Sicurezza

- I secrets sono crittografati e mascherati nei log
- La Publishable key è pensata per l'esposizione client-side (come la vecchia anon)
- Non committare mai chiavi in codice o `.env` nel repository
- Per script server-side con privilegi elevati usare **Secret key** (`sb_secret_...`) o `SUPABASE_SERVICE_ROLE_KEY` solo in ambiente sicuro, mai nel client Vite

## Riferimenti

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

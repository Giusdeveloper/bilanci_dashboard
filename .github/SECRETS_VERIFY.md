# ✅ Verifica Configurazione Secrets GitHub

## ⚠️ Migrazione chiavi Supabase (Publishable key)

Supabase sta disabilitando le **legacy API keys** (chiavi `anon` / `service_role` in formato JWT, che iniziano con `eyJ`).

Per il client Vite/GitHub Pages serve la **Publishable key**:

| Campo | Formato corretto | Formato errato (legacy) |
| --- | --- | --- |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | `eyJhbGciOiJIUzI1NiIs...` (anon JWT) |

**Progetto bilanci-dashboard:** `caubhppwypkymsixsrco` — la legacy `anon` è **disabilitata**; usare la Publishable key attiva dalla dashboard.

### Dove copiare la chiave

1. [Supabase Dashboard](https://supabase.com/dashboard/project/caubhppwypkymsixsrco/settings/api-keys)
2. Tab **API Keys** (non "Legacy API Keys")
3. Copia **Publishable key** (`sb_publishable_...`)

`VITE_SUPABASE_URL` resta: `https://caubhppwypkymsixsrco.supabase.co`

> Il nome del secret GitHub `VITE_SUPABASE_ANON_KEY` è mantenuto per compatibilità con Vite; il **valore** deve essere la Publishable key.

---

## 🔍 Come Verificare che i Secrets siano Configurati

### 1. Controlla i Secrets su GitHub

1. Vai al repository: https://github.com/Giusdeveloper/bilanci_dashboard
2. Clicca su **Settings** (in alto)
3. Nel menu laterale, clicca su **Secrets and variables** → **Actions**
4. Verifica che ci siano questi secrets:
   - ✅ `VITE_SUPABASE_URL` → `https://caubhppwypkymsixsrco.supabase.co`
   - ✅ `VITE_SUPABASE_ANON_KEY` → valore `sb_publishable_...` (non JWT legacy)

### 2. Se i Secrets NON sono Configurati o sono Obsoleti

1. Clicca su **New repository secret** (o **Update** su un secret esistente)
2. Aggiorna `VITE_SUPABASE_URL`:
   - **Name**: `VITE_SUPABASE_URL`
   - **Secret**: `https://caubhppwypkymsixsrco.supabase.co`
3. Aggiorna `VITE_SUPABASE_ANON_KEY`:
   - **Name**: `VITE_SUPABASE_ANON_KEY` (nome invariato)
   - **Secret**: Publishable key da Supabase Dashboard (inizia con `sb_publishable_`)

### 3. Verifica nei Log del Workflow

Dopo aver aggiornato i secrets, attiva un nuovo deploy:

```bash
git commit --allow-empty -m "chore: redeploy after Supabase publishable key update"
git push origin main
```

Poi controlla i log:

1. Vai su **Actions** nel repository
2. Clicca sull'ultimo workflow "Build Client"
3. Espandi lo step "Build client"
4. Cerca:
   - ✅ `Secrets configurati correttamente`
   - ✅ `Publishable key format detected` (prefisso `sb_publishable_`)
   - ❌ `Legacy anon JWT detected` → aggiorna il secret con la Publishable key

### 4. Verifica nell'App

Se i secrets sono corretti:

- ✅ Nessun errore `Legacy API keys are disabled` al login
- ✅ L'app si connette a Supabase
- ✅ L'autenticazione funziona (es. `amministrazione@imment.it`)

## 📝 Note

- I secrets sono **crittografati** e **non visibili** nei log
- Dopo ogni modifica ai secrets serve un **nuovo build** (push su `main` o workflow manuale)
- `@supabase/supabase-js` ^2.45 supporta le Publishable key senza upgrade obbligatorio
- In locale: copia la Publishable key in `.env` come `VITE_SUPABASE_ANON_KEY=sb_publishable_...`

## 🔗 Link Utili

- [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Documentazione GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Dashboard Supabase — API Keys](https://supabase.com/dashboard/project/caubhppwypkymsixsrco/settings/api-keys)

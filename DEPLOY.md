# 🚀 Deploy su GitHub Pages

## 📋 Setup GitHub Actions

### 1. **Configura i Secrets**
Vai su GitHub > Settings > Secrets and variables > Actions e aggiungi:

- `VITE_SUPABASE_URL`: `https://caubhppwypkymsixsrco.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: **Publishable key** Supabase (`sb_publishable_...`), **non** la legacy anon JWT

Copia la Publishable key da [Supabase Dashboard → API Keys](https://supabase.com/dashboard/project/caubhppwypkymsixsrco/settings/api-keys). Dettagli in [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md).

### 2. **Abilita GitHub Pages**
1. Vai su GitHub > Settings > Pages
2. Seleziona "GitHub Actions" come source
3. Salva le impostazioni

### 3. **Push del Codice**
```bash
git add .
git commit -m "Setup GitHub Actions per deploy"
git push origin main
```

## 🔧 Configurazione

### **File di Configurazione**
- `.github/workflows/build-client.yml` - Workflow per build e deploy
- `client/vite.config.prod.ts` - Configurazione Vite per produzione

### **Variabili d'Ambiente**
Le variabili vengono caricate automaticamente dai GitHub Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📊 Monitoraggio

### **Log di Deploy**
- Vai su GitHub > Actions per vedere i log di deploy
- Controlla che il build sia completato con successo

### **URL di Deploy**
L'applicazione è disponibile su:
- **GitHub Pages**: `https://giusdeveloper.github.io/bilanci_dashboard/`

## 🚨 Troubleshooting

### **Build Fallito**
1. Controlla i secrets GitHub
2. Verifica che le variabili d'ambiente siano corrette
3. Controlla i log di GitHub Actions

### **Deploy Non Funziona**
1. Verifica che GitHub Pages sia abilitato
2. Controlla che il branch `main` sia selezionato
3. Verifica che i file siano stati generati in `client/dist`

### **Applicazione Non Carica**
1. Controlla la console del browser per errori
2. Verifica che Supabase sia accessibile
3. Controlla che le credenziali siano corrette

### **Login: "Legacy API keys are disabled"**
1. Il bundle GitHub Pages contiene ancora la vecchia chiave `anon` (JWT `eyJ...`)
2. Aggiorna il secret `VITE_SUPABASE_ANON_KEY` con la **Publishable key** (`sb_publishable_...`)
3. Esegui un nuovo deploy (push su `main` o re-run workflow **Build Client**)
4. Il workflow fallisce in CI se rileva ancora una JWT legacy — vedi [.github/SECRETS_VERIFY.md](.github/SECRETS_VERIFY.md)

## ✅ Checklist Deploy

- [ ] Secrets GitHub configurati
- [ ] GitHub Pages abilitato
- [ ] Workflow file creato
- [ ] Codice pushato su GitHub
- [ ] Build completato con successo
- [ ] Applicazione accessibile online
- [ ] Autenticazione Supabase funzionante
- [ ] Dati caricati dal database
- [ ] (Opzionale) Dominio personalizzato configurato - vedi [.github/CUSTOM_DOMAIN.md](.github/CUSTOM_DOMAIN.md)

## 🎯 Risultato Atteso

Dopo il deploy, l'applicazione sarà:
- ✅ **Accessibile online** su GitHub Pages
- ✅ **Connessa a Supabase** per autenticazione e dati
- ✅ **Deploy automatico** ad ogni push su main
- ✅ **Pronta per l'uso** in produzione

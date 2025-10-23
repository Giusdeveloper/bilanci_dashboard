# 🚀 Setup Sviluppo Locale - Bilanci Dashboard

## ✅ Stato Attuale
- ✅ Repository GitHub configurato
- ✅ File .env creato
- ✅ .gitignore aggiornato
- ✅ Script di deploy creati
- ✅ GitHub client con fallback locale

---

## 📦 1. Installazione Dipendenze

```bash
# Nella directory del progetto
npm install
```

---

## 🔧 2. Configurazione Variabili d'Ambiente

Il file `.env` è già stato creato con i valori di default.

### **Opzione A: Solo Dashboard (Senza GitHub Integration)**
✅ Il file `.env` attuale è già OK! Puoi iniziare subito.

### **Opzione B: Con GitHub Integration**
Se vuoi testare anche la pagina "GitHub Sync" in locale:

1. Vai su https://github.com/settings/tokens
2. Clicca "Generate new token (classic)"
3. Dai un nome: "Bilanci Dashboard Local Dev"
4. Seleziona gli scope:
   - ✅ `repo` (accesso completo ai repository)
   - ✅ `user` (lettura info utente)
5. Clicca "Generate token"
6. Copia il token (inizia con `ghp_...`)
7. Nel file `.env`, decommentare e sostituire:
   ```
   GITHUB_TOKEN=ghp_il_tuo_token_qui
   ```

**⚠️ IMPORTANTE**: Non committare mai il file `.env` con il token!

---

## 🎯 3. Avvio Sviluppo

```bash
npm run dev
```

La dashboard sarà disponibile su: **http://localhost:5000**

### Pagine disponibili:
- 📊 Dashboard principale: `/`
- 📈 CE Dettaglio: `/ce-dettaglio`
- 📅 CE Dettaglio Mensile: `/ce-dettaglio-mensile`
- 📉 CE Sintetico: `/ce-sintetico`
- 📆 CE Sintetico Mensile: `/ce-sintetico-mensile`
- 📑 Partitari: `/partitari`
- 🔄 GitHub Sync: `/github-sync`

---

## 💾 4. Workflow Sviluppo → Deploy

### 📝 Metodo 1: Script Automatico (Consigliato)

**Windows**: Doppio click su `deploy.bat`  
**Mac/Linux**: `./deploy.sh`

Lo script:
1. Aggiunge tutti i file modificati
2. Ti chiede un messaggio di commit
3. Fa push su GitHub
4. Ti ricorda di fare deploy su Replit

### 📝 Metodo 2: Manuale

```bash
# 1. Commit modifiche
git add .
git commit -m "Descrizione modifiche"

# 2. Push su GitHub
git push origin main

# 3. Deploy su Replit
# - Vai su https://replit.com/@giuseppepistoia/workspace
# - Tools → Git → Pull from GitHub
# - Clicca Deploy
```

---

## 🔄 5. Deploy Automatico su Replit (Opzionale)

Configura l'auto-deploy per saltare il passaggio 3:

1. Vai su Replit → Il tuo progetto
2. **Settings** → **Version Control**
3. Abilita "**Auto-deploy from GitHub**"
4. Branch: `main`

Fatto! Ora ogni push su `main` triggera automaticamente un deploy 🎉

---

## 🐛 6. Troubleshooting

### ❌ Errore: "Cannot find module X"
```bash
npm install
```

### ❌ Porta 5000 già in uso
Nel file `.env`, cambia:
```
PORT=3000
```

### ❌ GitHub Integration non funziona in locale
- Controlla di aver impostato `GITHUB_TOKEN` nel `.env`
- Verifica che il token abbia gli scope corretti
- In alternativa, ignora la pagina `/github-sync` durante lo sviluppo locale

### ❌ Le modifiche non si vedono dopo il deploy
1. Verifica che il commit sia su GitHub: https://github.com/Giusdeveloper/bilanci_dashboard/commits/main
2. Su Replit, fai "Pull from GitHub" di nuovo
3. Forza un rebuild: `npm run build` nella Console di Replit
4. Hard refresh del browser (Ctrl+Shift+R o Cmd+Shift+R)

---

## 📚 7. Comandi Utili

```bash
# Sviluppo
npm run dev              # Avvia server di sviluppo

# Build
npm run build           # Build per produzione
npm run start           # Avvia server produzione

# Type checking
npm run check           # Verifica TypeScript

# Database (se aggiungi un DB in futuro)
npm run db:push         # Sincronizza schema database
```

---

## 🌐 8. Link Utili

- 🔗 **Repository**: https://github.com/Giusdeveloper/bilanci_dashboard
- 🚀 **Replit**: https://replit.com/@giuseppepistoia/workspace
- 🐙 **GitHub Token**: https://github.com/settings/tokens
- 📖 **Documentazione Replit**: https://docs.replit.com/

---

## 🎨 9. Struttura Progetto

```
bilanci_dashboard/
├── client/                  # Frontend React
│   ├── src/
│   │   ├── components/      # Componenti riutilizzabili
│   │   ├── pages/          # Pagine dell'app
│   │   ├── data/           # Dati finanziari
│   │   └── App.tsx         # Componente principale
│   └── index.html
├── server/                  # Backend Express
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # Route API
│   ├── github-client.ts    # Client GitHub
│   └── storage.ts          # Storage in-memory
├── attached_assets/         # File CSV e assets
├── .env                     # Variabili d'ambiente (locale)
├── .gitignore              # File da ignorare
├── package.json            # Dipendenze
├── deploy.bat              # Script deploy Windows
└── WORKFLOW.md             # Questa guida

---

## ✨ 10. Best Practices

1. **Commit frequenti** con messaggi descrittivi:
   ```bash
   git commit -m "feat: aggiunta nuova tabella partitari"
   git commit -m "fix: corretto calcolo percentuali"
   git commit -m "style: migliorato layout dashboard"
   ```

2. **Branch per feature importanti**:
   ```bash
   git checkout -b feature/nuovo-grafico
   # fai modifiche
   git push origin feature/nuovo-grafico
   # poi merge su main quando pronto
   ```

3. **Test locale prima del deploy**:
   - Verifica che tutto funzioni con `npm run dev`
   - Controlla i vari grafici e tabelle
   - Testa su diversi browser se possibile

4. **Backup delle modifiche**:
   - Push su GitHub almeno una volta al giorno
   - Usa messaggi di commit descrittivi

---

## 🆘 Hai bisogno di aiuto?

- 📧 Crea un issue su GitHub
- 💬 Controlla i logs di Replit per errori
- 🔍 Cerca nella documentazione Replit

---

**Pronto per iniziare? Esegui:**

```bash
npm install
npm run dev
```

E poi apri http://localhost:5000 🚀
```

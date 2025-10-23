# ✅ Checklist Setup - Bilanci Dashboard

## 🎯 Setup Iniziale

### 1. Installazione (1 minuto)
- [ ] Apri terminale in VSCode
- [ ] Esegui: `npm install`
- [ ] Attendi completamento installazione

### 2. Avvio Locale (30 secondi)
- [ ] Esegui: `npm run dev`
- [ ] Apri browser: http://localhost:5000
- [ ] Verifica che la dashboard si carichi

### 3. Verifica Funzionamento (2 minuti)
- [ ] Dashboard principale carica i dati
- [ ] I grafici si visualizzano correttamente
- [ ] Le tabelle mostrano i dati
- [ ] La navigazione tra pagine funziona

---

## 🔧 Configurazione Opzionale

### GitHub Integration (solo se serve)
- [ ] Vai su: https://github.com/settings/tokens
- [ ] Crea token con scope: `repo`, `user`
- [ ] Copia token (inizia con `ghp_`)
- [ ] Nel file `.env`, decommentare `GITHUB_TOKEN=...`
- [ ] Incolla il token
- [ ] Riavvia server: Ctrl+C e `npm run dev`

---

## 🚀 Primo Deploy

### Test Modifiche
- [ ] Fai una piccola modifica (es: titolo dashboard)
- [ ] Verifica in locale che funzioni
- [ ] La modifica è visibile su http://localhost:5000

### Push su GitHub
- [ ] Apri terminale
- [ ] Doppio click su `deploy.bat` (Windows) o `./deploy.sh` (Mac/Linux)
- [ ] Inserisci messaggio commit (es: "test: prima modifica")
- [ ] Verifica su GitHub che il commit sia presente

### Deploy su Replit
- [ ] Vai su https://replit.com/@giuseppepistoia/workspace
- [ ] Tools → Git → Pull from GitHub
- [ ] Clicca Deploy
- [ ] Attendi che il deploy finisca
- [ ] Apri la dashboard live e verifica la modifica

---

## 🎉 Auto-Deploy (Opzionale, Consigliato)

### Configurazione One-Time
- [ ] Su Replit: Settings → Version Control
- [ ] Abilita "Auto-deploy from GitHub"
- [ ] Branch: `main`
- [ ] Salva

### Da ora in poi
- [ ] ✅ Fai modifiche in locale
- [ ] ✅ `git push origin main`
- [ ] ✅ Aspetta 30-60 secondi
- [ ] ✅ Le modifiche sono live automaticamente!

---

## 📝 Workflow Quotidiano

```
1. Apri VSCode
2. npm run dev
3. Fai modifiche
4. Testa in locale
5. Doppio click deploy.bat
6. (Opzionale se NO auto-deploy) Deploy manuale su Replit
7. Verifica online
```

---

## ⚡ Quick Commands

```bash
# Sviluppo
npm run dev

# Deploy (Windows)
deploy.bat

# Deploy (Manual)
git add . && git commit -m "msg" && git push origin main
```

---

## 🐛 Problemi Comuni

### ❌ npm install fallisce
**Soluzione**: Cancella `node_modules` e riprova
```bash
rm -rf node_modules
npm install
```

### ❌ Porta 5000 occupata
**Soluzione**: Nel `.env` cambia `PORT=3000`

### ❌ Modifiche non si vedono online
**Soluzione**:
1. Verifica commit su GitHub
2. Su Replit: Tools → Git → Pull
3. Deploy di nuovo

---

## ✅ Setup Completato!

Quando hai finito questa checklist:
- ✅ Ambiente locale funzionante
- ✅ Primo deploy effettuato
- ✅ Workflow configurato
- ✅ Pronto per sviluppare! 🚀

---

**Prossimi Passi**: Leggi [WORKFLOW.md](./WORKFLOW.md) per best practices

**Hai problemi?** Consulta [SETUP.md](./SETUP.md#-6-troubleshooting)

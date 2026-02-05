# 🚀 Workflow di Sviluppo - Bilanci Dashboard

## 📍 Setup Attuale
- **Repository GitHub**: https://github.com/Giusdeveloper/bilanci_dashboard
- **Hosting**: Replit (deployment attivo)
- **Sviluppo Locale**: VSCode

## 🔄 Flusso di Lavoro

### 1. Sviluppa in Locale
Apri il progetto in VSCode e fai le tue modifiche.

### 2. Testa in Locale
```bash
npm run dev
```
La dashboard sarà disponibile su `http://localhost:5000`

### 3. Deploy su GitHub e Replit

#### **Metodo Rapido** (Usa lo script)
Doppio click su `deploy.bat` nella root del progetto

#### **Metodo Manuale**
```bash
git add .
git commit -m "Descrizione modifiche"
git push origin main
```

### 4. Aggiorna Replit
1. Vai su [Replit](https://replit.com/)
2. Apri il progetto `bilanci_dashboard`
3. **Tools** → **Git** → **Pull from GitHub**
4. Clicca su **Deploy**

---

## 📦 Comandi Disponibili

```bash
npm run dev      # Sviluppo locale
npm run build    # Build per produzione
npm run start    # Avvia server produzione
npm run check    # Type checking
npm run db:push  # Aggiorna database schema
```

---

## ⚙️ Variabili d'Ambiente

Assicurati che su Replit siano configurate:
- `DATABASE_URL` - URL database Neon
- `SESSION_SECRET` - Secret per sessioni
- Altri secrets necessari

---

## 🔧 Troubleshooting

### Il deploy non parte su Replit
1. Verifica che il pull da GitHub sia riuscito
2. Controlla i logs di build
3. Verifica le variabili d'ambiente

### Le modifiche non si vedono
1. Forza un rebuild: `npm run build` su Replit
2. Fai hard refresh del browser (Ctrl+Shift+R)
3. Verifica che il commit sia su GitHub

---

## 🎯 Best Practices

1. **Commit frequenti** con messaggi descrittivi
2. **Test locale** prima di pushare
3. **Backup** delle variabili d'ambiente
4. **Branch** per feature importanti
   ```bash
   git checkout -b feature/nome-feature
   ```

---

## 🔀 Opzioni Alternative di Hosting

Se vuoi migrare da Replit:

### Vercel (Consigliato)
```bash
npm i -g vercel
vercel
```

### Railway
1. Collega repository GitHub
2. Configura build command: `npm run build`
3. Configura start command: `npm run start`

### Render
Simile a Railway, ma con piano gratuito più generoso

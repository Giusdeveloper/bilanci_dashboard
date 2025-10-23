# 📊 Bilanci Dashboard - Awentia

Dashboard interattiva per l'analisi dei bilanci aziendali di Awentia, con visualizzazione di dati finanziari, grafici e report dettagliati.

## 🚀 Quick Start

```bash
# Installa dipendenze
npm install

# Avvia in sviluppo
npm run dev

# Apri http://localhost:5000
```

📖 **Setup completo**: Leggi [SETUP.md](./SETUP.md) per la guida dettagliata  
🔄 **Workflow**: Leggi [WORKFLOW.md](./WORKFLOW.md) per il flusso di lavoro

---

## 🎯 Funzionalità

- 📈 **Dashboard Principale**: Overview dei KPI principali
- 💰 **Conto Economico**: Analisi dettagliata e sintetica
- 📅 **Report Mensili**: Confronto tra diversi periodi
- 📑 **Partitari**: Dettaglio movimenti contabili
- 🔄 **GitHub Sync**: Integrazione con repository

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: Express.js, Node.js
- **UI**: Shadcn/ui Components
- **Charts**: Chart.js, Recharts
- **Build**: Vite
- **Hosting**: Replit

---

## 📁 Struttura Progetto

```
bilanci_dashboard/
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/  # UI Components
│   │   ├── pages/       # App Pages
│   │   └── data/        # Financial Data
├── server/           # Backend Express
│   ├── routes.ts    # API Routes
│   └── github-*.ts  # GitHub Integration
├── attached_assets/  # CSV & Assets
└── scripts/         # Utility Scripts
```

---

## 🔧 Comandi Disponibili

```bash
npm run dev      # Sviluppo locale
npm run build    # Build produzione
npm run start    # Avvia produzione
npm run check    # Type checking
```

---

## 📦 Deploy

### Sviluppo Locale → Replit

1. **Modifica** in VSCode
2. **Commit & Push**:
   ```bash
   git add .
   git commit -m "descrizione"
   git push origin main
   ```
3. **Deploy su Replit**:
   - Tools → Git → Pull from GitHub
   - Click Deploy

**Oppure** usa lo script rapido:
```bash
deploy.bat  # Windows
./deploy.sh # Mac/Linux
```

### Auto-Deploy (Opzionale)
Configura su Replit: Settings → Version Control → Auto-deploy

---

## 🌐 Link Utili

- 🔗 **Repository**: [github.com/Giusdeveloper/bilanci_dashboard](https://github.com/Giusdeveloper/bilanci_dashboard)
- 🚀 **Live App**: [replit.com/@giuseppepistoia/workspace](https://replit.com/@giuseppepistoia/workspace)
- 📖 **Docs**: Vedi [SETUP.md](./SETUP.md) e [WORKFLOW.md](./WORKFLOW.md)

---

## 👨‍💻 Autore

**Giuseppe Pistoia** ([@giuseppepistoia](https://replit.com/@giuseppepistoia))

---

## 📄 Licenza

MIT License - vedi [LICENSE](./LICENSE) per dettagli

---

## 🆘 Supporto

Hai problemi? Consulta:
1. [SETUP.md](./SETUP.md#-6-troubleshooting) - Sezione Troubleshooting
2. [GitHub Issues](https://github.com/Giusdeveloper/bilanci_dashboard/issues)
3. Documentazione Replit

---

**Pronto per iniziare?** 🚀

```bash
npm install && npm run dev
```

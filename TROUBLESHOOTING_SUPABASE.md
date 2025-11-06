# 🔧 Risoluzione Problema Connessione Supabase

## 🚨 Problema

L'app mostra errori di connessione a Supabase:
- `ERR_NAME_NOT_RESOLVED` per `caubhppwypkymsixsrco.supabase.co`
- `Failed to fetch`
- `TypeError: Failed to fetch`

## 🔍 Cause Possibili

1. **Progetto Supabase eliminato o sospeso**
   - Il progetto potrebbe essere stato eliminato
   - Il progetto potrebbe essere stato sospeso per inattività
   - Le credenziali potrebbero essere scadute

2. **Credenziali errate nel file `.env`**
   - URL Supabase errato
   - Chiave anonima errata o scaduta

3. **Problema di connessione internet/DNS**
   - DNS non risolve il dominio Supabase
   - Firewall o proxy che blocca la connessione

## ✅ Soluzioni

### Soluzione 1: Verifica e Aggiorna le Credenziali Supabase

1. **Accedi al Dashboard Supabase:**
   - Vai su https://supabase.com/dashboard
   - Accedi al tuo account

2. **Verifica che il progetto esista:**
   - Controlla che il progetto `caubhppwypkymsixsrco` esista ancora
   - Se non esiste, devi creare un nuovo progetto o usare un progetto esistente

3. **Ottieni le nuove credenziali:**
   - Vai su **Settings** → **API**
   - Copia il **Project URL** (es: `https://xxxxx.supabase.co`)
   - Copia la **anon/public key**

4. **Aggiorna il file `.env`:**
   ```env
   VITE_SUPABASE_URL=https://tuo-nuovo-progetto.supabase.co
   VITE_SUPABASE_ANON_KEY=tua-nuova-chiave-anonima
   ```

5. **Riavvia il server di sviluppo:**
   ```bash
   # Ferma il server (Ctrl+C)
   npm run dev
   ```

### Soluzione 2: Crea un Nuovo Progetto Supabase

Se il progetto non esiste più:

1. **Crea un nuovo progetto:**
   - Vai su https://supabase.com/dashboard
   - Clicca **New Project**
   - Compila i dati richiesti
   - Attendi che il progetto sia pronto (2-3 minuti)

2. **Ottieni le credenziali:**
   - Vai su **Settings** → **API**
   - Copia URL e chiave anonima

3. **Aggiorna `.env`** con le nuove credenziali

4. **Ripristina lo schema del database:**
   - Se hai uno schema esistente, esegui gli script in `scripts/`
   - Oppure importa lo schema dal backup precedente

### Soluzione 3: Verifica Connessione Internet/DNS

1. **Testa la risoluzione DNS:**
   ```powershell
   Resolve-DnsName -Name caubhppwypkymsixsrco.supabase.co
   ```

2. **Testa la connessione:**
   ```powershell
   Test-NetConnection -ComputerName caubhppwypkymsixsrco.supabase.co -Port 443
   ```

3. **Se il DNS non risolve:**
   - Verifica la connessione internet
   - Prova a cambiare DNS (es: 8.8.8.8, 1.1.1.1)
   - Controlla firewall/antivirus

### Soluzione 4: Modalità Offline (Sviluppo Locale)

Se vuoi sviluppare senza Supabase temporaneamente:

1. **Modifica `client/src/App.tsx`** per bypassare l'autenticazione:
   ```typescript
   // Commenta temporaneamente il controllo autenticazione
   // if (!user) {
   //   return <Login />;
   // }
   ```

2. **Usa dati mock** invece di Supabase per lo sviluppo

## 🔄 Dopo Aver Risolto

1. **Riavvia il server:**
   ```bash
   npm run dev
   ```

2. **Verifica la connessione:**
   - Controlla la console del browser
   - Non dovrebbero esserci più errori `ERR_NAME_NOT_RESOLVED`

3. **Testa l'autenticazione:**
   - Prova a fare login
   - Verifica che i dati si carichino correttamente

## 📋 Checklist

- [ ] Verificato che il progetto Supabase esista
- [ ] Aggiornate le credenziali nel file `.env`
- [ ] Riavviato il server di sviluppo
- [ ] Verificata la connessione internet
- [ ] Testato l'autenticazione
- [ ] Verificato che i dati si carichino

## 💡 Prevenzione

Per evitare questo problema in futuro:

1. **Backup regolari** del database Supabase
2. **Documenta le credenziali** in un password manager sicuro
3. **Monitora lo stato** del progetto Supabase
4. **Usa variabili d'ambiente** invece di valori hardcoded

## 🆘 Supporto

Se il problema persiste:

1. Controlla i log di Supabase nel dashboard
2. Verifica lo stato del servizio: https://status.supabase.com
3. Consulta la documentazione: https://supabase.com/docs
4. Contatta il supporto Supabase se necessario

---

**Nota**: Le modifiche al codice hanno migliorato la gestione degli errori, quindi l'app non si bloccherà più con errori di connessione, ma mostrerà solo avvisi nella console.

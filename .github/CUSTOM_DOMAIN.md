# 🌐 Configurazione Dominio Personalizzato per GitHub Pages

## Panoramica

Questa guida ti aiuterà a configurare il dominio personalizzato della tua azienda per la dashboard GitHub Pages.

## 📋 Prerequisiti

- ✅ GitHub Pages configurato e funzionante
- ✅ Accesso al DNS del tuo dominio aziendale
- ✅ Dominio aziendale registrato (es: `tuaazienda.it`, `dashboard.tuaazienda.it`)

## 🔧 Passaggi per Configurare il Dominio

### 1. Configurazione su GitHub

#### Passo 1: Imposta la Variabile del Repository (Opzionale ma Consigliato)

Per automatizzare la creazione del file CNAME, configura una variabile del repository:

1. Vai al repository GitHub
2. Clicca su **Settings** → **Secrets and variables** → **Actions**
3. Clicca sulla tab **Variables**
4. Clicca **New repository variable**
5. Aggiungi:
   - **Name**: `CUSTOM_DOMAIN`
   - **Value**: Il tuo dominio (es: `dashboard.tuaazienda.it` o `tuaazienda.it`)
6. Clicca **Add variable**

#### Passo 2: Configura il Dominio nelle Impostazioni Pages

##### Opzione A: Dominio Root (tuaazienda.it)

1. Vai al repository GitHub
2. Clicca su **Settings** → **Pages**
3. Nella sezione **Custom domain**, inserisci il tuo dominio: `tuaazienda.it`
4. Seleziona **Enforce HTTPS** (consigliato)
5. Clicca **Save**

##### Opzione B: Sottodominio (dashboard.tuaazienda.it)

1. Vai al repository GitHub
2. Clicca su **Settings** → **Pages**
3. Nella sezione **Custom domain**, inserisci: `dashboard.tuaazienda.it`
4. Seleziona **Enforce HTTPS**
5. Clicca **Save**

**NOTA**: Se hai configurato la variabile `CUSTOM_DOMAIN`, il file CNAME verrà creato automaticamente ad ogni deploy. Altrimenti, GitHub lo creerà automaticamente quando salvi il dominio nelle impostazioni Pages.

### 2. Configurazione DNS

Dopo aver salvato il dominio su GitHub, dovrai configurare i record DNS dal tuo provider.

#### Per Dominio Root (tuaazienda.it)

**Configura i record DNS presso il tuo provider:**

```
Tipo: A
Nome: @
Valore: 185.199.108.153
TTL: 3600
```

```
Tipo: A
Nome: @
Valore: 185.199.109.153
TTL: 3600
```

```
Tipo: A
Nome: @
Valore: 185.199.110.153
TTL: 3600
```

```
Tipo: A
Nome: @
Valore: 185.199.111.153
TTL: 3600
```

#### Per Sottodominio (dashboard.tuaazienda.it)

**Configura il record DNS presso il tuo provider:**

```
Tipo: CNAME
Nome: dashboard
Valore: [username].github.io
TTL: 3600
```

**NOTA**: Sostituisci `[username]` con il tuo username GitHub.

### 3. Aggiornamento Workflow (Automatico)

Il workflow GitHub Actions è già configurato per creare automaticamente il file `CNAME` necessario. Verrà creato durante il prossimo deploy.

### 4. Verifica della Configurazione

Dopo aver configurato il DNS, attendi che la propagazione DNS si completi (può richiedere da pochi minuti a 48 ore).

**Verifica lo stato:**
1. Vai su GitHub → Settings → Pages
2. Dovresti vedere un banner verde con "Your site is published at [tuo-dominio]"
3. Se vedi un avviso arancione, aspetta che il DNS si propaghi

## 🔐 Configurazione HTTPS/SSL

GitHub Pages fornisce automaticamente certificati SSL gratuiti per domini personalizzati:

1. ✅ Abilita **Enforce HTTPS** nelle impostazioni Pages
2. ⏳ Attendi che GitHub generi il certificato (può richiedere alcune ore)
3. ✅ Una volta attivo, tutte le connessioni al tuo dominio useranno HTTPS

## 📝 File CNAME

GitHub creerà automaticamente un branch `gh-pages` con un file `CNAME` contenente il tuo dominio. Questo file viene gestito automaticamente dal workflow.

**Se vuoi verificarlo manualmente:**
```bash
git checkout gh-pages
cat CNAME
```

## 🧪 Test della Configurazione

### Verifica DNS
Usa questi comandi per verificare la configurazione DNS:

```bash
# Per dominio root
dig tuaazienda.it +noall +answer

# Per sottodominio
dig dashboard.tuaazienda.it +noall +answer
```

### Verifica HTTPS
1. Apri il browser
2. Vai su `https://tua-dashboard.tuaazienda.it`
3. Verifica che il certificato SSL sia valido (lucchetto verde)

## 🚨 Troubleshooting

### Dominio non si risolve
- **Sintomo**: Il browser non trova il sito
- **Soluzione**: 
  - Verifica che i record DNS siano configurati correttamente
  - Attendi la propagazione DNS (può richiedere fino a 48 ore)
  - Usa [whatsmydns.net](https://www.whatsmydns.net) per verificare la propagazione globale

### Certificato SSL non funziona
- **Sintomo**: Errore "Connection not secure" o certificato invalido
- **Soluzione**:
  - Verifica che "Enforce HTTPS" sia abilitato su GitHub
  - Rimuovi il dominio personalizzato, attendi qualche minuto, poi riaggiungilo
  - Attendi che GitHub generi il nuovo certificato (può richiedere alcune ore)

### Sito mostra "404 Not Found"
- **Sintomo**: Il dominio si risolve ma mostra errore 404
- **Soluzione**:
  - Verifica che GitHub Pages sia abilitato e funzionante
  - Controlla che il workflow di build sia completato con successo
  - Verifica che il file `CNAME` esista nel branch `gh-pages`

### Il workflow fallisce con errore di dominio
- **Sintomo**: Il deploy GitHub Actions fallisce
- **Soluzione**:
  - Verifica che il file `CNAME` nel repository corrisponda al dominio configurato
  - Assicurati che il workflow abbia i permessi corretti (`contents: write`, `pages: write`)

## 📚 Risorse Utili

- [Documentazione ufficiale GitHub Pages - Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Verifica propagazione DNS](https://www.whatsmydns.net)
- [Test SSL](https://www.ssllabs.com/ssltest/)

## ✅ Checklist Finale

- [ ] Dominio configurato su GitHub Pages
- [ ] Record DNS configurati correttamente
- [ ] HTTPS/SSL abilitato
- [ ] File CNAME creato automaticamente
- [ ] Propagazione DNS completata
- [ ] Sito accessibile via dominio personalizzato
- [ ] Certificato SSL attivo e funzionante
- [ ] Test connessione HTTPS superato

## 🎯 Esempio Pratico

**Scenario**: Vuoi usare `dashboard.awentia.it` per la tua dashboard

1. Vai su GitHub → Settings → Pages
2. Inserisci `dashboard.awentia.it` come dominio personalizzato
3. Configura DNS con il tuo provider:
   ```
   Tipo: CNAME
   Nome: dashboard
   Valore: tuo-username.github.io
   TTL: 3600
   ```
4. Attendi la propagazione DNS (15 minuti - 2 ore tipicamente)
5. Abilita "Enforce HTTPS"
6. Verifica che il sito sia accessibile su `https://dashboard.awentia.it`

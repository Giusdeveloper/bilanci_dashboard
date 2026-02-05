# Configurazione RLS (Row Level Security) per Isolamento Dati

## 🎯 Obiettivo
Implementare l'isolamento dei dati tra aziende diverse utilizzando le RLS policies di Supabase.

## 📋 Passaggi

### 1. Accedi al Dashboard Supabase
1. Vai su [supabase.com](https://supabase.com)
2. Accedi al tuo progetto
3. Vai su **Authentication** > **Policies**

### 2. Esegui le Query SQL
1. Vai su **SQL Editor** nel dashboard Supabase
2. Copia e incolla il contenuto del file `scripts/rls-policies.sql`
3. Esegui le query

### 3. Verifica le Policies
Dopo aver eseguito le query, dovresti vedere queste policies:

#### Companies Table:
- ✅ `Admin can view all companies` (SELECT)
- ✅ `Only admin can modify companies` (ALL)

#### Users Table:
- ✅ `Users can view own record` (SELECT)
- ✅ `Admin can view all users` (SELECT)
- ✅ `Only admin can modify users` (ALL)

#### Financial Data Table:
- ✅ `Admin can view all financial data` (SELECT)
- ✅ `Client can view own company data` (SELECT)
- ✅ `Only admin can modify financial data` (ALL)

## 🧪 Test delle Policies

### Esegui il Test
```bash
npx tsx scripts/test-rls-policies.ts
```

### Risultati Attesi
- ✅ **Admin**: può vedere e modificare tutti i dati
- ✅ **Client**: può vedere solo i dati della propria azienda
- ✅ **Isolamento**: i dati di un'azienda non sono visibili ad altre aziende

## 🔒 Sicurezza

### Livelli di Accesso

#### Admin (`role: 'admin'`)
- 👁️ **Vede**: tutte le aziende, tutti gli utenti, tutti i dati finanziari
- ✏️ **Modifica**: può creare, modificare, eliminare qualsiasi dato
- 🏢 **Gestisce**: aziende, utenti, dati finanziari

#### Client (`role: 'client'`)
- 👁️ **Vede**: solo i dati della propria azienda
- 🚫 **Non può**: modificare dati finanziari
- 🔒 **Isolato**: non può accedere ai dati di altre aziende

## 🚨 Troubleshooting

### Problema: "Policy not found"
- Verifica che le query SQL siano state eseguite correttamente
- Controlla che RLS sia abilitato per tutte le tabelle

### Problema: "Access denied"
- Verifica che l'utente abbia il ruolo corretto
- Controlla che l'azienda sia associata correttamente all'utente

### Problema: "Data not visible"
- Verifica che l'utente sia associato all'azienda corretta
- Controlla che i dati abbiano il `company_id` corretto

## 📊 Monitoraggio

### Log di Accesso
- Supabase Dashboard > **Logs** > **Auth**
- Supabase Dashboard > **Logs** > **Database**

### Metriche
- Numero di accessi per azienda
- Tentativi di accesso non autorizzati
- Performance delle query con RLS

## ✅ Checklist

- [ ] RLS abilitato per tutte le tabelle
- [ ] Policies create per companies
- [ ] Policies create per users  
- [ ] Policies create per financial_data
- [ ] Test eseguito con successo
- [ ] Admin può accedere a tutti i dati
- [ ] Client può accedere solo ai propri dati
- [ ] Isolamento verificato tra aziende

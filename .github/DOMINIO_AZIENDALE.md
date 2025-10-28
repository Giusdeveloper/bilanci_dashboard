# 🌐 Guida Rapida: Collegare il Dominio Aziendale

## ⚡ Setup Veloce (5 minuti)

### 1️⃣ Configura su GitHub

1. **Imposta la variabile del dominio** (opzionale):
   - Vai su **Settings** → **Secrets and variables** → **Actions**
   - Tab **Variables** → **New repository variable**
   - Nome: `CUSTOM_DOMAIN`
   - Valore: Il tuo dominio (es: `dashboard.tuaazienda.it`)

2. **Configura GitHub Pages**:
   - Vai su **Settings** → **Pages**
   - Inserisci il tuo dominio in **Custom domain**
   - Attiva **Enforce HTTPS**
   - Salva

### 2️⃣ Configura i DNS

#### Se usi un sottodominio (es: dashboard.tuaazienda.it):
```
Tipo: CNAME
Nome: dashboard
Valore: tuo-username.github.io
```

#### Se usi il dominio root (es: tuaazienda.it):
Aggiungi questi 4 record A:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### 3️⃣ Attendi e Verifica

- ⏳ Attendi la propagazione DNS (15 minuti - 2 ore)
- ✅ Verifica su GitHub che il dominio sia riconosciuto
- ✅ Testa l'accesso via HTTPS

## 📚 Documentazione Completa

Per istruzioni dettagliate, troubleshooting e esempi completi, vedi:
- **[CUSTOM_DOMAIN.md](CUSTOM_DOMAIN.md)** - Guida completa passo-passo

## 🔍 Verifica Rapida

```bash
# Test DNS
dig dashboard.tuaazienda.it

# Test HTTPS
curl -I https://dashboard.tuaazienda.it
```

## ❓ FAQ

**Q: Quanto tempo ci vuole?**  
A: 15 minuti - 2 ore tipicamente, fino a 48 ore nel caso peggiore.

**Q: Devo pagare per HTTPS?**  
A: No, GitHub fornisce certificati SSL gratuiti.

**Q: Posso usare sia dominio root che sottodominio?**  
A: Sì, ma devi configurare DNS separati per ciascuno.

## 🆘 Problemi Comuni

**Dominio non funziona?**
- Verifica i record DNS
- Controlla le impostazioni GitHub Pages
- Attendi la propagazione DNS

**Certificato SSL non valido?**
- Rimuovi e riaggiungi il dominio su GitHub
- Attendi alcune ore per la rigenerazione del certificato

Per più dettagli, consulta [CUSTOM_DOMAIN.md](CUSTOM_DOMAIN.md).

# Email ingest PoC — n8n + Supabase

Sprint B: orchestrazione email esterna (n8n) + ETL in Supabase (`email-ingest` → `import-bilancio`).

## Architettura

```
Email studio → n8n (Gmail trigger / forwarding)
            → POST email-ingest (allegato + metadati)
            → Storage bucket inbound-bilanci
            → import-bilancio (dry_run default)
            → inbound_files (pending_review) + audit_log
            → [n8n] notifica admin se errore / anteprima OK
```

L'ETL resta **solo** in `shared/etl` + Edge Functions. n8n non duplica la pipeline.

## Prerequisiti Supabase

### 1. Migration

Applica `supabase/migrations/20260611160000_email_ingest_poc.sql`:

- Tabelle `email_ingest_rules`, `inbound_files`
- Bucket storage `inbound-bilanci`
- Seed regole Awentia + Maia Management

### 2. Secret Edge Function

In **Supabase Dashboard → Edge Functions → Secrets**:

| Secret | Descrizione |
|--------|-------------|
| `INGEST_WEBHOOK_SECRET` | Stringa random lunga (es. `openssl rand -hex 32`) — condivisa con n8n |

### 3. Deploy functions

```bash
npx supabase functions deploy email-ingest import-bilancio --project-ref caubhppwypkymsixsrco
```

`email-ingest` usa **solo** `X-Ingest-Secret` (no JWT utente).  
`import-bilancio` accetta lo stesso secret via header per chiamate machine-to-machine.

## Endpoint

```
POST https://caubhppwypkymsixsrco.supabase.co/functions/v1/email-ingest
```

**Headers:**

| Header | Valore |
|--------|--------|
| `X-Ingest-Secret` | valore di `INGEST_WEBHOOK_SECRET` |
| `apikey` | publishable key o service role (consigliato service role in n8n) |

**Body:** `multipart/form-data`

| Campo | Obbligatorio | Note |
|-------|--------------|------|
| `file` | sì | Allegato `.xlsx`, `.xls`, `.csv` |
| `email_from` | no | Mittente |
| `email_subject` | no | Oggetto (per regole `subject_regex`) |
| `email_to` | no | Destinatario (per `plus_address`) |
| `email_message_id` | no | Id messaggio per dedup |
| `company_slug` | no | Override manuale (salta regole) |
| `dry_run` | no | Default `true` — solo anteprima |

**Risposta OK (dry_run):**

```json
{
  "ok": true,
  "inbound_id": "...",
  "company_slug": "awentia",
  "dry_run": true,
  "preview": { "dryRun": true, "kpis": { ... } },
  "message": "Anteprima generata — revisione admin richiesta..."
}
```

## Regole routing (`email_ingest_rules`)

| match_type | Esempio match_value | Uso |
|------------|---------------------|-----|
| `subject_regex` | `(?i)awentia` | Oggetto contiene Awentia |
| `plus_address` | `awentia` | Email a `bilanci+awentia@imment.it` |
| `sender_domain` | `imment.it` | Mittente @imment.it |
| `sender_email` | `studio@example.it` | Mittente esatto |

Priorità: numero **minore** = valutata prima.

Seed PoC: Awentia (subject + plus + domain), Maia (subject + plus).

## Setup n8n

### Deploy workflow

**Istanza cloud (attivo):** [Bilanci — Email ingest PoC](https://giuseppeimment.app.n8n.cloud/workflow/zi0ggsJW5KOGq945) — ID `zi0ggsJW5KOGq945`, attualmente **inattivo** finché non configuri credenziali e variabili.

1. Apri il workflow → collega **Gmail OAuth2** su trigger e nodi notifica
2. Imposta le variabili (tabella sotto)
3. Testa con **Test manuale**, poi **Activate**

**Re-import da repo** (se modifichi `n8n/workflows/bilanci-email-ingest-poc.json`): Workflows → Import from file, oppure deploy via MCP con `N8N_API_KEY` a permessi scrittura.

### Variabili n8n (Settings → Variables)

| Variabile | Esempio |
|-----------|---------|
| `BILANCI_INGEST_URL` | `https://caubhppwypkymsixsrco.supabase.co/functions/v1/email-ingest` |
| `BILANCI_INGEST_SECRET` | stesso valore di `INGEST_WEBHOOK_SECRET` |
| `BILANCI_SUPABASE_ANON_KEY` | publishable key (header `apikey`) |
| `BILANCI_ADMIN_EMAIL` | `admin@imment.it` — destinatario notifiche successo/errore |

### Credenziali

| Credenziale | Nodi |
|-------------|------|
| **Gmail OAuth2** | Gmail trigger, Notifica successo, Notifica errore ingest |

### Flusso nodi (workflow importato)

**Ramo email (produzione PoC):**

1. **Gmail — nuova email** — poll ogni minuto, filtro Gmail `has:attachment (filename:xlsx OR filename:xls OR filename:csv) is:unread`, download allegati
2. **Espandi allegati** — un item per ogni file Excel/CSV
3. **POST email-ingest** (`dry_run=true`, multipart + secret)
4. **Import OK?** → notifica Gmail admin (successo / errore)
5. Errore HTTP → **Notifica errore ingest** (output error del nodo POST)

**Ramo test manuale:**

1. **Test manuale** (con file binario allegato) → **Prepara payload** → **POST email-ingest**

## Revisione admin

File in coda: tabella `inbound_files` con `status = pending_review`.

1. Login admin/amministrazione
2. Controlla anteprima in `preview_json` (o futura UI)
3. Conferma import da **Editor → Import** con stesso file, oppure richiama `email-ingest` con `dry_run=false`

Audit: `/settings/audit` → action `email_ingest`.

## Test manuale (curl)

```bash
curl -X POST "$BILANCI_INGEST_URL" \
  -H "X-Ingest-Secret: $BILANCI_INGEST_SECRET" \
  -H "apikey: $SUPABASE_KEY" \
  -F "file=@import_data/Bilancini/Awentia/Bilancini 2026/AWENTIA SRL 03 26.xlsx" \
  -F "email_subject=Bilancino Awentia marzo 2026" \
  -F "email_from=studio@imment.it" \
  -F "dry_run=true"
```

## Sicurezza

- Non esporre `INGEST_WEBHOOK_SECRET` nel client browser
- Usare HTTPS only
- Rate limit n8n / WAF se esposto pubblicamente
- Rotazione secret periodica

## Prossimi passi (post-PoC)

- UI admin per `email_ingest_rules` e coda `inbound_files`
- Auto-publish per regole fidate (`auto_publish = true`)
- Gmail OAuth già integrato nel workflow PoC
- Dedup su `email_message_id` + `file_hash`

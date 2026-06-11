# Email ingest PoC — n8n + Supabase

Sprint B: orchestrazione email esterna (n8n) + ETL in Supabase (`email-ingest` → `import-bilancio`).

## Architettura

```
Email studio → n8n (trigger IMAP / Graph / forwarding)
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

### Import workflow

1. Apri n8n → **Workflows** → **Import from file**
2. Seleziona `n8n/workflows/bilanci-email-ingest-poc.json`
3. Configura credenziali (vedi sotto)
4. Attiva workflow

### Credenziali n8n (variabili consigliate)

| Variabile | Esempio |
|-----------|---------|
| `BILANCI_INGEST_URL` | `https://caubhppwypkymsixsrco.supabase.co/functions/v1/email-ingest` |
| `BILANCI_INGEST_SECRET` | stesso valore di `INGEST_WEBHOOK_SECRET` |
| `BILANCI_SUPABASE_ANON_KEY` | publishable key (header `apikey`) |

### Opzioni trigger (PoC → produzione)

| Opzione | Quando |
|---------|--------|
| **Manual + file locale** | Test iniziale senza email |
| **Email Trigger (IMAP)** | PoC rapido con casella dedicata |
| **Microsoft Graph** | Produzione se studio usa M365 |
| **Forwarding** a `bilanci+azienda@imment.it` | MVP minimo |

### Flusso nodi (workflow importato)

1. **Trigger** — email ricevuta o esecuzione manuale
2. **Filtra allegati** — solo `.xlsx/.xls/.csv`
3. **HTTP Request** → `email-ingest`
4. **Branch errore** → notifica admin (email/Slack)
5. **Branch OK** → log + optional notifica “in coda review”

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
- Integrazione Graph OAuth in n8n
- Dedup su `email_message_id` + `file_hash`

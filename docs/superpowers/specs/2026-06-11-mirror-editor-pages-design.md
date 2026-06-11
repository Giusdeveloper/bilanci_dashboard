# Mirror Editor Pages — design approvato

Documento di riferimento per Sprint 4–7 e consegna MVP all’amministrazione. Basato su codice attuale e `docs/piano_gestionale_modulare.md`.

## Obiettivo

Consegnare la piattaforma al **back office Imment** in autonomia: stesse viste del cliente, ma in modalità editor con bozza, anteprima e publish unificato.

## Decisioni confermate (D1–D5)

| # | Decisione | Scelta |
|---|-----------|--------|
| D1 | Fonte mensile ufficiale | Bilancino sostituisce Excel analisi per aziende pilota |
| D2 | Publish | Unico bottone **Pubblica periodo** |
| D3 | Mapping incompleti | Warning, non blocco (blocco solo su quadratura/errori) |
| D4 | Ruolo MVP | `admin` + `amministrazione` (S6) |
| D5 | Route legacy | `/editor-bilancio` → redirect `/editor/ledger-balances` |

## Architettura mirror

Pattern: componenti condivisi `mode: 'read' | 'edit'` + **EditorShell** (periodo, bozza, ricalcola, pubblica).

| Lettura (client) | Editor (admin) | Editabile |
|------------------|----------------|-----------|
| `/` | `/editor/dashboard` | Drill-down → saldi/mapping |
| `/ce-dettaglio` | `/editor/ce-dettaglio` | Foglie CE → conto bilancino |
| `/ce-dettaglio-mensile` | `/editor/ce-dettaglio-mensile` | Idem per mese |
| `/ledger-balances` | `/editor/ledger-balances` | `balance_normalized` |
| `/ledger-mappings` | `/editor/ledger-mappings` | Mapping via bozza |
| `/partitari` | `/editor/partitari` | Sola lettura (S7) |
| `/import` | `/editor/import` (S6) ✅ | Upload wizard |

Catena dati: `account_balances` + `ledger_account_mappings` → pipeline bilancino → `financial_facts` + `report_layout`.

## Tipi change in bozza

| Tipo | Stato | Uso |
|------|-------|-----|
| `balance_update` | ✅ | Saldi conto |
| `mapping_update` | ✅ (S5 UI) | Analitica, famiglia, segno |
| `manual_fact` | ✅ (S6) | Override mirato CE |
| `layout_override` | ✅ (S7) | Presentazione righe |

## Publish unificato

1. Applica `draft_edit_changes` (saldi + mapping)
2. `runBilancinoPipeline` → scrive `financial_facts` + `report_layout`
3. Audit + `draft_edits.status = published`
4. Gate: quadratura OK; mapping incompleti = warning (D3)

Edge: `publish-period` (Sprint 4). Preview: `recalculate-preview` con merge mapping da bozza.

## Roadmap sprint

### Sprint 4 — Publish completo + EditorShell ✅

- Edge `publish-period`, `EditorContext`, `EditorShell`
- `/editor/ledger-balances`, redirect da `/editor-bilancio`
- Publish rigenera facts → dashboard/CE aggiornati

### Sprint 5 — Mirror CE + mapping in bozza (in corso)

- `/editor/dashboard`, `/editor/ce-dettaglio`, `/editor/ce-dettaglio-mensile`
- Mapping via bozza (no write diretto)
- Lock periodo, `/editor/bozze`

### Sprint 6 — Autonomia operativa ✅

- `/editor/import`, `manual_fact`, audit consultabile (`/settings/audit`)
- Ruolo `amministrazione`, guida in-app (guida già S6)

### Sprint 7 — Raffinamento ✅

- `/editor/partitari` (mirror read-only)
- `layout_override` in bozza + sezione presentazione in CE dettaglio editor
- `published_snapshots` + rollback da `/editor/bozze` (restore da snapshot_data, audit `period_rollback`)

## MVP (Sprint 4 + 5 ridotto)

**Must have:** import bilancino, edit saldi + mapping in bozza, ricalcolo KPI, publish periodo, audit, warning mapping.

**Out of scope MVP:** mirror sintetico/partitari, `manual_fact`, email ingest, rollback, doppia approvazione.

### Checklist accettazione

1. Import bilancino → preview OK → conferma
2. Fix mapping → KPI cambiano in anteprima
3. Fix saldi → CE preview coerente
4. Pubblica → `/dashboard` aggiornata
5. Audit `edit_publish` presente
6. Re-import stesso periodo → warning conflitto

## Riferimenti codice

| Area | Path |
|------|------|
| Editor shell | `client/src/components/EditorShell.tsx` |
| Contesto bozza | `client/src/contexts/EditorContext.tsx` |
| Draft client | `client/src/data/draftEdits.ts` |
| Publish Edge | `supabase/functions/publish-period/` |
| Preview Edge | `supabase/functions/recalculate-preview/` |
| Piano gestionale | `docs/piano_gestionale_modulare.md` |

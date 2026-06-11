# Editor IA reorganization — design approvato

Documento di riferimento per la riorganizzazione della navigazione amministrativa e la guida utilizzo (2026-06-09).

## Obiettivo

Ridurre il clutter nella sidebar admin, centralizzare l'accesso all'editor operativo e predisporre una guida strutturata senza spostare l'editor sotto Impostazioni.

## Decisione IA

| Opzione valutata | Esito |
|------------------|-------|
| Editor sotto Impostazioni | ❌ Scartata — l'editor è workflow operativo, non configurazione |
| Link multipli editor in sidebar | ❌ Scartata — duplicava voci già presenti in EditorShell |
| **Hub editor unico** | ✅ Scelta — un link sidebar + tab interne in EditorShell |

## Sidebar admin (nuova struttura)

1. **Amministrazione** (etichetta gruppo)
   - Saldi contabili → `/ledger-balances` (sola lettura)
   - Mapping conti → `/ledger-mappings` (sola lettura)
   - Editor bilancio → `/editor/dashboard`, attivo su qualsiasi `/editor/*`
2. **Guida utilizzo** → `/guida`
3. **Impostazioni** → `/settings` (invariato)

Voci rimosse: Editor dashboard, Editor saldi, Editor bozze (ridondanti con hub + tab shell).

## EditorShell

Tab interne invariate (Dashboard, CE Dettaglio, CE Mensile, Saldi, Mapping, Bozze). Aggiunto link **Guida** verso `/guida` come accesso contestuale dall'editor.

## Pagina guida `/guida`

- Route fuori dal nest `/editor/*`, disponibile agli admin (`isAdmin`, stesso pattern gate dell'editor).
- Scaffold tutorial con sezioni Accordion:
  1. Primi passi — selezione azienda/periodo
  2. Import bilancino — flusso import
  3. Modifica saldi — editor saldi
  4. Mapping conti — famiglia/analitica
  5. Anteprima e pubblicazione — ricalcola, bozza, pubblica
  6. Domande frequenti — 8 Q&A operative

Contenuto tutorial italiano completo (2026-06-11): testo operativo per amministratori, card «Percorso rapido» a 5 passi, sezioni accordion con liste, callout e link interni alle route (`/import`, `/editor/*`, consultazione). Nessun placeholder residuo.

## Verifica

- Sidebar: gruppo Amministrazione con Saldi, Mapping e hub editor, link Guida visibile agli admin.
- `/guida` accessibile solo ad admin; accordion con 6 sezioni.
- `npm test` e `npm run typecheck` senza regressioni.

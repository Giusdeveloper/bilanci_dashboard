# Indice template ETL (file Excel/CSV reali)

Questo indice mappa i file presenti in `import_data/` a **azienda** e **template di
provenienza**, come base per i futuri *golden test* della pipeline ETL.

> NOTA: i template sono dedotti dai nomi file e dalle euristiche di rilevamento in
> `client/src/utils/excelParser.ts` (`isSherpaStyle`, `detectPartitari`, nomi dei
> fogli `1_CE dettaglio` / `3_CE sintetico` / `*mensile*`). Andranno **confermati**
> aprendo i singoli file prima di scrivere i golden test definitivi.

## Tipi di template

- **`ce-standard`** — Analisi di bilancio con CE riclassificato standard
  (fogli tipo `1_CE dettaglio`, `3_CE sintetico` + varianti mensili). È il formato
  gestito dai parser `parseCEDettaglio` / `parseCESintetico` / `parseMonthlyBlocks`.
- **`sherpa42`** — Variante "Sherpa as a Service" (voci tipo `Primo Margine`,
  ricavi per success fee, fogli con `SHERPA`). Rilevato da `isSherpaStyle()` e da
  mapping azienda-specifici in `labelMapping.ts`.
- **`partitari`** — Export di partitari contabili (colonne `CodiceConto`,
  `Descr_conto`, `Data_registraz`). Rilevato da `detectPartitari()`.

## 2025 (`import_data/2025/`)

| File | Azienda | Template |
|------|---------|----------|
| `(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx` | Sherpa42 | `sherpa42` |
| `[2025] Analisi Bilanci Awentia v. 2.xlsx` | Awentia | `ce-standard` |
| `[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx` | Maia | `ce-standard` |
| `[2025] Analisi Bilancio 2F2T - Aggiornamento al 31 dicembre 2025.xlsx` | 2F2T | `ce-standard` |
| `[2025] Analisi Bilancio Babylon Vines - aggiornato al 31 dicembre 2025.xlsx` | Babylon Vines | `ce-standard` |
| `[2025] Analisi Bilancio Casa Profitto - Aggiornamento al 31 dicembre 2025.xlsx` | Casa Profitto | `ce-standard` |
| `[2025] Analisi Bilancio Khoraline - Aggiornato al 31 dicembre 2025.xlsx` | Khoraline | `ce-standard` |

## 2026 (`import_data/2026/`)

| File | Azienda | Template |
|------|---------|----------|
| `[2026] Analisi Bilanci al 28 febbraio  Awentia.xlsx` | Awentia | `ce-standard` |
| `[2026] Analisi Bilanci Maia  - aggiornato al 28 febbraio 2026 .xlsx` | Maia | `ce-standard` |
| `[2026] Analisi Bilancio 2F2T - Aggiornamento al 28 febbraio 2026.xlsx` | 2F2T | `ce-standard` |
| `[2026] Analisi Bilancio Babylon Vines - aggiornato al 28 febbraio 2026.xlsx` | Babylon Vines | `ce-standard` |
| `[2026] Analisi Bilancio Casa Profitto - Aggiornamento al 28 febbraio 2026.xlsx` | Casa Profitto | `ce-standard` |
| `[2026] Analisi Bilancio Khoraline - Aggiornato al 28 febbraio 2026.xlsx` | Khoraline | `ce-standard` |

## Altri file in `import_data/` (radice)

| File | Azienda | Template |
|------|---------|----------|
| `[2025] Analisi Bilancio 2F2T - Aggiornamento al 31 dicembre 2025.xlsx` | 2F2T | `ce-standard` |
| `[2025] Analisi Bilanci al 30 settembre Awentia - 1_CE dettaglio.csv` | Awentia | `ce-standard` (foglio CSV: CE dettaglio) |
| `[2025] Analisi Bilanci al 30 settembre Awentia - 3_CE sintetico.csv` | Awentia | `ce-standard` (foglio CSV: CE sintetico) |
| `[2025] Analisi Bilanci al 30 settembre Awentia - 4_CE sintetico mensile.csv` | Awentia | `ce-standard` (foglio CSV: CE sintetico mensile) |
| `[2025] Analisi Bilanci al 30 settebree Awentia - CE dettaglio mensile.csv` | Awentia | `ce-standard` (foglio CSV: CE dettaglio mensile) |
| `PARTITARI_BABYLON_31_12_25.xlsx` | Babylon Vines | `partitari` |
| `CASA PROFITTO VELOCE PARTITARI 31 07.csv` | Casa Profitto | `partitari` |
| `MAIA_31_12_Partitario.csv` | Maia | `partitari` |
| `2F2T SRL partitario 2025.csv` | 2F2T | `partitari` |

## Note / esclusioni

- `import_data/~$[2025] Analisi Bilanci Awentia v. 2.xlsx` è un **file di lock
  temporaneo di Excel** (prefisso `~$`): da ignorare, non è un fixture valido.
- Per i golden test ETL futuri: caricare ogni file con `ExcelParser`, confrontare
  l'output di `parseCEDettaglio` / `parseCESintetico` / `parseMonthlyBlocks` con uno
  snapshot atteso per azienda+periodo, e verificare i mapping di `labelMapping.ts`
  (in particolare le voci azienda-specifiche Sherpa42 da migrare in futuro su
  `account_mappings`).

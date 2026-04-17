# Gemini Dashboard Project - Engineering Guidelines (Master)

## Project Overview
This project is a financial dashboard for analyzing company balances (Awentia, Sherpa42, Maia Management, 2F2T). It uses a React frontend (Vite, TypeScript, Tailwind, shadcn/ui) and a Supabase backend.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Wouter (routing), Chart.js, TailwindCSS.
- **Backend**: Supabase (PostgreSQL, RLS).
- **Data Import**: Custom `ExcelParser` logic for cumulative, monthly, and source financial reports.

---

## 1. Universal Data Integrity & Import (ExcelParser)

### Dynamic Mapping & Preservation
- **Preservation**: Always preserve original cost/revenue labels from Excel files. Use `isDynamic: true` and the `rows` array to store `{ voce, valori, key, type }`.
- **Mapping**: Assign standard tags (e.g., `OP_COSTS`, `ricaviCaratteristici`) for dashboard KPI calculation while keeping the original label for UI display.
- **Bold Rule**: Any label in **ALL CAPS** (STAMPATELLO) must be rendered in **Bold** (assign `type: 'total'`).
- **Stop Rule**: Iteration must stop as soon as the row "RISULTATO DI ESERCIZIO" (or variations like "Risultato dell'esercizio") is encountered. Ignore everything below.

### Discovery & Robustness
- **Fuzzy Sheet Matching**: Detect main sheets using keywords (`economico`, `dettaglio`, `ce`, `sintetico`, `mensile`, `source`) with `includes` matching to handle flexible nomenclature (e.g., "1_ECONOMICO DETTAGLIO").
- **Year Detection**: Scan up to 20 rows above "Gennaio" for year markers (2025, 2024, 2023). Support positional mapping if years are missing.
- **Clean Number**: Normalize all inputs. Convert Excel errors (`#REF!`, `#VALUE!`, `#ERROR!`, `#DIV/0!`), empty cells, and dashes to `0`. Handle Italian currency format (dot for thousands, comma for decimals).
- **Data Input**: Always use `readAsArrayBuffer` (frontend) and `Uint8Array` (parser) for file reading to ensure browser compatibility.

### Selective Overwrite
- **Targeted Delete**: Before importing, delete only the record types being uploaded (e.g., if importing Partitari, do NOT touch Bilancio records).
- **Period Mapping**: Ensure records are unique by `(company_id, year, month, data_type)`.

---

## 2. Dashboard & KPI Standards

### KPI Consistency
- **Totale Costi**: The dashboard "Costi" card and the "TOTALE COSTI" row in the table MUST match the exact value found in the `SOURCE` sheet (Anchor: "COSTI" or "DIFFERENZA").
- **Full Expense Sum**: For P&L integrity, `Total Costs = Operating Costs + Ammortamenti + Gestione Finanziaria + Imposte`.
- **Result Row**: Use the "RISULTATO DI ESERCIZIO" value directly from the file. Do NOT recalculate or subtract taxes twice.

### Table Structure (Screenshot-Sync)
Follow the standard Awentia/Screenshot sequence:
1. TOTALE RICAVI
2. Costi Diretti
3. Costi Indiretti
4. TOTALE COSTI DIRETTI E INDIRETTI (Total)
5. GROSS PROFIT (Key Metric)
6. Altri Ricavi non Tipici
7. Spese Commerciali
8. Spese di Struttura
9. TOTALE GESTIONE STRUTTURA E NON TIPICA (Total)
10. EBITDA (Key Metric)
11. Ammortamenti, Accantonamenti e Svalutazioni
12. Gestione Straordinaria
13. EBIT (Key Metric)
14. Gestione Finanziaria
15. EBT (Key Metric)
16. TOTALE COSTI (Total - from Source)
17. RISULTATO DI ESERCIZIO (Result)

- **Spacing**: Add a blank "respiro" row before major sections (EBITDA, EBIT, TOTALE COSTI, RISULTATO).

---

## 3. UI Engineering (Frontend)

### Table Presentation
- **Opaque Backgrounds**: All sticky cells (`sticky left-0`, `sticky top-0`) MUST have a solid background color (e.g., `bg-white`, `bg-slate-100`) to prevent content overlap during scroll.
- **Z-Index Layering**: 
  - `z-50`: Frozen column + Sticky header intersection.
  - `z-30`: Sticky Headers.
  - `z-20`: Frozen columns.
- **Noise Filter (UI)**: Hide "CONTO ECONOMICO", "DICEMBRE" (as header), and isolated years (2025, 2024) from row lists to keep tables clean.
- **Dynamic Headers**: Use "Anno Prec." instead of "2024" if comparing with 2023 or other historical periods.
- **Navigation**: Month names in matrices (Gen, Feb, etc.) must be clickable `Link` components pointing to `/ce-dettaglio-mensile/:month`.

### Branding
- **Dynamic Logos**: `PageHeader` must map the selected company name/slug to its logo (Maia, Awentia, Sherpa). Use a neutral fallback (no logo) if the brand is unknown.

---

## 4. Ledger (Partitari) Management
- **Economic Filter**: Include ONLY accounts where `CodiceConto` starts with a prefix between `58/` and `88/`.
- **Column Exclusion**: Delete redundant columns during import (*Ditta, DataStoDit, DataStoAna, CodAnacf, Num_riga, Cod_causale, Attivita_ETS, Codice_UnProd, Descr_UnProD, CodAnacfControp, DescrAgg3*).

---

## Reference Information
- **Locale**: `it-IT` for currency and dates.
- **Numeric Alignment**: All numbers must be right-aligned in tables.

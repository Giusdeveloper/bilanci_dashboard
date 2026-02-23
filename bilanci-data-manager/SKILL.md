---
name: bilanci-data-manager
description: Manage the import, cleaning, and normalization of financial data from Excel/CSV to Supabase. Use when updating Awentia or Sherpa42 data, handling account filters (e.g., 58/ to 88/), or bypassing RLS for batch imports.
---

# Bilanci Data Manager

Guidance for importing and cleaning financial records for the dashboard.

## Key Workflows

### 1. Re-importing Excel Data
When data in the platform doesn't match the Excel source:
1. Use `ExcelParser` to extract `ce-dettaglio`, `ce-sintetico-mensile`, and `dashboard` records.
2. **Auto-Derive Punctual**: If the Excel only has cumulative data, use `calculatePuntualFromProgressive` to derive monthly values.
3. **Manual Cleanup**: Always delete existing records for the company/year/month before inserting to avoid constraint issues.
4. **RLS Bypass**: Use the Service Role key and `exec_sql` RPC to disable RLS during the import.

### 2. Partitari (Ledger) Filtering
- **Account Filter**: Include ONLY accounts where `CodiceConto` starts with a prefix between `58/` and `88/`.
- **Column Exclusion**: Delete non-essential columns during import (*Ditta, DataStoDit, DataStoAna, CodAnacf, Num_riga, Cod_causale, Attivita_ETS, Codice_UnProd, Descr_UnProD, CodAnacfControp, DescrAgg3*).

### 3. KPI Definitions
- **Total Costs**: Must be derived as `Operating Costs + Ammortamenti + Gestione Finanziaria + Imposte`.
- **Operating Costs**: `Totale Ricavi - EBITDA`.

## Reference Scripts
- `scripts/reimport_awentia_dec.ts`: Standard template for December re-imports.
- `client/src/utils/excelParser.ts`: Core parsing logic and label mapping.

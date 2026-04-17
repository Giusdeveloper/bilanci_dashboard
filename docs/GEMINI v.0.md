# Gemini Dashboard Project - Engineering Guidelines

## Project Overview
This project is a financial dashboard for analyzing company balances (Awentia, Sherpa42). It uses a React frontend (Vite, TypeScript, Tailwind, shadcn/ui) and a Supabase backend.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Wouter (routing), Chart.js, TailwindCSS.
- **Backend**: Supabase (PostgreSQL, RLS).
- **Data Import**: Custom `ExcelParser` logic for cumulative and monthly financial reports.

## Core Mandates & Standards

### 1. Financial Data Integrity
- **KPI Consistency**: Total Costs in the dashboard must represent the full expense sum (Operating Costs + Ammortamenti + Gestione Finanziaria + Imposte).
- **Equation Verification**: `Totale Ricavi - Totale Costi` MUST always equal `Risultato d'Esercizio`. Any discrepancy indicates a mapping or calculation error.
- **Operating vs Total**: Always distinguish between "Totale Costi Operativi" (pre-EBITDA) and "Totale Costi" (final expenses).
- **Frontend Robustness**: Always use fallback values (e.g., `|| 0`) when calculating derived totals in React components to prevent `NaN` if a database field is missing.
- **Data Formatting**: Use `it-IT` locale for currency and dates. Numeric columns in tables must be right-aligned.

### 2. Table Engineering (Sticky/Frozen Columns)
- **Opaque Backgrounds**: All sticky cells (`sticky left-0`, `sticky top-0`) MUST have a solid background color (e.g., `bg-white`, `bg-slate-100`) to prevent content overlap during scroll. Never use semi-transparent backgrounds for sticky elements.
- **Z-Index Layering**: 
  - Sticky Headers: `z-30`
  - Sticky Columns (body): `z-20`
  - Intersection (Sticky Header + Sticky Column): `z-50` or higher.
- **Automatic Sizing**: Use `w-full` and `min-w-max` with `whitespace-nowrap` for automatic column resizing based on content, except for frozen columns which require fixed widths (e.g., `w-[120px]`) to maintain sticky offsets.

### 3. Data Import Workflow
- **ExcelParser**: The parser handles both cumulative (Progressivo) and monthly (Puntuale) views. If a punctual block is missing, it should be derived from the cumulative data.
- **Subtotal Integrity**: TRUST the subtotals calculated in the Excel files (e.g., "TOTALE STRUTTURA", "MARGINE"). Avoid manual recalculation by summing individual components in the parser, as this often leads to double-counting when sub-items are also present.
- **Label Exactness**: Platform labels MUST match Excel source labels exactly (e.g., use "TOTALE STRUTTURA" instead of descriptive variations) to ensure user-recognized consistency.
- **Field Mapping Completeness**: Ensure all macro-voci from the "Sintetico" sheets are mapped, including "Altre spese di funzionamento" and "Servizi contabili".
- **Record Cleanup**: Since the `financial_data` unique constraint might be missing or inconsistent, always perform a manual `delete` of existing records for the same company/year/month/type before inserting new ones.
- **RLS Bypass**: Use the `exec_sql` RPC or a Service Role key when running import scripts to bypass Row Level Security constraints.

### 4. Codebase Conventions
- **Component Pattern**: Follow the existing pattern of using `PageHeader`, `KPICard`, and `DataTable` for consistency.
- **Test Scripts**: All new import or logic fixes should have a corresponding debug/test script in the `scripts/` directory.

## Current Status (Feb 2026)
- Dashboard table redesigned to focus on macro-aggregates.
- Partitari (Ledger) import filtered to economic accounts (58/ to 88/) and cleaned of redundant columns.
- Horizontal scrolling fixed across all monthly and raw data views.

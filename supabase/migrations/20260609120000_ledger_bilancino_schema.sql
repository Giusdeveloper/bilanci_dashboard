-- Bilanci dashboard — schema PoC bilancino Awentia (Fase 0).
--
-- STRICTLY ADDITIVE: crea solo le nuove tabelle ledger_account_mappings e
-- account_balances per il confronto bilancino vs CE. Non tocca financial_facts
-- né altre tabelle esistenti. I facts bilancino restano fuori da financial_facts
-- fino a una fase successiva (confronto in memoria nel PoC).

-- ---------------------------------------------------------------------------
-- ledger_account_mappings — mappa conti contabili (bilancino) -> analitica CE.
-- Seed dalla sheet Source del file Excel; una riga per (company, account_code).
-- ---------------------------------------------------------------------------
create table if not exists public.ledger_account_mappings (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  account_code       text not null,
  account_description text,
  famiglia           text,
  analitica_label    text not null,
  master_account_id  uuid references public.master_chart_of_accounts(id),
  sign_multiplier    numeric not null default 1,
  source_sheet       text not null default 'Source',
  source_import_id   uuid references public.imports(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint ledger_account_mappings_natural_key unique (company_id, account_code)
);

-- ---------------------------------------------------------------------------
-- account_balances — saldi mensili per conto contabile (bilancino).
-- Natural key (company_id, account_code, year, month) con month sempre valorizzato.
-- ---------------------------------------------------------------------------
create table if not exists public.account_balances (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  import_id           uuid not null references public.imports(id) on delete cascade,
  account_code        text not null,
  account_description text,
  section             text not null default 'CE',
  account_side        text,
  year                integer not null,
  month               integer not null,
  balance_raw         numeric not null,
  balance_normalized  numeric not null,
  created_at          timestamptz not null default now(),
  constraint account_balances_section_chk check (section in ('CE', 'SP')),
  constraint account_balances_side_chk check (account_side is null or account_side in ('costi', 'ricavi')),
  constraint account_balances_month_chk check (month between 1 and 12),
  constraint account_balances_natural_key unique nulls not distinct (company_id, account_code, year, month)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common access paths.
-- ---------------------------------------------------------------------------
create index if not exists ledger_account_mappings_company_idx
  on public.ledger_account_mappings (company_id);

create index if not exists account_balances_company_idx
  on public.account_balances (company_id);

create index if not exists account_balances_company_year_month_idx
  on public.account_balances (company_id, year, month);

create index if not exists account_balances_import_idx
  on public.account_balances (import_id);

-- Bilanci dashboard — normalized fact/dimension schema (Fase 2).
--
-- STRICTLY ADDITIVE: this migration only creates NEW bilanci tables and indexes.
-- It never ALTERs/DROPs/TRUNCATEs any pre-existing non-bilanci table.
-- All statements are guarded (IF NOT EXISTS / DO blocks) so the migration is
-- safe to re-apply. The only change to an existing bilanci table is adding a
-- UNIQUE constraint on the (empty) account_mappings table to support idempotent
-- seeding.

-- ---------------------------------------------------------------------------
-- fiscal_periods — reference period (year + optional month).
-- ---------------------------------------------------------------------------
create table if not exists public.fiscal_periods (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  year        integer not null,
  month       integer,
  label       text,
  created_at  timestamptz not null default now(),
  constraint fiscal_periods_month_chk check (month is null or (month between 1 and 12)),
  constraint fiscal_periods_natural_key unique nulls not distinct (company_id, year, month)
);

-- ---------------------------------------------------------------------------
-- imports — one row per ingested file. Idempotency via file_hash UNIQUE.
-- ---------------------------------------------------------------------------
create table if not exists public.imports (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  source_filename  text not null,
  file_hash        text not null,
  template_profile text,
  status           text not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint imports_file_hash_key unique (file_hash),
  constraint imports_status_chk check (status in ('pending','processing','completed','failed'))
);

-- ---------------------------------------------------------------------------
-- financial_facts — normalized facts (period x canonical account).
-- Natural key (company_id, category_id, year, month) with month NULL treated as
-- a distinct value (annual fact) thanks to NULLS NOT DISTINCT.
-- ---------------------------------------------------------------------------
create table if not exists public.financial_facts (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  category_id         uuid not null references public.master_chart_of_accounts(id),
  year                integer not null,
  month               integer,
  amount_progressive  numeric,
  amount_period       numeric,
  source_label        text,
  import_id           uuid references public.imports(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint financial_facts_month_chk check (month is null or (month between 1 and 12)),
  constraint financial_facts_natural_key unique nulls not distinct (company_id, category_id, year, month)
);

-- ---------------------------------------------------------------------------
-- import_warnings — explicit, never-silent issues raised during an import.
-- ---------------------------------------------------------------------------
create table if not exists public.import_warnings (
  id         uuid primary key default gen_random_uuid(),
  import_id  uuid not null references public.imports(id) on delete cascade,
  severity   text not null default 'warning',
  message    text not null,
  created_at timestamptz not null default now(),
  constraint import_warnings_severity_chk check (severity in ('info','warning','error'))
);

-- ---------------------------------------------------------------------------
-- report_layout — faithful reproduction of the original CE layout, so the UI
-- can render exactly what the Excel shows (order, hierarchy, mapped or not).
-- ---------------------------------------------------------------------------
create table if not exists public.report_layout (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  import_id          uuid references public.imports(id) on delete cascade,
  report_type        text not null,
  year               integer not null,
  profile            text,
  row_index          integer not null,
  original_label     text not null,
  indent_level       integer not null default 0,
  row_kind           text,
  master_account_id  uuid references public.master_chart_of_accounts(id),
  is_mapped          boolean not null default false,
  amount_progressive numeric,
  created_at         timestamptz not null default now(),
  constraint report_layout_row_kind_chk
    check (row_kind is null or row_kind in ('voce','subtotale','totale','margine','risultato')),
  constraint report_layout_natural_key unique (company_id, report_type, year, row_index)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common access paths.
-- ---------------------------------------------------------------------------
create index if not exists financial_facts_company_year_idx on public.financial_facts (company_id, year, month);
create index if not exists financial_facts_category_idx     on public.financial_facts (category_id);
create index if not exists import_warnings_import_idx        on public.import_warnings (import_id);
create index if not exists report_layout_company_idx         on public.report_layout (company_id, report_type, year);
create index if not exists imports_company_idx               on public.imports (company_id);
create index if not exists fiscal_periods_company_idx        on public.fiscal_periods (company_id, year);

-- ---------------------------------------------------------------------------
-- Additive UNIQUE on the existing (empty) account_mappings table, required for
-- idempotent per-company seeding (ON CONFLICT (company_id, original_label)).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'account_mappings_company_label_key'
  ) then
    alter table public.account_mappings
      add constraint account_mappings_company_label_key unique (company_id, original_label);
  end if;
end $$;

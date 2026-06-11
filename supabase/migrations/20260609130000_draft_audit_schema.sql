-- Bilanci dashboard — schema bozze editing + audit trail (Sprint 2 gestionale).
--
-- STRICTLY ADDITIVE: tabelle draft_edits, draft_edit_changes, audit_log.
-- Supporta workflow preview → commit senza toccare i dati published finché
-- non viene eseguito publish_draft (Sprint 3).

-- ---------------------------------------------------------------------------
-- draft_edits — bozza di modifica per periodo (company × year × month).
-- preview_snapshot: output KPI/facts dopo ricalcolo pipeline in memoria.
-- ---------------------------------------------------------------------------
create table if not exists public.draft_edits (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  year               integer not null,
  month              integer,
  status             text not null default 'draft',
  title              text,
  notes              text,
  preview_snapshot   jsonb,
  created_by         uuid references auth.users(id) on delete set null,
  published_at       timestamptz,
  base_import_id     uuid references public.imports(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint draft_edits_status_chk
    check (status in ('draft', 'pending_review', 'published', 'rejected')),
  constraint draft_edits_month_chk check (month is null or (month between 1 and 12))
);

-- Una sola bozza attiva (status=draft) per periodo; pending_review ammette più righe storiche.
create unique index if not exists draft_edits_one_active_draft_idx
  on public.draft_edits (company_id, year, month)
  nulls not distinct
  where status = 'draft';

create index if not exists draft_edits_company_idx
  on public.draft_edits (company_id);

create index if not exists draft_edits_company_year_month_idx
  on public.draft_edits (company_id, year, month);

-- ---------------------------------------------------------------------------
-- draft_edit_changes — delta atomico per audit e rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.draft_edit_changes (
  id             uuid primary key default gen_random_uuid(),
  draft_edit_id  uuid not null references public.draft_edits(id) on delete cascade,
  change_type    text not null,
  entity_table   text not null,
  entity_key     jsonb not null default '{}',
  field_name     text not null,
  old_value      jsonb,
  new_value      jsonb,
  created_at     timestamptz not null default now(),
  constraint draft_edit_changes_type_chk
    check (change_type in ('balance_update', 'mapping_update', 'manual_fact'))
);

create index if not exists draft_edit_changes_draft_idx
  on public.draft_edit_changes (draft_edit_id);

create index if not exists draft_edit_changes_created_at_idx
  on public.draft_edit_changes (created_at);

-- ---------------------------------------------------------------------------
-- audit_log — trail append-only per azioni sensibili (import, publish, mapping).
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references public.companies(id) on delete set null,
  actor_id     uuid references auth.users(id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    text,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_company_idx
  on public.audit_log (company_id);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);

create index if not exists audit_log_action_idx
  on public.audit_log (action);

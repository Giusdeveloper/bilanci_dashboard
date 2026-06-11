-- Sprint 7 — layout_override draft type, report_layout presentation columns, published_snapshots.

-- ---------------------------------------------------------------------------
-- draft_edit_changes — allow layout_override change type
-- ---------------------------------------------------------------------------
alter table public.draft_edit_changes
  drop constraint if exists draft_edit_changes_type_chk;

alter table public.draft_edit_changes
  add constraint draft_edit_changes_type_chk
  check (change_type in ('balance_update', 'mapping_update', 'manual_fact', 'layout_override'));

-- ---------------------------------------------------------------------------
-- report_layout — optional presentation overrides (applied at publish)
-- ---------------------------------------------------------------------------
alter table public.report_layout
  add column if not exists display_label text,
  add column if not exists is_hidden boolean not null default false;

-- ---------------------------------------------------------------------------
-- published_snapshots — version history for rollback (facts + layout in JSONB)
-- Rollback restores snapshot_data instead of re-running the pipeline.
-- ---------------------------------------------------------------------------
create table if not exists public.published_snapshots (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  period_year     integer not null,
  period_month    integer not null,
  version         integer not null,
  published_by    uuid references auth.users(id) on delete set null,
  published_at    timestamptz not null default now(),
  import_id       uuid references public.imports(id) on delete set null,
  draft_edit_id   uuid references public.draft_edits(id) on delete set null,
  facts_hash      text not null,
  snapshot_data   jsonb not null default '{}',
  constraint published_snapshots_month_chk check (period_month between 1 and 12),
  constraint published_snapshots_version_unique unique (company_id, period_year, period_month, version)
);

create index if not exists published_snapshots_company_period_idx
  on public.published_snapshots (company_id, period_year, period_month, version desc);

create index if not exists published_snapshots_published_at_idx
  on public.published_snapshots (published_at desc);

alter table public.published_snapshots enable row level security;

drop policy if exists published_snapshots_operativo_read on public.published_snapshots;
create policy published_snapshots_operativo_read on public.published_snapshots
  for select
  using (public.is_bilanci_operativo());

-- Writes only via service_role (Edge Functions publish-period / rollback-period).
drop policy if exists published_snapshots_service_all on public.published_snapshots;
create policy published_snapshots_service_all on public.published_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

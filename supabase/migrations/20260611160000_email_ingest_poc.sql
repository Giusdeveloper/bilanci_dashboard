-- Email ingest PoC — regole routing, tracciamento file inbound, bucket storage.
-- Sprint B: n8n → email-ingest → import-bilancio

-- ---------------------------------------------------------------------------
-- imports: estensione source + status pending_review
-- ---------------------------------------------------------------------------
alter table public.imports
  add column if not exists source text not null default 'ui';

alter table public.imports
  drop constraint if exists imports_status_chk;

alter table public.imports
  add constraint imports_status_chk
  check (status in ('pending', 'pending_review', 'processing', 'completed', 'failed'));

alter table public.imports
  drop constraint if exists imports_source_chk;

alter table public.imports
  add constraint imports_source_chk
  check (source in ('ui', 'email', 'api', 'n8n'));

-- ---------------------------------------------------------------------------
-- email_ingest_rules — routing email → company
-- ---------------------------------------------------------------------------
create table if not exists public.email_ingest_rules (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  match_type    text not null,
  match_value   text not null,
  file_type     text not null default 'bilancino',
  auto_publish  boolean not null default false,
  priority      integer not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint email_ingest_rules_natural_key unique (company_id, match_type, match_value),
  constraint email_ingest_rules_match_type_chk
    check (match_type in ('sender_domain', 'subject_regex', 'plus_address', 'sender_email')),
  constraint email_ingest_rules_file_type_chk
    check (file_type in ('bilancino', 'ce_analisi', 'auto'))
);

create index if not exists email_ingest_rules_active_priority_idx
  on public.email_ingest_rules (active, priority);

-- ---------------------------------------------------------------------------
-- inbound_files — tracciamento file da email / storage
-- ---------------------------------------------------------------------------
create table if not exists public.inbound_files (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete set null,
  storage_path     text,
  file_hash        text,
  source           text not null default 'email',
  email_from       text,
  email_subject    text,
  email_message_id text,
  import_id        uuid references public.imports(id) on delete set null,
  status           text not null default 'received',
  error_message    text,
  preview_json     jsonb,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  constraint inbound_files_source_chk check (source in ('email', 'ui_upload', 'api', 'n8n')),
  constraint inbound_files_status_chk
    check (status in ('received', 'processing', 'pending_review', 'completed', 'failed'))
);

create index if not exists inbound_files_company_received_idx
  on public.inbound_files (company_id, received_at desc);

create index if not exists inbound_files_status_idx
  on public.inbound_files (status);

-- ---------------------------------------------------------------------------
-- RLS — staff operativo
-- ---------------------------------------------------------------------------
alter table public.email_ingest_rules enable row level security;
alter table public.inbound_files enable row level security;

drop policy if exists email_ingest_rules_operativo_all on public.email_ingest_rules;
create policy email_ingest_rules_operativo_all on public.email_ingest_rules
  for all using (public.is_bilanci_operativo())
  with check (public.is_bilanci_admin());

drop policy if exists inbound_files_operativo_all on public.inbound_files;
create policy inbound_files_operativo_all on public.inbound_files
  for all using (public.is_bilanci_operativo())
  with check (public.is_bilanci_operativo());

-- Service role / edge functions bypass RLS

-- ---------------------------------------------------------------------------
-- Storage bucket inbound-bilanci (privato)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inbound-bilanci',
  'inbound-bilanci',
  false,
  52428800,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do nothing;

drop policy if exists inbound_bilanci_operativo_select on storage.objects;
create policy inbound_bilanci_operativo_select on storage.objects
  for select using (
    bucket_id = 'inbound-bilanci'
    and public.is_bilanci_operativo()
  );

drop policy if exists inbound_bilanci_service_insert on storage.objects;
create policy inbound_bilanci_service_insert on storage.objects
  for insert with check (bucket_id = 'inbound-bilanci');

-- ---------------------------------------------------------------------------
-- Seed regole pilota Awentia + Maia
-- ---------------------------------------------------------------------------
insert into public.email_ingest_rules (company_id, match_type, match_value, file_type, auto_publish, priority)
select c.id, v.match_type, v.match_value, v.file_type, v.auto_publish, v.priority
from public.companies c
cross join (
  values
    ('subject_regex', '(?i)awentia', 'bilancino', false, 10),
    ('plus_address', 'awentia', 'bilancino', false, 20),
    ('sender_domain', 'imment.it', 'bilancino', false, 50)
) as v(match_type, match_value, file_type, auto_publish, priority)
where c.slug = 'awentia'
on conflict do nothing;

insert into public.email_ingest_rules (company_id, match_type, match_value, file_type, auto_publish, priority)
select c.id, v.match_type, v.match_value, v.file_type, v.auto_publish, v.priority
from public.companies c
cross join (
  values
    ('subject_regex', '(?i)maia', 'bilancino', false, 10),
    ('plus_address', 'maia', 'bilancino', false, 20)
) as v(match_type, match_value, file_type, auto_publish, priority)
where c.slug = 'maia-management'
on conflict do nothing;

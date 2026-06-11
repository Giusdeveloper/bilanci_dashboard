-- Fase 1c + 2: famiglie per azienda e profilo CE rollup bilancino.
--
-- STRICTLY ADDITIVE: company_famiglie + companies.ce_profile + seed awentia/sherpa42.

-- ---------------------------------------------------------------------------
-- company_famiglie — tassonomia famiglia conto per company (dropdown UI).
-- ---------------------------------------------------------------------------
create table if not exists public.company_famiglie (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,
  label       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint company_famiglie_natural_key unique (company_id, code)
);

create index if not exists company_famiglie_company_idx
  on public.company_famiglie (company_id);

-- ---------------------------------------------------------------------------
-- companies.ce_profile — slug profilo rollup CE (default da slug azienda).
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists ce_profile text;

-- ---------------------------------------------------------------------------
-- RLS company_famiglie (allineato ledger_account_mappings).
-- ---------------------------------------------------------------------------
alter table public.company_famiglie enable row level security;

drop policy if exists company_famiglie_service_all on public.company_famiglie;
create policy company_famiglie_service_all on public.company_famiglie
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists company_famiglie_admin_all on public.company_famiglie;
create policy company_famiglie_admin_all on public.company_famiglie
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

drop policy if exists company_famiglie_client_read on public.company_famiglie;
create policy company_famiglie_client_read on public.company_famiglie
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed famiglie default + ce_profile per awentia e sherpa42.
-- ---------------------------------------------------------------------------
insert into public.company_famiglie (company_id, code, label, sort_order)
select c.id, v.code, v.label, v.sort_order
from public.companies c
cross join (
  values
    ('struttura', 'Struttura', 1),
    ('commerciali', 'Commerciali', 2),
    ('diretti', 'Diretti', 3),
    ('indiretti', 'Indiretti', 4),
    ('ricavi', 'Ricavi', 5),
    ('ammortamenti', 'Ammortamenti', 6),
    ('gestione_finanziaria', 'Gestione finanziaria', 7),
    ('imposte', 'Imposte', 8)
) as v(code, label, sort_order)
where c.slug = 'awentia'
on conflict (company_id, code) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

insert into public.company_famiglie (company_id, code, label, sort_order)
select c.id, v.code, v.label, v.sort_order
from public.companies c
cross join (
  values
    ('ricavi', 'Ricavi', 1),
    ('costi_variabili', 'Costi variabili', 2),
    ('costi_fissi', 'Costi fissi', 3),
    ('ammortamenti', 'Ammortamenti', 4),
    ('gestione_finanziaria', 'Gestione finanziaria', 5),
    ('imposte', 'Imposte', 6)
) as v(code, label, sort_order)
where c.slug = 'sherpa42'
on conflict (company_id, code) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

update public.companies set ce_profile = 'awentia' where slug = 'awentia' and ce_profile is null;
update public.companies set ce_profile = 'sherpa42' where slug = 'sherpa42' and ce_profile is null;

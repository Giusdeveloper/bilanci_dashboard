-- Bilanci dashboard — RLS policies for the new normalized tables (Fase 2).
--
-- Model (deny-by-default): RLS enabled on every new table, with three policy
-- families mirroring the existing bilanci tables:
--   * service_role  -> full access (used by the Edge Function and server scripts)
--   * bilanci admin -> full access (bilanci_users.role = 'admin')
--   * client        -> read-only on rows belonging to their own company_id
-- Any other role with no matching policy is denied.
--
-- Idempotent: policies are dropped-if-exists before being (re)created.

-- fiscal_periods -------------------------------------------------------------
alter table public.fiscal_periods enable row level security;

drop policy if exists fiscal_periods_service_all on public.fiscal_periods;
create policy fiscal_periods_service_all on public.fiscal_periods
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists fiscal_periods_admin_all on public.fiscal_periods;
create policy fiscal_periods_admin_all on public.fiscal_periods
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists fiscal_periods_client_read on public.fiscal_periods;
create policy fiscal_periods_client_read on public.fiscal_periods
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- imports --------------------------------------------------------------------
alter table public.imports enable row level security;

drop policy if exists imports_service_all on public.imports;
create policy imports_service_all on public.imports
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists imports_admin_all on public.imports;
create policy imports_admin_all on public.imports
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists imports_client_read on public.imports;
create policy imports_client_read on public.imports
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- financial_facts ------------------------------------------------------------
alter table public.financial_facts enable row level security;

drop policy if exists financial_facts_service_all on public.financial_facts;
create policy financial_facts_service_all on public.financial_facts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists financial_facts_admin_all on public.financial_facts;
create policy financial_facts_admin_all on public.financial_facts
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists financial_facts_client_read on public.financial_facts;
create policy financial_facts_client_read on public.financial_facts
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- report_layout --------------------------------------------------------------
alter table public.report_layout enable row level security;

drop policy if exists report_layout_service_all on public.report_layout;
create policy report_layout_service_all on public.report_layout
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists report_layout_admin_all on public.report_layout;
create policy report_layout_admin_all on public.report_layout
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists report_layout_client_read on public.report_layout;
create policy report_layout_client_read on public.report_layout
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- import_warnings (no company_id: resolve company via the parent import) ------
alter table public.import_warnings enable row level security;

drop policy if exists import_warnings_service_all on public.import_warnings;
create policy import_warnings_service_all on public.import_warnings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists import_warnings_admin_all on public.import_warnings;
create policy import_warnings_admin_all on public.import_warnings
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists import_warnings_client_read on public.import_warnings;
create policy import_warnings_client_read on public.import_warnings
  for select
  using (exists (
    select 1
    from public.imports i
    join public.bilanci_users u on u.company_id = i.company_id
    where i.id = import_warnings.import_id and u.id = auth.uid()
  ));

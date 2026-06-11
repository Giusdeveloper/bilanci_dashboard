-- Bilanci dashboard — RLS hardening for the EXISTING/legacy bilanci tables (Fase 4).
--
-- Goal: move multi-tenant isolation into the DB, not only the client-side `.eq()`.
--
-- Scope (bilanci tables only): `companies`, `financial_data`, plus a read policy
-- on the shared reference table `master_chart_of_accounts` so authenticated
-- bilanci users (admin/client) can resolve account codes/labels through the new
-- typed read layer. RLS is already enabled on all of these.
--
-- This migration is strictly ADDITIVE and safe for the shared project (it never
-- touches the `fundops_*` app): it only enables RLS (idempotent) and (re)creates
-- bilanci-scoped policies. The single removal is the insecure
-- `financial_data_read_all` policy (USING true) which leaked every tenant's data
-- to anyone — replaced by admin-full + client-own-company.
--
-- Policy model mirrors the new normalized tables:
--   * service_role  -> full access (left untouched where present)
--   * bilanci admin -> full access (bilanci_users.role = 'admin')
--   * client        -> read-only on their own company_id
-- The pre-existing `*_staff_all` (fundops imment_admin/operator) policies and
-- `*_service_all` policies are intentionally left in place.

-- companies ------------------------------------------------------------------
alter table public.companies enable row level security;

drop policy if exists companies_bilanci_admin_all on public.companies;
create policy companies_bilanci_admin_all on public.companies
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

-- Un client vede SOLO la propria azienda.
drop policy if exists companies_bilanci_client_read on public.companies;
create policy companies_bilanci_client_read on public.companies
  for select
  using (id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- financial_data (legacy blob) -----------------------------------------------
alter table public.financial_data enable row level security;

-- RIMOZIONE della policy insicura: USING (true) per {public} esponeva TUTTI i
-- dati di TUTTI i tenant a chiunque. È la falla multi-tenant da chiudere.
drop policy if exists financial_data_read_all on public.financial_data;

drop policy if exists financial_data_bilanci_admin_all on public.financial_data;
create policy financial_data_bilanci_admin_all on public.financial_data
  for all
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.bilanci_users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists financial_data_bilanci_client_read on public.financial_data;
create policy financial_data_bilanci_client_read on public.financial_data
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- master_chart_of_accounts (reference data condivisa) ------------------------
-- Necessaria al nuovo read layer: gli utenti bilanci autenticati devono poter
-- leggere il piano dei conti canonico per risolvere code/label dei facts.
-- Non è tenant-specifica: lettura per qualunque utente presente in bilanci_users.
alter table public.master_chart_of_accounts enable row level security;

drop policy if exists master_chart_of_accounts_bilanci_read on public.master_chart_of_accounts;
create policy master_chart_of_accounts_bilanci_read on public.master_chart_of_accounts
  for select
  using (exists (select 1 from public.bilanci_users u where u.id = auth.uid()));

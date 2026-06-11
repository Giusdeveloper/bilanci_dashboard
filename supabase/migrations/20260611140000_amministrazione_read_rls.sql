-- Bilanci dashboard — RLS read access for ruolo `amministrazione` on dashboard tables.
--
-- Sprint 6 added is_bilanci_operativo() for ledger/draft/import tables but left
-- companies, financial_facts, report_layout, fiscal_periods and company_famiglie
-- with admin-only or client-company policies. Staff with role amministrazione and
-- company_id IS NULL could not list companies nor load dashboard facts.

-- companies: staff operativo can list/select all companies (create remains admin-only).
drop policy if exists companies_operativo_read on public.companies;
create policy companies_operativo_read on public.companies
  for select
  using (public.is_bilanci_operativo());

-- financial_facts: dashboard / CE views
drop policy if exists financial_facts_operativo_read on public.financial_facts;
create policy financial_facts_operativo_read on public.financial_facts
  for select
  using (public.is_bilanci_operativo());

-- report_layout: structure for CE dettaglio
drop policy if exists report_layout_operativo_read on public.report_layout;
create policy report_layout_operativo_read on public.report_layout
  for select
  using (public.is_bilanci_operativo());

-- fiscal_periods: period selector in dashboard
drop policy if exists fiscal_periods_operativo_read on public.fiscal_periods;
create policy fiscal_periods_operativo_read on public.fiscal_periods
  for select
  using (public.is_bilanci_operativo());

-- financial_data: legacy blob reads (partitari, source, etc.)
drop policy if exists financial_data_operativo_read on public.financial_data;
create policy financial_data_operativo_read on public.financial_data
  for select
  using (public.is_bilanci_operativo());

-- company_famiglie: famiglia dropdown in editor
drop policy if exists company_famiglie_operativo_read on public.company_famiglie;
create policy company_famiglie_operativo_read on public.company_famiglie
  for select
  using (public.is_bilanci_operativo());

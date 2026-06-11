-- Bilanci dashboard — fix RLS infinite recursion on bilanci_users (Fase 4).
--
-- Root cause: the pre-existing policy "Accesso Admin" on `bilanci_users` checks
-- admin status with a subquery ON bilanci_users itself. Under RLS that subquery
-- re-triggers the same policy -> Postgres raises
--   "42P17: infinite recursion detected in policy for relation bilanci_users".
-- Because every bilanci policy (companies, financial_facts, report_layout, ...)
-- resolves admin/company via a subquery on bilanci_users, this recursion broke
-- ALL authenticated reads, including the new typed read layer.
--
-- Fix: a SECURITY DEFINER helper `public.is_bilanci_admin()` that checks the
-- role bypassing RLS (no recursion), and rewrite the admin-side policies to use
-- it. Strictly additive/safe: only a function + policy (re)creation on bilanci
-- tables; fundops_* untouched. Client-read policies keep their subquery (they
-- resolve via the non-recursive "Profilo Personale" self-select).

-- Helper: is the current user a bilanci admin? (SECURITY DEFINER => RLS-bypassing)
create or replace function public.is_bilanci_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bilanci_users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

revoke all on function public.is_bilanci_admin() from public;
grant execute on function public.is_bilanci_admin() to anon, authenticated, service_role;

-- bilanci_users: replace the recursive admin policy with the helper -----------
drop policy if exists "Accesso Admin" on public.bilanci_users;
drop policy if exists bilanci_users_admin_all on public.bilanci_users;
create policy bilanci_users_admin_all on public.bilanci_users
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());
-- "Profilo Personale" (select own row), service_all and staff_all stay as-is.

-- companies: admin policy via helper (avoids re-applying bilanci_users RLS) ----
drop policy if exists companies_bilanci_admin_all on public.companies;
create policy companies_bilanci_admin_all on public.companies
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

-- financial_data: admin policy via helper ------------------------------------
drop policy if exists financial_data_bilanci_admin_all on public.financial_data;
create policy financial_data_bilanci_admin_all on public.financial_data
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

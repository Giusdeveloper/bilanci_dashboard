-- Bilanci dashboard — RLS per draft_edits, draft_edit_changes, audit_log (Sprint 2).
--
-- Model (deny-by-default):
--   * service_role  -> accesso completo (Edge Function, script server)
--   * bilanci admin -> accesso completo via is_bilanci_admin()
--   * client        -> sola lettura draft published; audit_log limitato alla propria company
-- audit_log: append-only lato client (no UPDATE/DELETE).

-- draft_edits ----------------------------------------------------------------
alter table public.draft_edits enable row level security;

drop policy if exists draft_edits_service_all on public.draft_edits;
create policy draft_edits_service_all on public.draft_edits
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists draft_edits_admin_all on public.draft_edits;
create policy draft_edits_admin_all on public.draft_edits
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

drop policy if exists draft_edits_client_read_published on public.draft_edits;
create policy draft_edits_client_read_published on public.draft_edits
  for select
  using (
    status = 'published'
    and company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid())
  );

-- draft_edit_changes ---------------------------------------------------------
alter table public.draft_edit_changes enable row level security;

drop policy if exists draft_edit_changes_service_all on public.draft_edit_changes;
create policy draft_edit_changes_service_all on public.draft_edit_changes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists draft_edit_changes_admin_all on public.draft_edit_changes;
create policy draft_edit_changes_admin_all on public.draft_edit_changes
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

-- Client: nessuna policy → deny (MVP editor solo admin).

-- audit_log ------------------------------------------------------------------
alter table public.audit_log enable row level security;

drop policy if exists audit_log_service_all on public.audit_log;
create policy audit_log_service_all on public.audit_log
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log
  for select using (public.is_bilanci_admin());

drop policy if exists audit_log_admin_insert on public.audit_log;
create policy audit_log_admin_insert on public.audit_log
  for insert
  with check (public.is_bilanci_admin());

drop policy if exists audit_log_client_read on public.audit_log;
create policy audit_log_client_read on public.audit_log
  for select
  using (
    company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid())
  );

-- Nessuna policy UPDATE/DELETE per ruoli client/authenticated → append-only.

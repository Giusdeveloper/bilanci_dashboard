-- Bilanci dashboard — RLS per tabelle PoC bilancino (Fase 0).
--
-- Model (deny-by-default): RLS abilitato su entrambe le tabelle, con tre famiglie
-- di policy allineate alle tabelle bilanci normalizzate:
--   * service_role  -> accesso completo (Edge Function e script server)
--   * bilanci admin -> accesso completo (via is_bilanci_admin(), no recursion)
--   * client        -> sola lettura sulle righe della propria company_id
-- Qualunque altro ruolo senza policy corrispondente è negato.
--
-- Idempotent: drop-if-exists prima di (ri)creare le policy.

-- ledger_account_mappings ----------------------------------------------------
alter table public.ledger_account_mappings enable row level security;

drop policy if exists ledger_account_mappings_service_all on public.ledger_account_mappings;
create policy ledger_account_mappings_service_all on public.ledger_account_mappings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists ledger_account_mappings_admin_all on public.ledger_account_mappings;
create policy ledger_account_mappings_admin_all on public.ledger_account_mappings
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

drop policy if exists ledger_account_mappings_client_read on public.ledger_account_mappings;
create policy ledger_account_mappings_client_read on public.ledger_account_mappings
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

-- account_balances -----------------------------------------------------------
alter table public.account_balances enable row level security;

drop policy if exists account_balances_service_all on public.account_balances;
create policy account_balances_service_all on public.account_balances
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists account_balances_admin_all on public.account_balances;
create policy account_balances_admin_all on public.account_balances
  for all
  using (public.is_bilanci_admin())
  with check (public.is_bilanci_admin());

drop policy if exists account_balances_client_read on public.account_balances;
create policy account_balances_client_read on public.account_balances
  for select
  using (company_id in (select u.company_id from public.bilanci_users u where u.id = auth.uid()));

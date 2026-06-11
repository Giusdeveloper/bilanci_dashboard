-- Bilanci dashboard — RPC publish_draft_edit (Sprint 3).
--
-- Applica atomicamente i delta di una bozza su account_balances e
-- ledger_account_mappings, aggiorna lo stato bozza e scrive audit_log.

create or replace function public.publish_draft_edit(p_draft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft         record;
  v_change        record;
  v_import_id     uuid;
  v_actor         uuid;
  v_account_code  text;
  v_year          integer;
  v_month         integer;
  v_balance       numeric;
  v_existing      record;
  v_balances      integer := 0;
  v_mappings      integer := 0;
begin
  if not public.is_bilanci_admin() then
    raise exception 'Permesso negato: solo gli amministratori possono pubblicare bozze';
  end if;

  v_actor := auth.uid();

  select *
    into v_draft
    from public.draft_edits
   where id = p_draft_id
     for update;

  if not found then
    raise exception 'Bozza non trovata: %', p_draft_id;
  end if;

  if v_draft.status not in ('draft', 'pending_review') then
    raise exception 'Bozza non pubblicabile (stato: %)', v_draft.status;
  end if;

  v_import_id := v_draft.base_import_id;
  if v_import_id is null then
    select ab.import_id
      into v_import_id
      from public.account_balances ab
     where ab.company_id = v_draft.company_id
       and ab.year = v_draft.year
       and ab.month = v_draft.month
     limit 1;
  end if;

  if v_import_id is null then
    raise exception 'Import di riferimento mancante: impossibile pubblicare i saldi per il periodo';
  end if;

  for v_change in
    select *
      from public.draft_edit_changes
     where draft_edit_id = p_draft_id
     order by created_at
  loop
    if v_change.change_type = 'balance_update' then
      v_account_code := v_change.entity_key->>'account_code';
      v_year := nullif(v_change.entity_key->>'year', '')::integer;
      v_month := nullif(v_change.entity_key->>'month', '')::integer;
      v_balance := nullif(v_change.new_value->>'balance_normalized', '')::numeric;

      if v_account_code is null or v_year is null or v_month is null or v_balance is null then
        raise exception 'Change balance_update non valido (id: %)', v_change.id;
      end if;

      select ab.account_description, ab.section, ab.account_side, ab.balance_raw
        into v_existing
        from public.account_balances ab
       where ab.company_id = v_draft.company_id
         and ab.account_code = v_account_code
         and ab.year = v_year
         and ab.month = v_month;

      insert into public.account_balances (
        company_id, import_id, account_code, account_description,
        section, account_side, year, month, balance_raw, balance_normalized
      ) values (
        v_draft.company_id,
        v_import_id,
        v_account_code,
        coalesce(v_existing.account_description, v_change.new_value->>'account_description'),
        coalesce(v_existing.section, coalesce(v_change.new_value->>'section', 'CE')),
        coalesce(v_existing.account_side, v_change.new_value->>'account_side'),
        v_year,
        v_month,
        coalesce(v_existing.balance_raw, v_balance),
        v_balance
      )
      on conflict (company_id, account_code, year, month)
      do update set
        import_id = excluded.import_id,
        balance_raw = excluded.balance_normalized,
        balance_normalized = excluded.balance_normalized,
        account_description = coalesce(excluded.account_description, account_balances.account_description),
        section = coalesce(excluded.section, account_balances.section),
        account_side = coalesce(excluded.account_side, account_balances.account_side);

      v_balances := v_balances + 1;

    elsif v_change.change_type = 'mapping_update' then
      v_account_code := v_change.entity_key->>'account_code';
      if v_account_code is null then
        raise exception 'Change mapping_update senza account_code (id: %)', v_change.id;
      end if;

      insert into public.ledger_account_mappings (
        company_id, account_code, account_description, famiglia,
        analitica_label, master_account_id, sign_multiplier, source_sheet, source_import_id, updated_at
      ) values (
        v_draft.company_id,
        v_account_code,
        v_change.new_value->>'account_description',
        v_change.new_value->>'famiglia',
        coalesce(v_change.new_value->>'analitica_label', 'Non mappato'),
        nullif(v_change.new_value->>'master_account_id', '')::uuid,
        coalesce(nullif(v_change.new_value->>'sign_multiplier', '')::numeric, 1),
        coalesce(v_change.new_value->>'source_sheet', 'Editor'),
        v_import_id,
        now()
      )
      on conflict (company_id, account_code)
      do update set
        account_description = coalesce(excluded.account_description, ledger_account_mappings.account_description),
        famiglia = coalesce(excluded.famiglia, ledger_account_mappings.famiglia),
        analitica_label = excluded.analitica_label,
        master_account_id = coalesce(excluded.master_account_id, ledger_account_mappings.master_account_id),
        sign_multiplier = excluded.sign_multiplier,
        source_sheet = excluded.source_sheet,
        source_import_id = coalesce(excluded.source_import_id, ledger_account_mappings.source_import_id),
        updated_at = now();

      v_mappings := v_mappings + 1;
    end if;
  end loop;

  update public.draft_edits
     set status = 'published',
         published_at = now(),
         updated_at = now()
   where id = p_draft_id;

  insert into public.audit_log (company_id, actor_id, action, entity_type, entity_id, payload)
  values (
    v_draft.company_id,
    v_actor,
    'edit_publish',
    'draft_edit',
    p_draft_id::text,
    jsonb_build_object(
      'draft_id', p_draft_id,
      'year', v_draft.year,
      'month', v_draft.month,
      'balances_applied', v_balances,
      'mappings_applied', v_mappings
    )
  );

  return jsonb_build_object(
    'draft_id', p_draft_id,
    'status', 'published',
    'balances_applied', v_balances,
    'mappings_applied', v_mappings
  );
end;
$$;

revoke all on function public.publish_draft_edit(uuid) from public;
grant execute on function public.publish_draft_edit(uuid) to authenticated, service_role;

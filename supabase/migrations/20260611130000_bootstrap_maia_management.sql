-- Bootstrap Maia Management: slug canonico maia-management + famiglie Awentia-template.
-- STRICTLY ADDITIVE: idempotente; rinomina slug legacy 'maia' se presente.

update public.companies
set slug = 'maia-management',
    name = coalesce(nullif(trim(name), ''), 'Maia Management'),
    ce_profile = 'awentia'
where slug = 'maia';

insert into public.companies (name, slug, ce_profile)
select 'Maia Management', 'maia-management', 'awentia'
where not exists (
  select 1 from public.companies where slug = 'maia-management'
);

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
where c.slug = 'maia-management'
on conflict (company_id, code) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

update public.companies
set ce_profile = 'awentia'
where slug = 'maia-management'
  and (ce_profile is null or ce_profile <> 'awentia');

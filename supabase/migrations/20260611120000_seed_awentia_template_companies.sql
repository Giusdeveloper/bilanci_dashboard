-- Seed famiglie Awentia-template + ce_profile per altre aziende del gruppo.
-- STRICTLY ADDITIVE: idempotente su slug esistenti.

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
where c.slug in ('maia-management', '2f2t', 'babylon-vines', 'casa-profitto', 'khoraline')
on conflict (company_id, code) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

update public.companies
set ce_profile = 'awentia'
where slug in ('maia-management', '2f2t', 'babylon-vines', 'casa-profitto', 'khoraline')
  and ce_profile is null;

begin;

-- Repair the known Igarreta/ISEMAR consumption viewers without granting
-- company-admin privileges. This is intentionally idempotent.
insert into public.user_permissions (user_id, permission, company_slug)
select u.id, 'consumption_report_viewer', c.slug
from public.users u
cross join public.companies c
where lower(trim(u.email)) in (
  'lcorrea@imasa.com.ar',
  'ggalvarini@imasa.com.ar',
  'vcastilla@imasa.com.ar',
  'mborras@imasa.com.ar',
  'marianelaborras@gmail.com'
)
  and c.slug in ('igarreta', 'isemar')
on conflict (user_id, permission, company_slug) do nothing;

commit;

-- Production verification confirmed Marianela Borrás uses this account.
-- Keep the repair idempotent so fresh/replayed environments do not depend on
-- the obsolete mborras@imasa.com.ar identity from the older migration.

insert into public.user_permissions (user_id, permission, company_slug)
select u.id, 'consumption_report_viewer', c.slug
from public.users u
cross join public.companies c
where lower(trim(u.email)) = 'marianelaborras@gmail.com'
  and c.slug in ('igarreta', 'isemar')
on conflict (user_id, permission, company_slug) do nothing;

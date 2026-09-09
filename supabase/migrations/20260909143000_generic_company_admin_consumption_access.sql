-- Make consumption reporting follow company-admin assignments instead of hardcoding
-- specific companies. Legacy consumption_report_viewer permissions remain supported.

create or replace function public.has_consumption_report_access(
  p_company_slug text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.company_admins ca
      join public.companies c on c.id = ca.company_id
      where ca.user_id = auth.uid()
        and c.slug = nullif(trim(coalesce(p_company_slug, '')), '')
    )
    or exists (
      select 1
      from public.user_permissions up
      where up.user_id = auth.uid()
        and up.permission = 'consumption_report_viewer'
        and up.company_slug = nullif(trim(coalesce(p_company_slug, '')), '')
    );
$$;

create or replace function public.get_admin_access_context()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_global boolean := false;
  v_companies jsonb := '[]'::jsonb;
  v_consumption_report_companies jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_is_global := public.is_admin();

  if v_is_global then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name
    ) order by c.name), '[]'::jsonb)
    into v_companies
    from public.companies c
    where c.slug <> 'global';
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'name', c.name
    ) order by c.name), '[]'::jsonb)
    into v_companies
    from public.company_admins ca
    join public.companies c on c.id = ca.company_id
    where ca.user_id = auth.uid()
      and c.slug <> 'global';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name', c.name
  ) order by c.name), '[]'::jsonb)
  into v_consumption_report_companies
  from public.companies c
  where c.slug <> 'global'
    and public.has_consumption_report_access(c.slug);

  return jsonb_build_object(
    'is_global_admin', v_is_global,
    'is_company_admin', jsonb_array_length(v_companies) > 0,
    'companies', v_companies,
    'can_view_consumption_report', jsonb_array_length(v_consumption_report_companies) > 0,
    'consumption_report_companies', v_consumption_report_companies,
    'can_manage_late_extra_history', public.can_manage_late_extra_history(auth.uid()),
    'can_create_late_admin_extra_order', public.is_late_admin_extra_order_authorized(auth.uid()),
    'can_manage_order_discounts', public.can_manage_order_discounts(auth.uid())
  );
end;
$$;

create or replace function public.get_company_consumption_report(
  p_month_start date,
  p_month_end date
)
returns table (
  order_id uuid,
  delivery_date date,
  person_key text,
  person_name text,
  customer_name text,
  customer_email text,
  user_full_name text,
  user_email text,
  company_slug text,
  company_name text,
  organization text,
  location text,
  delivery_location text,
  requesting_location_code text,
  status text,
  items jsonb,
  total_items integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'not_authenticated';
  end if;

  if p_month_start is null or p_month_end is null or p_month_end < p_month_start
    or p_month_end - p_month_start > 31
  then
    raise exception 'invalid_consumption_report_range';
  end if;

  if auth.role() <> 'service_role'
    and not public.is_admin()
    and not exists (
      select 1
      from public.companies c
      where c.slug <> 'global'
        and public.has_consumption_report_access(c.slug)
    )
  then
    raise exception 'not_authorized';
  end if;

  return query
  with allowed_companies as (
    select c.slug
    from public.companies c
    where c.slug <> 'global'
      and (
        auth.role() = 'service_role'
        or public.is_admin()
        or public.has_consumption_report_access(c.slug)
      )
  )
  select
    o.id,
    o.delivery_date,
    coalesce(o.user_id::text, nullif(lower(trim(o.customer_email)), ''), nullif(lower(trim(o.customer_name)), '')),
    coalesce(nullif(trim(o.customer_name), ''), nullif(trim(u.full_name), ''), nullif(trim(o.customer_email), ''), nullif(trim(u.email), ''), 'Sin nombre'),
    o.customer_name,
    o.customer_email,
    u.full_name,
    u.email,
    o.company_slug,
    o.company_name,
    o.organization,
    o.location,
    o.delivery_location,
    o.requesting_location_code,
    o.status,
    o.items,
    o.total_items
  from public.orders o
  left join public.users u on u.id = o.user_id
  where o.delivery_date between p_month_start and p_month_end
    and o.status in ('pending', 'archived', 'post_report_extra')
    and (
      public.normalize_company_remito_slug(coalesce(o.company_slug, '')) in (select slug from allowed_companies)
      or public.normalize_company_remito_slug(coalesce(o.organization, '')) in (select slug from allowed_companies)
      or public.normalize_company_remito_slug(coalesce(o.company_name, '')) in (select slug from allowed_companies)
      or exists (
        select 1
        from public.order_locations loc
        join public.companies c on c.id = loc.company_id
        join allowed_companies ac on ac.slug = c.slug
        where loc.id = o.order_location_id
           or loc.id = o.delivery_order_location_id
           or public.normalize_order_schedule_location_key(coalesce(o.requesting_location_code, '')) in (
             public.normalize_order_schedule_location_key(loc.code),
             public.normalize_order_schedule_location_key(loc.slug),
             public.normalize_order_schedule_location_key(loc.display_name)
           )
           or public.normalize_order_schedule_location_key(coalesce(o.location, '')) in (
             public.normalize_order_schedule_location_key(loc.code),
             public.normalize_order_schedule_location_key(loc.slug),
             public.normalize_order_schedule_location_key(loc.display_name)
           )
           or public.normalize_order_schedule_location_key(coalesce(o.delivery_location_code, '')) in (
             public.normalize_order_schedule_location_key(loc.code),
             public.normalize_order_schedule_location_key(loc.slug),
             public.normalize_order_schedule_location_key(loc.display_name)
           )
           or public.normalize_order_schedule_location_key(coalesce(o.delivery_location, '')) in (
             public.normalize_order_schedule_location_key(loc.code),
             public.normalize_order_schedule_location_key(loc.slug),
             public.normalize_order_schedule_location_key(loc.display_name)
           )
      )
    )
  order by o.delivery_date, person_name, o.id;
end;
$$;

revoke all on function public.has_consumption_report_access(text) from public;
revoke all on function public.has_consumption_report_access(text) from anon;
grant execute on function public.has_consumption_report_access(text) to authenticated;

revoke all on function public.get_admin_access_context() from public;
revoke all on function public.get_admin_access_context() from anon;
grant execute on function public.get_admin_access_context() to authenticated;

revoke all on function public.get_company_consumption_report(date, date) from public;
revoke all on function public.get_company_consumption_report(date, date) from anon;
grant execute on function public.get_company_consumption_report(date, date) to authenticated;
grant execute on function public.get_company_consumption_report(date, date) to service_role;

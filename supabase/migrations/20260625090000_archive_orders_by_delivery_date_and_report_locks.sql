create index if not exists orders_status_delivery_date_idx
  on public.orders (status, delivery_date);

create or replace function public.archive_orders_bulk(statuses text[])
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'archive_orders_bulk_disabled_use_delivery_date';
  return;
end;
$$;

create or replace function public.archive_orders_bulk_by_delivery_date(
  p_delivery_date date,
  p_statuses text[] default array['pending']::text[]
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'not authenticated';
  end if;

  if auth.role() <> 'service_role' and not is_admin() then
    raise exception 'not authorized';
  end if;

  if p_delivery_date is null then
    raise exception 'delivery_date_required';
  end if;

  return query
  update public.orders
  set status = 'archived',
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
  where delivery_date = p_delivery_date
    and status = any(coalesce(p_statuses, array['pending']::text[]))
  returning id;
end;
$$;

revoke all on function public.archive_orders_bulk_by_delivery_date(date, text[]) from public;
revoke all on function public.archive_orders_bulk_by_delivery_date(date, text[]) from anon;
grant execute on function public.archive_orders_bulk_by_delivery_date(date, text[]) to authenticated;

alter table public.daily_report_runs
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_daily_report_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_report_runs_updated_at on public.daily_report_runs;
create trigger trg_daily_report_runs_updated_at
before update on public.daily_report_runs
for each row execute function public.set_daily_report_runs_updated_at();

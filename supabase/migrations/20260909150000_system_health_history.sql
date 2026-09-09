-- Persist operational incidents so the health panel keeps historical evidence even
-- after the underlying problem has been repaired.

create table if not exists public.system_health_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  component text not null,
  event_type text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  status text not null default 'active' check (status in ('active', 'resolved')),
  title text not null,
  message text,
  error_code text,
  report_date date,
  affected_orders integer,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_health_events_status_detected_idx
  on public.system_health_events (status, detected_at desc);

create index if not exists system_health_events_component_detected_idx
  on public.system_health_events (component, detected_at desc);

alter table public.system_health_events enable row level security;
revoke all on table public.system_health_events from anon;
revoke all on table public.system_health_events from authenticated;
grant select, insert, update on table public.system_health_events to service_role;

create or replace function public.set_system_health_events_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_system_health_events_updated_at on public.system_health_events;
create trigger trg_system_health_events_updated_at
before update on public.system_health_events
for each row execute function public.set_system_health_events_updated_at();

-- Every report/archive transition is preserved independently of the current state.
-- A later successful execution resolves the incident instead of deleting it.
create or replace function public.capture_daily_report_health_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_report_key text;
  v_archive_key text;
  v_error_code text;
begin
  if new.report_type <> 'daily_orders' then
    return new;
  end if;

  v_report_key := 'daily-report:' || new.report_date::text;
  v_archive_key := 'daily-archive:' || new.report_date::text;

  if lower(coalesce(new.status, '')) = 'failed' then
    v_error_code := case
      when coalesce(new.error, '') like '%42883%' then '42883'
      when coalesce(new.error, '') like '%42703%' then '42703'
      else null
    end;

    insert into public.system_health_events (
      event_key, component, event_type, severity, status, title, message,
      error_code, report_date, affected_orders, details, detected_at
    ) values (
      v_report_key,
      'daily_report',
      'daily_report_failed',
      'critical',
      'active',
      'Falló el reporte automático diario',
      nullif(new.error, ''),
      v_error_code,
      new.report_date,
      new.orders_count,
      jsonb_build_object('report_status', new.status),
      coalesce(new.updated_at, new.created_at, now())
    )
    on conflict (event_key) do update set
      status = 'active',
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      error_code = excluded.error_code,
      affected_orders = excluded.affected_orders,
      details = excluded.details,
      resolved_at = null,
      resolution = null;
  elsif lower(coalesce(new.status, '')) in ('sent', 'sent_empty') then
    update public.system_health_events
    set status = 'resolved',
        resolved_at = coalesce(resolved_at, new.sent_at, now()),
        resolution = coalesce(resolution, 'El reporte se procesó correctamente en una ejecución posterior.')
    where event_key = v_report_key
      and status = 'active';
  end if;

  if lower(coalesce(new.archive_status, '')) = 'failed' then
    v_error_code := case
      when coalesce(new.archive_error, '') like '%42883%' then '42883'
      when coalesce(new.archive_error, '') like '%42703%' then '42703'
      else null
    end;

    insert into public.system_health_events (
      event_key, component, event_type, severity, status, title, message,
      error_code, report_date, affected_orders, details, detected_at
    ) values (
      v_archive_key,
      'daily_archive',
      'daily_archive_failed',
      'critical',
      'active',
      'Falló el autoarchivado posterior al reporte',
      nullif(new.archive_error, ''),
      v_error_code,
      new.report_date,
      new.orders_count,
      jsonb_build_object(
        'report_status', new.status,
        'archive_status', new.archive_status,
        'sent_at', new.sent_at
      ),
      coalesce(new.updated_at, now())
    )
    on conflict (event_key) do update set
      status = 'active',
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      error_code = excluded.error_code,
      affected_orders = excluded.affected_orders,
      details = excluded.details,
      resolved_at = null,
      resolution = null;
  elsif lower(coalesce(new.archive_status, '')) = 'archived' then
    update public.system_health_events
    set status = 'resolved',
        resolved_at = coalesce(resolved_at, new.archived_at, now()),
        resolution = coalesce(resolution, 'El autoarchivado se completó correctamente en una ejecución posterior.')
    where event_key = v_archive_key
      and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_daily_report_system_health on public.daily_report_runs;
create trigger trg_daily_report_system_health
after insert or update of status, error, archive_status, archive_error, archived_count, archived_at
on public.daily_report_runs
for each row execute function public.capture_daily_report_health_event();

-- Preserve unresolved historical failures that already exist at migration time.
insert into public.system_health_events (
  event_key, component, event_type, severity, status, title, message,
  error_code, report_date, affected_orders, details, detected_at
)
select
  'daily-report:' || drr.report_date::text,
  'daily_report',
  'daily_report_failed',
  'critical',
  'active',
  'Falló el reporte automático diario',
  nullif(drr.error, ''),
  case
    when coalesce(drr.error, '') like '%42883%' then '42883'
    when coalesce(drr.error, '') like '%42703%' then '42703'
    else null
  end,
  drr.report_date,
  drr.orders_count,
  jsonb_build_object('report_status', drr.status, 'source', 'migration_backfill'),
  coalesce(drr.updated_at, drr.created_at, now())
from public.daily_report_runs drr
where drr.report_type = 'daily_orders'
  and lower(coalesce(drr.status, '')) = 'failed'
on conflict (event_key) do nothing;

insert into public.system_health_events (
  event_key, component, event_type, severity, status, title, message,
  error_code, report_date, affected_orders, details, detected_at
)
select
  'daily-archive:' || drr.report_date::text,
  'daily_archive',
  'daily_archive_failed',
  'critical',
  'active',
  'Falló el autoarchivado posterior al reporte',
  nullif(drr.archive_error, ''),
  case
    when coalesce(drr.archive_error, '') like '%42883%' then '42883'
    when coalesce(drr.archive_error, '') like '%42703%' then '42703'
    else null
  end,
  drr.report_date,
  drr.orders_count,
  jsonb_build_object(
    'report_status', drr.status,
    'archive_status', drr.archive_status,
    'source', 'migration_backfill'
  ),
  coalesce(drr.updated_at, drr.created_at, now())
from public.daily_report_runs drr
where drr.report_type = 'daily_orders'
  and lower(coalesce(drr.archive_status, '')) = 'failed'
on conflict (event_key) do nothing;

-- Incident observed on 2026-09-08. The run was later recovered, so its current
-- daily_report_runs row no longer contains the original error. Keep the evidence.
insert into public.system_health_events (
  event_key, component, event_type, severity, status, title, message,
  error_code, report_date, affected_orders, details, detected_at,
  resolved_at, resolution
)
select
  'daily-archive:2026-09-08:rpc-missing',
  'daily_archive',
  'daily_archive_failed',
  'critical',
  'resolved',
  'Autoarchivado detenido por RPC faltante',
  'function public.archive_orders_after_daily_report(date) does not exist',
  '42883',
  drr.report_date,
  coalesce(drr.archived_count, drr.orders_count, 196),
  jsonb_build_object(
    'source', 'retroactive_incident',
    'sqlstate', '42883',
    'recovered_manually', true
  ),
  coalesce(drr.sent_at + interval '5 minutes', drr.created_at, now()),
  coalesce(drr.archived_at, drr.updated_at, now()),
  'Se restauró archive_orders_after_daily_report(date) y se archivaron los pedidos pendientes de forma controlada.'
from public.daily_report_runs drr
where drr.report_type = 'daily_orders'
  and drr.report_date = date '2026-09-08'
limit 1
on conflict (event_key) do nothing;

-- Preserve the historical pending accumulation recovered administratively on 09/09.
insert into public.system_health_events (
  event_key, component, event_type, severity, status, title, message,
  report_date, affected_orders, details, detected_at, resolved_at, resolution
)
select
  'stale-pending:2026-09-04-2026-09-09:manual-recovery',
  'orders',
  'stale_pending_orders',
  'critical',
  'resolved',
  'Pedidos históricos quedaron pendientes fuera de fecha',
  'Se detectaron pedidos pending de fechas operativas ya cerradas.',
  date '2026-09-09',
  561,
  jsonb_build_object(
    'source', 'retroactive_incident',
    'dates', jsonb_build_array(
      jsonb_build_object('delivery_date', '2026-09-04', 'orders', 146),
      jsonb_build_object('delivery_date', '2026-09-05', 'orders', 18),
      jsonb_build_object('delivery_date', '2026-09-06', 'orders', 11),
      jsonb_build_object('delivery_date', '2026-09-07', 'orders', 177),
      jsonb_build_object('delivery_date', '2026-09-09', 'orders', 209)
    )
  ),
  now(),
  now(),
  'Se archivaron de forma controlada los 561 pedidos históricos; los pedidos de la fecha operativa actual quedaron intactos.'
where (
  select count(*)
  from public.orders o
  where o.status = 'archived'
    and o.delivery_date in (
      date '2026-09-04', date '2026-09-05', date '2026-09-06',
      date '2026-09-07', date '2026-09-09'
    )
) >= 561
on conflict (event_key) do nothing;

create or replace function public.refresh_system_health_events()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_operational_date date := ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 1);
  v_stale_count integer := 0;
  v_stale_items integer := 0;
  v_stale_dates jsonb := '[]'::jsonb;
  v_active_stale_id uuid;
  v_signature text;
  v_label text;
  v_active_rpc_id uuid;
begin
  select count(*), coalesce(sum(greatest(coalesce(o.total_items, 0), 0)), 0)::integer
    into v_stale_count, v_stale_items
  from public.orders o
  where o.status = 'pending'
    and o.delivery_date < v_operational_date;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'delivery_date', x.delivery_date,
      'orders', x.orders_count,
      'items', x.items_count
    ) order by x.delivery_date desc
  ), '[]'::jsonb)
  into v_stale_dates
  from (
    select
      o.delivery_date,
      count(*)::integer as orders_count,
      coalesce(sum(greatest(coalesce(o.total_items, 0), 0)), 0)::integer as items_count
    from public.orders o
    where o.status = 'pending'
      and o.delivery_date < v_operational_date
    group by o.delivery_date
  ) x;

  select e.id
    into v_active_stale_id
  from public.system_health_events e
  where e.event_type = 'stale_pending_orders'
    and e.status = 'active'
  order by e.detected_at desc
  limit 1;

  if v_stale_count > 0 then
    if v_active_stale_id is null then
      insert into public.system_health_events (
        event_key, component, event_type, severity, status, title, message,
        affected_orders, details
      ) values (
        'stale-pending:' || gen_random_uuid()::text,
        'orders',
        'stale_pending_orders',
        'critical',
        'active',
        'Hay pedidos pendientes de fechas operativas ya cerradas',
        format('%s pedidos siguen pending antes de la fecha operativa %s.', v_stale_count, v_operational_date),
        v_stale_count,
        jsonb_build_object(
          'operational_date', v_operational_date,
          'pending_items', v_stale_items,
          'dates', v_stale_dates
        )
      );
    else
      update public.system_health_events
      set affected_orders = v_stale_count,
          message = format('%s pedidos siguen pending antes de la fecha operativa %s.', v_stale_count, v_operational_date),
          details = jsonb_build_object(
            'operational_date', v_operational_date,
            'pending_items', v_stale_items,
            'dates', v_stale_dates
          )
      where id = v_active_stale_id;
    end if;
  elsif v_active_stale_id is not null then
    update public.system_health_events
    set status = 'resolved',
        resolved_at = now(),
        resolution = coalesce(resolution, 'Ya no quedan pedidos pending de fechas operativas anteriores.')
    where id = v_active_stale_id;
  end if;

  for v_signature, v_label in
    select * from (values
      ('archive_orders_after_daily_report(date)', 'RPC de autoarchivado'),
      ('get_daily_report_run_status(date,text)', 'RPC de estado del reporte'),
      ('get_company_consumption_report(date,date)', 'RPC de consumo mensual')
    ) as critical_rpc(signature, label)
  loop
    select e.id
      into v_active_rpc_id
    from public.system_health_events e
    where e.event_type = 'missing_critical_rpc'
      and e.status = 'active'
      and e.details ->> 'signature' = v_signature
    order by e.detected_at desc
    limit 1;

    if to_regprocedure('public.' || v_signature) is null then
      if v_active_rpc_id is null then
        insert into public.system_health_events (
          event_key, component, event_type, severity, status, title, message, details
        ) values (
          'missing-rpc:' || replace(v_signature, '(', '-') || ':' || gen_random_uuid()::text,
          'database',
          'missing_critical_rpc',
          'critical',
          'active',
          v_label || ' no disponible',
          'La función public.' || v_signature || ' no existe en el schema actual.',
          jsonb_build_object('signature', v_signature, 'label', v_label)
        );
      end if;
    elsif v_active_rpc_id is not null then
      update public.system_health_events
      set status = 'resolved',
          resolved_at = now(),
          resolution = coalesce(resolution, 'La RPC volvió a estar disponible.')
      where id = v_active_rpc_id;
    end if;
  end loop;
end;
$$;

create or replace function public.get_system_health_dashboard(
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_operational_date date := ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 1);
  v_stale_count integer := 0;
  v_stale_items integer := 0;
  v_stale_dates jsonb := '[]'::jsonb;
  v_active_count integer := 0;
  v_active_critical_count integer := 0;
  v_recent_incidents jsonb := '[]'::jsonb;
  v_active_incidents jsonb := '[]'::jsonb;
  v_rpc_checks jsonb;
  v_state text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  perform public.refresh_system_health_events();

  select count(*), coalesce(sum(greatest(coalesce(o.total_items, 0), 0)), 0)::integer
    into v_stale_count, v_stale_items
  from public.orders o
  where o.status = 'pending'
    and o.delivery_date < v_operational_date;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'delivery_date', x.delivery_date,
      'orders', x.orders_count,
      'items', x.items_count
    ) order by x.delivery_date desc
  ), '[]'::jsonb)
  into v_stale_dates
  from (
    select
      o.delivery_date,
      count(*)::integer as orders_count,
      coalesce(sum(greatest(coalesce(o.total_items, 0), 0)), 0)::integer as items_count
    from public.orders o
    where o.status = 'pending'
      and o.delivery_date < v_operational_date
    group by o.delivery_date
  ) x;

  select
    count(*)::integer,
    count(*) filter (where e.severity = 'critical')::integer
  into v_active_count, v_active_critical_count
  from public.system_health_events e
  where e.status = 'active';

  select coalesce(jsonb_agg(to_jsonb(x) order by x.detected_at desc), '[]'::jsonb)
  into v_active_incidents
  from (
    select
      e.id, e.event_key, e.component, e.event_type, e.severity, e.status,
      e.title, e.message, e.error_code, e.report_date, e.affected_orders,
      e.details, e.detected_at, e.resolved_at, e.resolution
    from public.system_health_events e
    where e.status = 'active'
    order by e.detected_at desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.detected_at desc), '[]'::jsonb)
  into v_recent_incidents
  from (
    select
      e.id, e.event_key, e.component, e.event_type, e.severity, e.status,
      e.title, e.message, e.error_code, e.report_date, e.affected_orders,
      e.details, e.detected_at, e.resolved_at, e.resolution
    from public.system_health_events e
    where e.detected_at >= now() - make_interval(days => v_days)
       or e.status = 'active'
    order by e.detected_at desc
    limit 30
  ) x;

  v_rpc_checks := jsonb_build_array(
    jsonb_build_object(
      'signature', 'archive_orders_after_daily_report(date)',
      'label', 'Autoarchivado',
      'ok', to_regprocedure('public.archive_orders_after_daily_report(date)') is not null
    ),
    jsonb_build_object(
      'signature', 'get_daily_report_run_status(date,text)',
      'label', 'Estado del reporte',
      'ok', to_regprocedure('public.get_daily_report_run_status(date,text)') is not null
    ),
    jsonb_build_object(
      'signature', 'get_company_consumption_report(date,date)',
      'label', 'Consumo mensual',
      'ok', to_regprocedure('public.get_company_consumption_report(date,date)') is not null
    )
  );

  v_state := case
    when v_active_critical_count > 0 or v_stale_count > 0 then 'critical'
    when v_active_count > 0 then 'warning'
    else 'ok'
  end;

  return jsonb_build_object(
    'state', v_state,
    'checked_at', now(),
    'operational_date', v_operational_date,
    'stale_pending_count', v_stale_count,
    'stale_pending_items', v_stale_items,
    'stale_pending_dates', v_stale_dates,
    'active_incident_count', v_active_count,
    'active_critical_count', v_active_critical_count,
    'critical_rpcs', v_rpc_checks,
    'active_incidents', v_active_incidents,
    'recent_incidents', v_recent_incidents
  );
end;
$$;

revoke all on function public.refresh_system_health_events() from public;
revoke all on function public.refresh_system_health_events() from anon;
revoke all on function public.refresh_system_health_events() from authenticated;
grant execute on function public.refresh_system_health_events() to service_role;

revoke all on function public.get_system_health_dashboard(integer) from public;
revoke all on function public.get_system_health_dashboard(integer) from anon;
grant execute on function public.get_system_health_dashboard(integer) to authenticated;

-- Keep detection running even when nobody has the admin panel open.
do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    begin
      perform cron.unschedule('system-health-hourly');
    exception
      when others then null;
    end;

    perform cron.schedule(
      'system-health-hourly',
      '10 * * * *',
      'select public.refresh_system_health_events();'
    );
  end if;
end;
$$;

-- Seed current health once so the first dashboard load already has a snapshot.
select public.refresh_system_health_events();

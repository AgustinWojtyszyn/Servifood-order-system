-- Reconcile archive incidents when the operational impact was fixed manually or by
-- a later recovery, without rewriting the original daily_report_runs failure.

create or replace function public.reconcile_recovered_daily_archive_health_events()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_resolved integer := 0;
begin
  with recovered as (
    select e.id
    from public.system_health_events e
    join public.daily_report_runs drr
      on drr.report_date = e.report_date
     and drr.report_type = 'daily_orders'
    where e.status = 'active'
      and e.event_type in ('daily_archive_failed', 'daily_archive_overdue')
      and lower(coalesce(drr.status, '')) in ('sent', 'sent_empty')
      and not exists (
        select 1
        from public.orders o
        where o.delivery_date = e.report_date
          and o.status = 'pending'
      )
  )
  update public.system_health_events e
  set status = 'resolved',
      resolved_at = coalesce(e.resolved_at, now()),
      resolution = coalesce(
        e.resolution,
        'El impacto operativo fue recuperado: ya no quedan pedidos pending para esa fecha. Se conserva el fallo original como evidencia histórica.'
      )
  where e.id in (select id from recovered);

  get diagnostics v_resolved = row_count;
  return v_resolved;
end;
$$;

revoke all on function public.reconcile_recovered_daily_archive_health_events() from public;
revoke all on function public.reconcile_recovered_daily_archive_health_events() from anon;
revoke all on function public.reconcile_recovered_daily_archive_health_events() from authenticated;
grant execute on function public.reconcile_recovered_daily_archive_health_events() to service_role;

-- Keep the daily-report trigger from re-opening an already recovered archive incident
-- just because daily_report_runs still preserves archive_status='failed'.
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
  v_pending_count integer := 0;
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
    select count(*)::integer
      into v_pending_count
    from public.orders o
    where o.delivery_date = new.report_date
      and o.status = 'pending';

    v_error_code := case
      when coalesce(new.archive_error, '') like '%42883%' then '42883'
      when coalesce(new.archive_error, '') like '%42703%' then '42703'
      else null
    end;

    insert into public.system_health_events (
      event_key, component, event_type, severity, status, title, message,
      error_code, report_date, affected_orders, details, detected_at,
      resolved_at, resolution
    ) values (
      v_archive_key,
      'daily_archive',
      'daily_archive_failed',
      'critical',
      case when v_pending_count > 0 then 'active' else 'resolved' end,
      'Falló el autoarchivado posterior al reporte',
      nullif(new.archive_error, ''),
      v_error_code,
      new.report_date,
      new.orders_count,
      jsonb_build_object(
        'report_status', new.status,
        'archive_status', new.archive_status,
        'sent_at', new.sent_at,
        'pending_orders_now', v_pending_count
      ),
      coalesce(new.updated_at, now()),
      case when v_pending_count = 0 then now() else null end,
      case
        when v_pending_count = 0 then 'El fallo se conserva como evidencia, pero ya no quedan pedidos pending para esa fecha.'
        else null
      end
    )
    on conflict (event_key) do update set
      status = excluded.status,
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      error_code = excluded.error_code,
      affected_orders = excluded.affected_orders,
      details = excluded.details,
      resolved_at = excluded.resolved_at,
      resolution = excluded.resolution;
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

-- Avoid duplicate incidents for one archive failure. The overdue event is useful
-- when the archive never reports a terminal state; an explicit failed state is the
-- canonical incident and supersedes the overdue warning.
create or replace function public.refresh_overdue_daily_archive_health_events()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run record;
  v_active_id uuid;
begin
  for v_run in
    select
      drr.report_date,
      drr.status,
      drr.sent_at,
      drr.archive_status,
      drr.archive_error,
      drr.orders_count,
      drr.archived_at
    from public.daily_report_runs drr
    where drr.report_type = 'daily_orders'
      and lower(coalesce(drr.status, '')) in ('sent', 'sent_empty')
      and drr.sent_at is not null
      and drr.sent_at <= now() - interval '10 minutes'
      and drr.report_date >= ((now() at time zone 'America/Argentina/Buenos_Aires')::date - 30)
  loop
    select e.id
      into v_active_id
    from public.system_health_events e
    where e.event_type = 'daily_archive_overdue'
      and e.report_date = v_run.report_date
      and e.status = 'active'
    order by e.detected_at desc
    limit 1;

    if lower(coalesce(v_run.archive_status, '')) = 'archived' then
      if v_active_id is not null then
        update public.system_health_events
        set status = 'resolved',
            resolved_at = coalesce(v_run.archived_at, now()),
            resolution = coalesce(resolution, 'El autoarchivado quedó completado después de la alerta de demora.')
        where id = v_active_id;
      end if;
    elsif lower(coalesce(v_run.archive_status, '')) = 'failed' then
      if v_active_id is not null then
        update public.system_health_events
        set status = 'resolved',
            resolved_at = coalesce(resolved_at, now()),
            resolution = coalesce(resolution, 'La demora terminó en un fallo explícito de autoarchivado; ese incidente se conserva como registro principal.')
        where id = v_active_id;
      end if;
    else
      if v_active_id is null then
        insert into public.system_health_events (
          event_key, component, event_type, severity, status, title, message,
          error_code, report_date, affected_orders, details, detected_at
        ) values (
          'daily-archive-overdue:' || v_run.report_date::text,
          'daily_archive',
          'daily_archive_overdue',
          'critical',
          'active',
          'Reporte enviado pero autoarchivado sin completar',
          coalesce(
            nullif(v_run.archive_error, ''),
            'Pasaron más de 10 minutos desde el envío del reporte y el autoarchivado no figura completado.'
          ),
          case
            when coalesce(v_run.archive_error, '') like '%42883%' then '42883'
            when coalesce(v_run.archive_error, '') like '%42703%' then '42703'
            else null
          end,
          v_run.report_date,
          v_run.orders_count,
          jsonb_build_object(
            'report_status', v_run.status,
            'archive_status', v_run.archive_status,
            'sent_at', v_run.sent_at,
            'expected_archive_after', v_run.sent_at + interval '10 minutes'
          ),
          v_run.sent_at + interval '10 minutes'
        )
        on conflict (event_key) do update set
          status = 'active',
          message = excluded.message,
          error_code = excluded.error_code,
          affected_orders = excluded.affected_orders,
          details = excluded.details,
          resolved_at = null,
          resolution = null;
      else
        update public.system_health_events
        set message = coalesce(
              nullif(v_run.archive_error, ''),
              'Pasaron más de 10 minutos desde el envío del reporte y el autoarchivado no figura completado.'
            ),
            error_code = case
              when coalesce(v_run.archive_error, '') like '%42883%' then '42883'
              when coalesce(v_run.archive_error, '') like '%42703%' then '42703'
              else error_code
            end,
            affected_orders = v_run.orders_count,
            details = jsonb_build_object(
              'report_status', v_run.status,
              'archive_status', v_run.archive_status,
              'sent_at', v_run.sent_at,
              'expected_archive_after', v_run.sent_at + interval '10 minutes'
            )
        where id = v_active_id;
      end if;
    end if;
  end loop;

  perform public.reconcile_recovered_daily_archive_health_events();
end;
$$;

revoke all on function public.refresh_overdue_daily_archive_health_events() from public;
revoke all on function public.refresh_overdue_daily_archive_health_events() from anon;
revoke all on function public.refresh_overdue_daily_archive_health_events() from authenticated;
grant execute on function public.refresh_overdue_daily_archive_health_events() to service_role;

-- Reconcile the historical incidents immediately when this migration is applied.
select public.refresh_overdue_daily_archive_health_events();
select public.reconcile_recovered_daily_archive_health_events();

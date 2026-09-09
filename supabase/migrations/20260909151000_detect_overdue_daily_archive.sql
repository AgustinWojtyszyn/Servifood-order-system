-- Detect the failure mode where the report was sent but the archive cron/function
-- never completed or never recorded archive_status=archived.

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

    if lower(coalesce(v_run.archive_status, '')) <> 'archived' then
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
    elsif v_active_id is not null then
      update public.system_health_events
      set status = 'resolved',
          resolved_at = coalesce(v_run.archived_at, now()),
          resolution = coalesce(resolution, 'El autoarchivado quedó completado después de la alerta de demora.')
      where id = v_active_id;
    end if;
  end loop;

  -- Resolve an active overdue incident even if its report is now outside the
  -- 30-day scan window or was updated between iterations.
  update public.system_health_events e
  set status = 'resolved',
      resolved_at = coalesce(drr.archived_at, now()),
      resolution = coalesce(e.resolution, 'El autoarchivado quedó completado después de la alerta de demora.')
  from public.daily_report_runs drr
  where e.event_type = 'daily_archive_overdue'
    and e.status = 'active'
    and e.report_date = drr.report_date
    and drr.report_type = 'daily_orders'
    and lower(coalesce(drr.archive_status, '')) = 'archived';
end;
$$;

revoke all on function public.refresh_overdue_daily_archive_health_events() from public;
revoke all on function public.refresh_overdue_daily_archive_health_events() from anon;
revoke all on function public.refresh_overdue_daily_archive_health_events() from authenticated;
grant execute on function public.refresh_overdue_daily_archive_health_events() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    begin
      perform cron.unschedule('system-health-autoarchive-watch');
    exception
      when others then null;
    end;

    perform cron.schedule(
      'system-health-autoarchive-watch',
      '*/10 * * * *',
      'select public.refresh_overdue_daily_archive_health_events();'
    );
  end if;
end;
$$;

select public.refresh_overdue_daily_archive_health_events();

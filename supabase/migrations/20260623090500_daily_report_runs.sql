create table if not exists public.daily_report_runs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  report_type text not null default 'daily_orders',
  status text not null,
  orders_count integer,
  recipients text[],
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_report_runs_report_date_type_key'
      and conrelid = 'public.daily_report_runs'::regclass
  ) then
    alter table public.daily_report_runs
      add constraint daily_report_runs_report_date_type_key
      unique (report_date, report_type);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_report_runs_status_check'
      and conrelid = 'public.daily_report_runs'::regclass
  ) then
    alter table public.daily_report_runs
      add constraint daily_report_runs_status_check
      check (status in ('running', 'sent', 'sent_empty', 'failed'));
  end if;
end $$;

alter table public.daily_report_runs enable row level security;

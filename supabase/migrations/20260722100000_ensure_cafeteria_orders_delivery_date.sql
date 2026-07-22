alter table public.cafeteria_orders
  add column if not exists delivery_date date;

update public.cafeteria_orders
set delivery_date = ((created_at at time zone 'America/Argentina/Buenos_Aires')::date + 1)
where delivery_date is null;

create index if not exists cafeteria_orders_delivery_status_idx
  on public.cafeteria_orders (delivery_date, status);

create index if not exists cafeteria_orders_user_delivery_status_idx
  on public.cafeteria_orders (user_id, delivery_date, status);

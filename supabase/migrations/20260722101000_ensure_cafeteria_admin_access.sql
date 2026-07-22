grant execute on function public.is_admin() to authenticated;

alter table public.cafeteria_orders enable row level security;

drop policy if exists cafeteria_admin_only on public.cafeteria_orders;
create policy cafeteria_admin_only on public.cafeteria_orders
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

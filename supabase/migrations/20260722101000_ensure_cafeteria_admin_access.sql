grant execute on function public.is_admin() to authenticated;

grant select, insert, update, delete on public.cafeteria_orders to authenticated;

alter table public.cafeteria_orders enable row level security;

drop policy if exists cafeteria_admin_only on public.cafeteria_orders;
drop policy if exists cafeteria_select_admin_or_owner on public.cafeteria_orders;
drop policy if exists cafeteria_insert_admin_or_owner on public.cafeteria_orders;
drop policy if exists cafeteria_update_admin_or_owner on public.cafeteria_orders;
drop policy if exists cafeteria_delete_admin_or_owner on public.cafeteria_orders;

create policy cafeteria_select_admin_or_owner on public.cafeteria_orders
for select to authenticated
using (
  public.is_admin()
  or auth.uid() = user_id
  or lower(coalesce(admin_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy cafeteria_insert_admin_or_owner on public.cafeteria_orders
for insert to authenticated
with check (
  public.is_admin()
  or auth.uid() = user_id
  or lower(coalesce(admin_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy cafeteria_update_admin_or_owner on public.cafeteria_orders
for update to authenticated
using (
  public.is_admin()
  or auth.uid() = user_id
  or lower(coalesce(admin_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_admin()
  or auth.uid() = user_id
  or lower(coalesce(admin_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy cafeteria_delete_admin_or_owner on public.cafeteria_orders
for delete to authenticated
using (
  public.is_admin()
  or auth.uid() = user_id
  or lower(coalesce(admin_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Restore the server-side 15-minute cancellation window for user-owned pending orders.
-- The frontend already enforces this rule for UX, but the database must remain the
-- final authority so direct RPC calls cannot bypass the business rule.

begin;

drop function if exists public.cancel_own_pending_order(uuid);

create or replace function public.cancel_own_pending_order(order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if order_id is null then
    raise exception 'order_required';
  end if;

  select *
  into v_order
  from public.orders
  where id = order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.user_id is distinct from v_uid then
    raise exception 'not_authorized';
  end if;

  if lower(coalesce(v_order.status, '')) <> 'pending' then
    raise exception 'order_not_pending';
  end if;

  if v_order.created_at < now() - interval '15 minutes' then
    raise exception 'order_cancel_window_expired';
  end if;

  delete from public.orders
  where id = order_id
    and user_id = v_uid
    and lower(coalesce(status, '')) = 'pending'
  returning *
  into v_order;

  if not found then
    raise exception 'order_not_found';
  end if;

  return v_order;
end;
$$;

revoke all on function public.cancel_own_pending_order(uuid) from public;
revoke all on function public.cancel_own_pending_order(uuid) from anon;
grant execute on function public.cancel_own_pending_order(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

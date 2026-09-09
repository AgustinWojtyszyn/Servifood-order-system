-- Remove `cancelled` as a persisted operational order state.
-- Cancellation remains a business action, but the order row is deleted while audit
-- history and discount snapshots remain available.

begin;

-- Preserve discount history even when the related order is physically removed.
alter table public.order_item_discounts
  drop constraint if exists order_item_discounts_order_id_fkey;

alter table public.order_item_discounts
  alter column order_id drop not null;

alter table public.order_item_discounts
  add constraint order_item_discounts_order_id_fkey
  foreign key (order_id)
  references public.orders(id)
  on delete set null;

-- Remove legacy cancelled rows after making discount history deletion-safe.
delete from public.orders
where status = 'cancelled';

-- Prevent any future persisted order from entering the cancelled state.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint if exists %I', v_constraint.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending',
    'archived',
    'preparing',
    'ready',
    'completed',
    'delivered',
    'processing',
    'post_report_extra'
  ));

-- Admin cancellation now hard-deletes the order but keeps a complete audit snapshot.
create or replace function public.admin_cancel_order_with_reason(
  p_order_id uuid,
  p_reason text,
  p_request_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := auth.uid();
  v_admin public.users%rowtype;
  v_old public.orders%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
begin
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if p_order_id is null then
    raise exception 'order_required';
  end if;

  if v_reason is null then
    raise exception 'reason_required';
  end if;

  select *
  into v_admin
  from public.users
  where id = v_admin_id;

  select *
  into v_old
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if to_regclass('public.audit_logs') is not null then
    insert into public.audit_logs (
      action,
      details,
      actor_id,
      actor_email,
      actor_name,
      target_id,
      target_email,
      target_name,
      metadata,
      request_id,
      created_at
    )
    values (
      'admin_order_cancelled',
      'Pedido dado de baja por administrador; la fila operativa fue eliminada',
      v_admin_id,
      v_admin.email,
      coalesce(nullif(trim(v_admin.full_name), ''), v_admin.email),
      v_old.id,
      v_old.customer_email,
      v_old.customer_name,
      jsonb_build_object(
        'reason', v_reason,
        'previous', to_jsonb(v_old),
        'new', jsonb_build_object('deleted', true),
        'persisted_status', null,
        'responsible', jsonb_build_object(
          'id', v_admin_id,
          'email', v_admin.email,
          'name', coalesce(nullif(trim(v_admin.full_name), ''), v_admin.email)
        )
      ),
      v_request_id,
      now()
    );
  end if;

  delete from public.orders
  where id = p_order_id;

  return v_old;
end;
$$;

revoke all on function public.admin_cancel_order_with_reason(uuid, text, text) from public;
revoke all on function public.admin_cancel_order_with_reason(uuid, text, text) from anon;
grant execute on function public.admin_cancel_order_with_reason(uuid, text, text) to authenticated;

-- If a discount removes the last unit of an active order, preserve the discount and
-- audit snapshot, then delete the empty operational row instead of persisting cancelled.
create or replace function public.create_order_item_discount(p_payload jsonb)
returns setof public.order_item_discounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.users%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_delivery_date date;
  v_item_index integer;
  v_quantity integer;
  v_reason text;
  v_request_id text;
  v_target_item jsonb;
  v_available integer;
  v_new_quantity integer;
  v_new_items jsonb;
  v_new_total_items integer;
  v_new_custom_responses jsonb;
  v_before jsonb;
  v_after jsonb;
  v_discount public.order_item_discounts%rowtype;
  v_delete_empty_order boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.can_manage_order_discounts(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select * into v_actor
  from public.users
  where id = auth.uid();

  if v_actor.id is null then
    raise exception 'actor_not_found';
  end if;

  v_order_id := nullif(trim(coalesce(p_payload->>'order_id', '')), '')::uuid;
  v_delivery_date := nullif(trim(coalesce(p_payload->>'delivery_date', '')), '')::date;
  v_item_index := nullif(trim(coalesce(p_payload->>'item_index', '')), '')::integer;
  v_quantity := nullif(trim(coalesce(p_payload->>'quantity', '')), '')::integer;
  v_reason := nullif(trim(coalesce(p_payload->>'reason', '')), '');
  v_request_id := nullif(trim(coalesce(p_payload->>'request_id', '')), '');

  if v_request_id is null then raise exception 'request_id_required'; end if;

  select * into v_discount
  from public.order_item_discounts
  where request_id = v_request_id;

  if found then
    return next v_discount;
    return;
  end if;

  if v_order_id is null then raise exception 'order_id_required'; end if;
  if v_delivery_date is null then raise exception 'delivery_date_required'; end if;
  if v_item_index is null or v_item_index < 0 then raise exception 'item_index_invalid'; end if;
  if v_quantity is null or v_quantity <= 0 then raise exception 'quantity_invalid'; end if;
  if v_reason is null then raise exception 'reason_required'; end if;

  select * into v_order
  from public.orders
  where id = v_order_id
    and delivery_date = v_delivery_date
    and status in ('pending', 'archived', 'post_report_extra')
  for update;

  if v_order.id is null then
    raise exception 'order_not_found_for_operational_date';
  end if;

  select elem into v_target_item
  from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) with ordinality as item(elem, ord)
  where ord = v_item_index + 1
    and jsonb_typeof(elem) = 'object';

  if v_target_item is null then raise exception 'item_not_found'; end if;

  v_available := case
    when v_target_item ? 'quantity'
      then coalesce(public.order_discount_jsonb_positive_int(v_target_item->'quantity'), 0)
    else 1
  end;

  if v_quantity > v_available then raise exception 'quantity_exceeds_available'; end if;

  v_new_quantity := v_available - v_quantity;
  v_new_total_items := greatest(coalesce(v_order.total_items, 0) - v_quantity, 0);
  v_before := to_jsonb(v_order);

  select coalesce(jsonb_agg(next_item order by ord), '[]'::jsonb)
  into v_new_items
  from (
    select ord,
      case
        when ord = v_item_index + 1 and v_new_quantity > 0
          then jsonb_set(elem, '{quantity}', to_jsonb(v_new_quantity), true)
        when ord = v_item_index + 1 and v_new_quantity = 0
          then null
        else elem
      end as next_item
    from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) with ordinality as item(elem, ord)
  ) rebuilt
  where next_item is not null;

  v_new_custom_responses := public.order_discount_adjust_custom_responses(
    coalesce(v_order.custom_responses, '[]'::jsonb),
    v_target_item,
    v_item_index,
    v_quantity,
    v_new_quantity,
    v_new_total_items
  );

  v_delete_empty_order := v_new_total_items = 0
    and v_order.status in ('pending', 'post_report_extra');

  if v_new_total_items = 0 then
    v_new_custom_responses := '[]'::jsonb;
  end if;

  if v_delete_empty_order then
    v_after := v_before || jsonb_build_object(
      'items', v_new_items,
      'custom_responses', v_new_custom_responses,
      'total_items', 0,
      'status', 'deleted',
      'deleted_after_discount', true
    );
  else
    update public.orders
    set items = v_new_items,
        custom_responses = v_new_custom_responses,
        total_items = v_new_total_items,
        updated_at = now()
    where id = v_order.id
    returning * into v_order;

    v_after := to_jsonb(v_order);
  end if;

  insert into public.order_item_discounts (
    order_id, delivery_date, order_origin, company_slug, company_name, location,
    service, item_index, item_id, item_name, quantity, reason, created_by,
    created_by_email, created_by_name, order_snapshot_before, order_snapshot_after,
    request_id
  ) values (
    v_order.id,
    v_order.delivery_date,
    coalesce(nullif(trim(v_order.order_origin), ''), 'user'),
    v_order.company_slug,
    v_order.company_name,
    v_order.location,
    v_order.service,
    v_item_index,
    coalesce(nullif(trim(coalesce(p_payload->>'item_id', '')), ''), nullif(trim(coalesce(v_target_item->>'id', '')), '')),
    coalesce(nullif(trim(coalesce(p_payload->>'item_name', '')), ''), nullif(trim(coalesce(v_target_item->>'name', '')), ''), 'Ítem sin nombre'),
    v_quantity,
    v_reason,
    auth.uid(),
    v_actor.email,
    coalesce(nullif(trim(v_actor.full_name), ''), v_actor.email),
    v_before,
    v_after,
    v_request_id
  ) returning * into v_discount;

  insert into public.audit_logs (
    action, details, actor_id, actor_email, actor_name, target_id, target_email,
    target_name, metadata, request_id, created_at
  ) values (
    'order_item_discount_created',
    case
      when v_delete_empty_order then 'Descuento registrado; el pedido quedó sin ítems y fue dado de baja'
      else 'Descuento de ítem de pedido registrado por administrador'
    end,
    auth.uid(),
    v_actor.email,
    coalesce(nullif(trim(v_actor.full_name), ''), v_actor.email),
    v_order.user_id,
    v_order.customer_email,
    v_order.customer_name,
    jsonb_build_object(
      'discount_id', v_discount.id,
      'order_id', v_order.id,
      'delivery_date', v_order.delivery_date,
      'order_origin', coalesce(nullif(trim(v_order.order_origin), ''), 'user'),
      'company_slug', v_order.company_slug,
      'company_name', v_order.company_name,
      'location', v_order.location,
      'service', v_order.service,
      'item_index', v_item_index,
      'item_id', v_discount.item_id,
      'item_name', v_discount.item_name,
      'quantity', v_quantity,
      'available_before', v_available,
      'remaining_after', v_new_quantity,
      'status_before', v_before->>'status',
      'status_after', case when v_delete_empty_order then 'deleted' else v_order.status end,
      'deleted_after_discount', v_delete_empty_order,
      'reason', v_reason,
      'snapshot_before', v_before,
      'snapshot_after', v_after
    ),
    v_request_id,
    now()
  );

  if v_delete_empty_order then
    delete from public.orders where id = v_order.id;
    select * into v_discount
    from public.order_item_discounts
    where id = v_discount.id;
  end if;

  return next v_discount;
end;
$$;

revoke all on function public.create_order_item_discount(jsonb) from public;
revoke all on function public.create_order_item_discount(jsonb) from anon;
grant execute on function public.create_order_item_discount(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
